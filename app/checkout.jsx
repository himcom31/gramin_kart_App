// app/checkout.jsx
// ─────────────────────────────────────────────────────────────────────────────
// RAZORPAY MODE — toggle ONE line to switch between Expo Go and Dev Build
//
//   EXPO GO  (current) → uses WebView + checkout.js  (no native module needed)
//   DEV BUILD          → uses react-native-razorpay  (native SDK, best UX)
//
// How to switch when building the app:
//   1. Run:  npm install react-native-razorpay && npx expo run:android (or ios)
//   2. In this file, change this line:
//        const RAZORPAY_MODE = 'webview';   ← current (Expo Go)
//      to:
//        const RAZORPAY_MODE = 'native';    ← dev build
//   3. That's it. No other changes needed anywhere.
// ─────────────────────────────────────────────────────────────────────────────

// ✅ EXPO GO  → keep as 'webview'
// ✅ DEV BUILD → change to 'native'
const RAZORPAY_MODE = 'native';

// ─── Imports ──────────────────────────────────────────────────────────────────

import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview'; // used in EXPO GO mode only
import { EventEmitter } from '../src/api/EventEmitter';
import { Storage } from '../src/api/storage';

// ── DEV BUILD ONLY ────────────────────────────────────────────────────────────
// When RAZORPAY_MODE === 'native', this import is used.
// In Expo Go mode it is never called so no crash occurs even if the package
// is not installed yet.
//
// TO ACTIVATE: uncomment the line below when building with native SDK
// ─────────────────────────────────────────────────────────────────────────────

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const getToken = () => Storage.getItem('userToken');
const authHdr = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
});

// ─── API helpers ──────────────────────────────────────────────────────────────
const api = {
  cart:          ()    => fetch(`${API_URL}/api/cart`,              { headers: authHdr() }).then(r => r.json()),
  addresses:     ()    => fetch(`${API_URL}/api/address`,           { headers: authHdr() }).then(r => r.json()),
  gateways:      ()    => fetch(`${API_URL}/api/payment/active`).then(r => r.json()),
  taxRate:       ()    => fetch(`${API_URL}/api/taxes/active-rate`).then(r => r.json()),
  deliveryRate:  qty   => fetch(`${API_URL}/api/delivery/charge-for-qty?qty=${qty}`).then(r => r.json()),
  coupon:        body  => fetch(`${API_URL}/api/coupon/validate`,   { method: 'POST', headers: authHdr(), body: JSON.stringify(body) }).then(r => r.json()),
  placeOrder:    body  => fetch(`${API_URL}/api/orders/place`,      { method: 'POST', headers: authHdr(), body: JSON.stringify(body) }).then(r => r.json()),
  razorpayInit:  body  => fetch(`${API_URL}/api/payment/process`,   { method: 'POST', headers: authHdr(), body: JSON.stringify(body) }).then(r => r.json()),
  razorpayVerify:body  => fetch(`${API_URL}/api/payment/verify`,    { method: 'POST', headers: authHdr(), body: JSON.stringify(body) }).then(r => r.json()),
};

// ─────────────────────────────────────────────────────────────────────────────
// RAZORPAY WEBVIEW MODE (Expo Go)
// Builds a self-contained HTML page that loads Razorpay checkout.js inside a
// WebView modal. On success/cancel it posts a JSON message back to RN.
// ─────────────────────────────────────────────────────────────────────────────
const buildRazorpayHtml = ({ key, amount, order_id, customerName, contact }) => `
<!DOCTYPE html><html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,sans-serif;background:#f4f6f4;
         display:flex;align-items:center;justify-content:center;
         min-height:100vh;padding:20px}
    .card{background:#fff;border-radius:16px;padding:32px 24px;
          width:100%;max-width:400px;
          box-shadow:0 4px 24px rgba(0,0,0,.10);text-align:center}
    .icon{font-size:32px;margin-bottom:12px}
    h2{font-size:18px;color:#1a2332;margin-bottom:6px}
    p{font-size:13px;color:#6b7280;margin-bottom:24px}
    .amount{font-size:26px;font-weight:800;color:#1a2332;margin-bottom:24px}
    .btn{width:100%;padding:14px;background:#16a34a;color:#fff;
         border:none;border-radius:12px;font-size:15px;font-weight:700;
         cursor:pointer;margin-bottom:10px;transition:opacity .15s}
    .btn:disabled{opacity:.6}
    .cancel{background:none;color:#9ca3af;
            border:1.5px solid #e5e7eb;font-weight:600}
    .status{margin-top:14px;font-size:13px;color:#6b7280;min-height:20px}
    .error{color:#ef4444}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🛒</div>
    <h2>Gramin Kart</h2>
    <p>Secure payment via Razorpay</p>
    <div class="amount">₹${(amount / 100).toFixed(2)}</div>
    <button class="btn" id="payBtn" onclick="startPayment()">Pay Now</button>
    <button class="btn cancel" onclick="cancel()">Cancel</button>
    <div class="status" id="status"></div>
  </div>

  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <script>
    function post(obj){ window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(obj)); }
    function cancel(){ post({type:'CANCELLED'}); }

    function startPayment(){
      var btn = document.getElementById('payBtn');
      btn.disabled = true;
      document.getElementById('status').innerText = 'Opening Razorpay…';

      var rzp = new Razorpay({
        key:         '${key}',
        amount:      ${amount},
        currency:    'INR',
        order_id:    '${order_id}',
        name:        'Gramin Kart',
        description: 'Order Payment',
        prefill:     { name:'${customerName}', contact:'${contact}' },
        theme:       { color:'#16a34a' },
        handler: function(r){
          post({ type:'SUCCESS',
            razorpay_order_id:   r.razorpay_order_id,
            razorpay_payment_id: r.razorpay_payment_id,
            razorpay_signature:  r.razorpay_signature });
        },
        modal:{ ondismiss: function(){ cancel(); } }
      });

      rzp.on('payment.failed', function(r){
        document.getElementById('status').innerHTML =
          '<span class="error">Payment failed: ' + (r.error.description||'Unknown error') + '</span>';
        btn.disabled = false;
        post({ type:'FAILED', description: r.error.description });
      });

      rzp.open();
    }

    window.onload = startPayment;
  </script>
</body></html>
`;

// ─────────────────────────────────────────────────────────────────────────────
// SHARED: verify + place order after Razorpay payment succeeds
// Called from BOTH webview mode and native mode
// ─────────────────────────────────────────────────────────────────────────────
const verifyAndPlace = async ({
  razorpay_order_id, razorpay_payment_id, razorpay_signature,
  selectedAddressId, note, couponApplied, couponDiscount, shippingCharge, tax,
  total, paymentMethod,
  setError, setPlacing, setOrderSuccess,
}) => {
  const verify = await api.razorpayVerify({
    razorpay_order_id, razorpay_payment_id, razorpay_signature,
  });
  if (!verify.success) {
    setError('Payment verification failed. Please contact support.');
    setPlacing(false); return;
  }
  const orderRes = await api.placeOrder({
    addressId: selectedAddressId,
    paymentMethod,
    note,
    couponCode:    couponApplied?.couponCode || null,
    couponDiscount, shippingCharge, tax,
    razorpayOrderId:   razorpay_order_id,
    razorpayPaymentId: razorpay_payment_id,
  });
  if (orderRes.success) {
    EventEmitter.emit('cart-updated', { items: [] });
    setOrderSuccess({ ...orderRes.order, total, paymentMethod });
  } else {
    setError(orderRes.message || 'Order placement failed');
  }
  setPlacing(false);
};

// ─── UI helpers ───────────────────────────────────────────────────────────────
const Badge = ({ children, color = '#1f2937' }) => (
  <View style={[s.badge, { backgroundColor: color }]}>
    <Text style={s.badgeText}>{children}</Text>
  </View>
);

const SectionHeader = ({ icon, title, action }) => (
  <View style={s.sectionHeader}>
    <View style={s.sectionHeaderLeft}>
      <Text style={s.sectionIcon}>{icon}</Text>
      <Text style={s.sectionTitle}>{title}</Text>
    </View>
    {action}
  </View>
);

const PayBtn = ({ active, onPress, icon, label }) => (
  <TouchableOpacity onPress={onPress} style={[s.payBtn, active && s.payBtnActive]} activeOpacity={0.8}>
    <View style={[s.payRadio, active && s.payRadioActive]}>
      {active && <View style={s.payRadioDot} />}
    </View>
    <Text style={s.payIcon}>{icon}</Text>
    <Text style={[s.payLabel, active && s.payLabelActive]}>{label}</Text>
  </TouchableOpacity>
);

const Skeleton = () => (
  <View style={s.skeletonWrap}>
    {[100, 80, 130].map((h, i) => <View key={i} style={[s.skeletonBlock, { height: h }]} />)}
  </View>
);

// ─── Address Modal ────────────────────────────────────────────────────────────
function AddressModal({ visible, addresses, selectedId, onSelect, onClose }) {
  const insets = useSafeAreaInsets();
  const label  = a => [a.house, a.road, a.landmark, a.city, a.state, a.pincode].filter(Boolean).join(', ');
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={[s.modalSheet, { paddingBottom: insets.bottom + 16 }]}
              onStartShouldSetResponder={() => true}>
          <View style={s.modalHandle} />
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Select Address</Text>
            <TouchableOpacity onPress={onClose} style={s.modalCloseBtn}>
              <Text style={s.modalCloseX}>✕</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={addresses}
            keyExtractor={a => String(a.id)}
            contentContainerStyle={{ padding: 16, gap: 10 }}
            renderItem={({ item: a }) => {
              const sel = a.id === selectedId;
              return (
                <TouchableOpacity onPress={() => { onSelect(a.id); onClose(); }}
                  style={[s.addrCard, sel && s.addrCardSelected]} activeOpacity={0.85}>
                  <View style={s.addrCardRow}>
                    <Text style={s.addrName}>{a.name}</Text>
                    <Badge>{a.type?.toUpperCase() || 'HOME'}</Badge>
                    {a.isDefault && <Badge color="#16a34a">DEFAULT</Badge>}
                  </View>
                  <Text style={s.addrPhone}>{a.phone}</Text>
                  <Text style={s.addrFull}>{label(a)}</Text>
                  {sel && <Text style={s.addrSelLabel}>✓ Selected</Text>}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Razorpay WebView Modal (EXPO GO mode only) ───────────────────────────────
function RazorpayWebViewModal({ visible, html, onMessage, onClose }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f4f6f4' }}>
        {/* Header */}
        <View style={s.rzpHeader}>
          <TouchableOpacity onPress={onClose} style={s.rzpCloseBtn}>
            <Text style={s.rzpCloseX}>✕</Text>
          </TouchableOpacity>
          <Text style={s.rzpHeaderTitle}>Razorpay Payment</Text>
          <View style={{ width: 36 }} />
        </View>
        {/* WebView */}
        <WebView
          style={{ flex: 1 }}
          source={{ html }}
          onMessage={onMessage}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          renderLoading={() => (
            <View style={s.rzpLoading}>
              <ActivityIndicator size="large" color="#16a34a" />
              <Text style={s.rzpLoadingTxt}>Loading payment…</Text>
            </View>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}

// ─── Order Success ────────────────────────────────────────────────────────────
function OrderSuccess({ order, onDone }) {
  return (
    <SafeAreaView style={s.successBg}>
      <StatusBar barStyle="dark-content" backgroundColor="#f0fdf4" />
      <View style={s.successCard}>
        <View style={s.successIcon}><Text style={{ fontSize: 42 }}>✅</Text></View>
        <Text style={s.successTitle}>Order Placed! 🎉</Text>
        <Text style={s.successSub}>Your order has been confirmed.</Text>
        <Text style={s.successOrderNo}>#{order?.orderNumber || 'Processing…'}</Text>
        <View style={s.successSummary}>
          <View style={s.successRow}>
            <Text style={s.successRowLabel}>Total Paid</Text>
            <Text style={s.successRowValue}>₹{Number(order?.total ?? 0).toFixed(2)}</Text>
          </View>
          <View style={s.successRow}>
            <Text style={s.successRowLabel}>Payment</Text>
            <Text style={s.successRowValue2}>{order?.paymentMethod}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={onDone} style={s.successBtn} activeOpacity={0.88}>
          <Text style={s.successBtnTxt}>Go to My Orders</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Price Summary ────────────────────────────────────────────────────────────
function SummaryRows({ subtotal, couponDiscount, taxableAmount, shippingCharge, deliveryLoading, taxRate, taxList, tax, total }) {
  const Row = ({ label, value, valueColor }) => (
    <View style={s.sumRow}>
      <Text style={s.sumLabel}>{label}</Text>
      <Text style={[s.sumValue, valueColor && { color: valueColor }]}>{value}</Text>
    </View>
  );
  return (
    <View>
      <Row label="Subtotal" value={`₹${subtotal.toFixed(2)}`} />
      {couponDiscount > 0 && <>
        <Row label="Coupon Discount"  value={`-₹${couponDiscount.toFixed(2)}`} valueColor="#ef4444" />
        <Row label="After Discount"   value={`₹${taxableAmount.toFixed(2)}`} />
      </>}
      <Row
        label="🚚 Shipping"
        value={deliveryLoading ? '…' : shippingCharge === 0 ? 'Free' : `₹${shippingCharge.toFixed(2)}`}
        valueColor={shippingCharge === 0 && !deliveryLoading ? '#16a34a' : undefined}
      />
      {taxRate === 0
        ? <Row label="Tax" value="₹0.00" />
        : taxList.length === 1
          ? <Row label={`${taxList[0].taxName} (${taxList[0].percentage}%)`} value={`₹${tax.toFixed(2)}`} />
          : <>
              {taxList.map(t => {
                const amt = parseFloat(((taxableAmount * Number(t.percentage)) / 100).toFixed(2));
                return <Row key={t.id} label={`${t.taxName} (${t.percentage}%)`} value={`₹${amt.toFixed(2)}`} />;
              })}
              <Row label={`Total Tax (${taxRate}%)`} value={`₹${tax.toFixed(2)}`} valueColor="#374151" />
            </>
      }
      <View style={s.totalRow}>
        <Text style={s.totalLabel}>Total Payable</Text>
        <Text style={s.totalValue}>₹{total.toFixed(2)}</Text>
      </View>
    </View>
  );
}

// ─── Coupon ───────────────────────────────────────────────────────────────────
function CouponSection({ couponApplied, couponCode, setCouponCode, couponError, setCouponError, couponLoading, handleCouponApply, removeCoupon, couponDiscount }) {
  return (
    <View style={s.couponWrap}>
      <Text style={s.couponHeading}>🏷️  Have a coupon?</Text>
      {couponApplied ? (
        <View style={s.couponApplied}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text style={s.couponAppliedCode}>✓ {couponApplied.couponCode}</Text>
            <Text style={s.couponAppliedOff}>–₹{couponDiscount.toFixed(2)} off</Text>
          </View>
          <TouchableOpacity onPress={removeCoupon} style={s.couponRemoveBtn}>
            <Text style={s.couponRemoveX}>✕</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={s.couponInputRow}>
          <TextInput
            style={s.couponInput}
            value={couponCode}
            onChangeText={t => { setCouponCode(t.toUpperCase()); setCouponError(''); }}
            onSubmitEditing={handleCouponApply}
            placeholder="Enter coupon code"
            placeholderTextColor="#9ca3af"
            autoCapitalize="characters"
          />
          <TouchableOpacity onPress={handleCouponApply} disabled={couponLoading} style={s.couponApplyBtn} activeOpacity={0.85}>
            {couponLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.couponApplyArrow}>›</Text>}
          </TouchableOpacity>
        </View>
      )}
      {!!couponError && <Text style={s.couponError}>⚠ {couponError}</Text>}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CHECKOUT SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
export default function CheckoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // ── State ──────────────────────────────────────────────────────────────────
  const [cartItems,        setCartItems]        = useState([]);
  const [addresses,        setAddresses]        = useState([]);
  const [gateways,         setGateways]         = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [selectedAddressId,setSelectedAddressId]= useState(null);
  const [paymentMethod,    setPaymentMethod]    = useState('COD');
  const [note,             setNote]             = useState('');
  const [showItems,        setShowItems]        = useState(false);
  const [showAddrModal,    setShowAddrModal]    = useState(false);
  const [shippingCharge,   setShippingCharge]   = useState(0);
  const [taxRate,          setTaxRate]          = useState(0);
  const [taxList,          setTaxList]          = useState([]);
  const [deliveryLoading,  setDeliveryLoading]  = useState(false);
  const [couponCode,       setCouponCode]       = useState('');
  const [couponApplied,    setCouponApplied]    = useState(null);
  const [couponError,      setCouponError]      = useState('');
  const [couponLoading,    setCouponLoading]    = useState(false);
  const [placing,          setPlacing]          = useState(false);
  const [orderSuccess,     setOrderSuccess]     = useState(null);
  const [error,            setError]            = useState('');

  // ── Razorpay WebView state (EXPO GO mode) ──────────────────────────────────
  const [rzpWebViewHtml,   setRzpWebViewHtml]   = useState(null); // null = closed

  // ── Load ───────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cartRes, addrRes, gwRes, taxRes] = await Promise.allSettled([
        api.cart(), api.addresses(), api.gateways(), api.taxRate(),
      ]);
      let qty = 1;
      if (cartRes.status === 'fulfilled') {
        const items = cartRes.value?.items || [];
        setCartItems(items);
        if (items.length === 0) { router.replace('/(tabs)/cart'); return; }
        qty = items.reduce((s, i) => s + (i.quantity || 1), 0);
      }
      if (addrRes.status === 'fulfilled') {
        const addrs = addrRes.value?.addresses || [];
        setAddresses(addrs);
        const def = addrs.find(a => a.isDefault) || addrs[0];
        if (def) setSelectedAddressId(def.id);
      }
      if (gwRes.status  === 'fulfilled') setGateways(gwRes.value?.gateways || []);
      if (taxRes.status === 'fulfilled' && taxRes.value?.success) {
        setTaxRate(taxRes.value.totalPercentage || 0);
        setTaxList(taxRes.value.taxes || []);
      }
      try {
        const d = await api.deliveryRate(qty);
        if (d?.success) setShippingCharge(Number(d.charge ?? 0));
      } catch {}
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!cartItems.length) return;
    const qty = cartItems.reduce((s, i) => s + (i.quantity || 1), 0);
    setDeliveryLoading(true);
    api.deliveryRate(qty)
      .then(r => { if (r?.success) setShippingCharge(Number(r.charge ?? 0)); })
      .catch(() => {})
      .finally(() => setDeliveryLoading(false));
  }, [cartItems]);

  // ── Derived pricing ────────────────────────────────────────────────────────
  const subtotal = cartItems.reduce((s, i) => {
    const p = i.product || i;
    return s + Number(p.sellingPrice ?? p.price ?? p.buyingPrice ?? 0) * (i.quantity || 1);
  }, 0);
  const couponDiscount = couponApplied
    ? couponApplied.discountType === 'Percentage'
      ? Math.min((subtotal * couponApplied.discountValue) / 100, couponApplied.maxDiscount || Infinity)
      : couponApplied.discountValue
    : 0;
  const taxableAmount = Math.max(0, subtotal - couponDiscount);
  const tax           = parseFloat(((taxableAmount * taxRate) / 100).toFixed(2));
  const total         = Math.max(0, taxableAmount + shippingCharge + tax);
  const selectedAddress = addresses.find(a => a.id === selectedAddressId) || null;
  const itemCount       = cartItems.reduce((s, i) => s + (i.quantity || 1), 0);
  const addrLabel       = a => [a.house, a.road, a.landmark, a.city, a.state, a.pincode].filter(Boolean).join(', ');

  // ── Shared args for verifyAndPlace ─────────────────────────────────────────
  const sharedOrderArgs = {
    selectedAddressId, note,
    couponApplied, couponDiscount,
    shippingCharge, tax, total,
    paymentMethod: 'Razorpay',
    setError, setPlacing, setOrderSuccess,
  };

  // ── Coupon ─────────────────────────────────────────────────────────────────
  const handleCouponApply = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true); setCouponError('');
    try {
      const d = await api.coupon({ code: couponCode.trim(), orderAmount: subtotal });
      if (d.success) setCouponApplied(d.coupon);
      else setCouponError(d.message || 'Invalid coupon');
    } catch { setCouponError('Failed to validate coupon'); }
    finally { setCouponLoading(false); }
  };
  const removeCoupon = () => { setCouponApplied(null); setCouponCode(''); setCouponError(''); };

  // ── Place Order ────────────────────────────────────────────────────────────
  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      Alert.alert('Address Required', 'Please select a delivery address.');
      return;
    }
    setError(''); setPlacing(true);

    try {
      // ── RAZORPAY ──────────────────────────────────────────────────────────
      if (paymentMethod === 'Razorpay') {

        // ── STEP 1: Init order on backend (same for both modes) ─────────────
        const rzpData = await api.razorpayInit({ amount: total });
        if (!rzpData.success) {
          setError(rzpData.message || 'Payment initialisation failed');
          setPlacing(false); return;
        }

        // ════════════════════════════════════════════════════════════════════
        // EXPO GO MODE  — WebView with Razorpay checkout.js
        // ════════════════════════════════════════════════════════════════════
        if (RAZORPAY_MODE === 'webview') {
          const html = buildRazorpayHtml({
            key:          rzpData.key_id,
            amount:       rzpData.amount,
            order_id:     rzpData.order_id,
            customerName: selectedAddress?.name  || '',
            contact:      selectedAddress?.phone || '',
          });
          setRzpWebViewHtml(html);
          // placing stays true — resolved in handleWebViewMessage callback
          return;
        }

        // ════════════════════════════════════════════════════════════════════
        // DEV BUILD MODE — react-native-razorpay native SDK
        //
        // TO ACTIVATE:
        //   1. npm install react-native-razorpay && npx expo run:android
        //   2. Uncomment  import RazorpayCheckout  at the top of this file
        //   3. Change RAZORPAY_MODE to 'native'
        // ════════════════════════════════════════════════════════════════════
        if (RAZORPAY_MODE === 'native') {
          // eslint-disable-next-line no-undef
          const RazorpayCheckout = require(/* @vite-ignore */ 'react-native-razorpay' + '').default;

          try {
            const response = await RazorpayCheckout.open({
              description:  'Order Payment',
              currency:     'INR',
              key:          rzpData.key_id,
              amount:       rzpData.amount,
              order_id:     rzpData.order_id,
              name:         'Gramin Kart',
              prefill:      { name: selectedAddress?.name || '', contact: selectedAddress?.phone || '' },
              theme:        { color: '#16a34a' },
            });
            await verifyAndPlace({ ...response, ...sharedOrderArgs });
          } catch (e) {
            // code 0 = user dismissed sheet — silent; anything else = real error
            if (e?.code !== 0 && e?.code !== 'PAYMENT_CANCELLED') {
              setError(e?.description || 'Razorpay payment failed. Please try again.');
            }
            setPlacing(false);
          }
          return;
        }

        return; // safety fallthrough
      }

      // ── COD / Card ────────────────────────────────────────────────────────
      const orderRes = await api.placeOrder({
        addressId:     selectedAddressId,
        paymentMethod: paymentMethod === 'Card' ? 'Card' : 'COD',
        note,
        couponCode:    couponApplied?.couponCode || null,
        couponDiscount, shippingCharge, tax,
      });
      if (orderRes.success) {
        EventEmitter.emit('cart-updated', { items: [] });
        setOrderSuccess({ ...orderRes.order, total, paymentMethod });
      } else {
        setError(orderRes.message || 'Failed to place order');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  // ── WebView message handler (EXPO GO Razorpay) ─────────────────────────────
  const handleWebViewMessage = useCallback(async (event) => {
    let msg;
    try { msg = JSON.parse(event.nativeEvent.data); } catch { return; }

    if (msg.type === 'CANCELLED') {
      // User closed Razorpay sheet — dismiss modal, reset placing
      setRzpWebViewHtml(null);
      setPlacing(false);
      return;
    }

    if (msg.type === 'FAILED') {
      setRzpWebViewHtml(null);
      setError(msg.description || 'Payment failed. Please try again.');
      setPlacing(false);
      return;
    }

    if (msg.type === 'SUCCESS') {
      setRzpWebViewHtml(null);
      // placing stays true while we verify + place
      try {
        await verifyAndPlace({
          razorpay_order_id:   msg.razorpay_order_id,
          razorpay_payment_id: msg.razorpay_payment_id,
          razorpay_signature:  msg.razorpay_signature,
          ...sharedOrderArgs,
        });
      } catch {
        setError('Order placement failed after payment. Contact support.');
        setPlacing(false);
      }
    }
  }, [sharedOrderArgs]);

  // ── Shared summary + coupon props ──────────────────────────────────────────
  const summaryRowsProps = { subtotal, couponDiscount, taxableAmount, shippingCharge, deliveryLoading, taxRate, taxList, tax, total };
  const couponProps      = { couponApplied, couponCode, setCouponCode, couponError, setCouponError, couponLoading, handleCouponApply, removeCoupon, couponDiscount };

  // ── Success screen ─────────────────────────────────────────────────────────
  if (orderSuccess) {
    return <OrderSuccess order={orderSuccess} onDone={() => router.replace('/dashboard')} />;
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Top bar */}
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <Text style={s.backArrow}>←</Text>
          <Text style={s.backLabel}>Cart</Text>
        </TouchableOpacity>
        <Text style={s.topBarTitle}>Checkout</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading ? (
        <ScrollView contentContainerStyle={{ padding: 14 }}><Skeleton /></ScrollView>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={80}>
          <ScrollView
            contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 90 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Page title + items toggle */}
            <View style={s.pageRow}>
              <Text style={s.pageTitle}>Checkout</Text>
              <TouchableOpacity onPress={() => setShowItems(p => !p)} style={s.itemsToggleBtn} activeOpacity={0.8}>
                <Text style={s.itemsToggleTxt}>🛍 {itemCount} item{itemCount !== 1 ? 's' : ''} {showItems ? '▲' : '▼'}</Text>
              </TouchableOpacity>
            </View>

            {/* Expanded cart items */}
            {showItems && (
              <View style={s.card}>
                <Text style={s.cardHeading}>📦 Order Items</Text>
                {cartItems.map((item, i) => {
                  const p     = item.product || item;
                  const price = Number(p.sellingPrice ?? p.price ?? p.buyingPrice ?? 0);
                  const name  = p.name || 'Product';
                  const img   = p.thumbnail || p.additionalImages?.[0] || p.image;
                  const qty   = item.quantity || 1;
                  return (
                    <View key={i} style={[s.cartItemRow, i < cartItems.length - 1 && s.cartItemBorder]}>
                      <View style={s.cartItemImg}>
                        {img ? <Image source={{ uri: img }} style={s.cartItemImgInner} /> : <Text style={{ fontSize: 22 }}>📦</Text>}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text numberOfLines={1} style={s.cartItemName}>{name}</Text>
                        <Text style={s.cartItemQty}>Qty: {qty}</Text>
                      </View>
                      <Text style={s.cartItemPrice}>₹{(price * qty).toFixed(2)}</Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Shipping Address */}
            <View style={s.card}>
              <SectionHeader icon="📍" title="Shipping Address"
                action={addresses.length > 0
                  ? <TouchableOpacity onPress={() => setShowAddrModal(true)} style={s.changeBtn}><Text style={s.changeBtnTxt}>Change</Text></TouchableOpacity>
                  : null}
              />
              {addresses.length === 0 ? (
                <View style={s.noAddrBox}>
                  <Text style={s.noAddrText}>No address saved yet.</Text>
                  <TouchableOpacity onPress={() => router.push('/dashboard')} style={s.addAddrBtn}>
                    <Text style={s.addAddrBtnTxt}>Add Address</Text>
                  </TouchableOpacity>
                </View>
              ) : selectedAddress ? (
                <View style={s.addrSelected}>
                  <View style={s.addrCardRow}>
                    <Text style={s.addrName}>{selectedAddress.name}</Text>
                    <Badge>{selectedAddress.type?.toUpperCase() || 'HOME'}</Badge>
                    {selectedAddress.isDefault && <Badge color="#16a34a">DEFAULT</Badge>}
                  </View>
                  <Text style={s.addrPhone}>{selectedAddress.phone}</Text>
                  <Text style={s.addrFull}>{addrLabel(selectedAddress)}</Text>
                </View>
              ) : (
                <Text style={s.noAddrText}>No address selected.</Text>
              )}
            </View>

            {/* Payment Method */}
            <View style={s.card}>
              <SectionHeader icon="💳" title="Payment Method" />
              <PayBtn active={paymentMethod === 'COD'}      onPress={() => setPaymentMethod('COD')}      icon="💵" label="Cash on Delivery" />
              {gateways.some(g => g.gatewayName === 'Razorpay') && (
                <PayBtn active={paymentMethod === 'Razorpay'} onPress={() => setPaymentMethod('Razorpay')} icon="🔐" label="Razorpay" />
              )}
              {gateways.some(g => g.gatewayName === 'Stripe') && (
                <PayBtn active={paymentMethod === 'Card'}     onPress={() => setPaymentMethod('Card')}     icon="💳" label="Credit / Debit Card" />
              )}
            </View>

            {/* Note */}
            <View style={s.card}>
              <Text style={s.noteHeading}>Note <Text style={s.noteOptional}>(Optional)</Text></Text>
              <TextInput
                style={s.noteInput}
                value={note} onChangeText={setNote}
                placeholder="Write any special instructions…"
                placeholderTextColor="#9ca3af"
                multiline numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Order Summary */}
            <View style={s.card}>
              <Text style={s.cardHeading}>Order Summary</Text>
              <SummaryRows {...summaryRowsProps} />
              <CouponSection {...couponProps} />
            </View>

            {/* Error */}
            {!!error && (
              <View style={s.errorBox}><Text style={s.errorTxt}>⚠ {error}</Text></View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* Bottom sticky bar */}
      {!loading && (
        <View style={[s.bottomBar, { paddingBottom: insets.bottom + 10 }]}>
          {!selectedAddressId && (
            <Text style={s.addrWarning}>⚠ Please select a delivery address above</Text>
          )}
          <View style={s.bottomBarInner}>
            <View>
              <Text style={s.totalBarLabel}>Total Payable</Text>
              <Text style={s.totalBarValue}>₹{total.toFixed(2)}</Text>
              {shippingCharge === 0 && <Text style={s.freeDelivery}>🎉 Free delivery</Text>}
            </View>
            <TouchableOpacity
              onPress={handlePlaceOrder}
              disabled={placing || !selectedAddressId}
              style={[s.placeOrderBtn, (!selectedAddressId || placing) && s.placeOrderBtnDisabled]}
              activeOpacity={0.88}
            >
              {placing
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={s.placeOrderBtnTxt}>Place Order</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Address picker modal */}
      <AddressModal
        visible={showAddrModal}
        addresses={addresses}
        selectedId={selectedAddressId}
        onSelect={setSelectedAddressId}
        onClose={() => setShowAddrModal(false)}
      />

      {/* ── Razorpay WebView modal (EXPO GO mode only) ── */}
      {/* In DEV BUILD mode this modal never opens (rzpWebViewHtml stays null) */}
      <RazorpayWebViewModal
        visible={!!rzpWebViewHtml}
        html={rzpWebViewHtml || ''}
        onMessage={handleWebViewMessage}
        onClose={() => { setRzpWebViewHtml(null); setPlacing(false); }}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const G    = '#16a34a';
const DARK = '#1a2332';

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f4f6f4' },

  topBar:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 1 } },
  backBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 60 },
  backArrow:   { fontSize: 18, color: G, fontWeight: '700' },
  backLabel:   { fontSize: 13, color: G, fontWeight: '700' },
  topBarTitle: { fontSize: 16, fontWeight: '800', color: DARK },

  scrollContent: { padding: 14 },

  pageRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  pageTitle:      { fontSize: 22, fontWeight: '800', color: DARK },
  itemsToggleBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0fdf4', borderWidth: 1.5, borderColor: '#bbf7d0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  itemsToggleTxt: { fontSize: 13, fontWeight: '700', color: G },

  card:        { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardHeading: { fontSize: 14, fontWeight: '800', color: DARK, marginBottom: 14 },

  sectionHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionIcon:       { fontSize: 15 },
  sectionTitle:      { fontSize: 15, fontWeight: '800', color: DARK },
  changeBtn:         { paddingVertical: 6, paddingHorizontal: 8 },
  changeBtnTxt:      { fontSize: 13, fontWeight: '700', color: G },

  cartItemRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  cartItemBorder:   { borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  cartItemImg:      { width: 50, height: 50, borderRadius: 10, backgroundColor: '#f8faf8', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e8f5e9' },
  cartItemImgInner: { width: '100%', height: '100%' },
  cartItemName:     { fontSize: 13, fontWeight: '700', color: DARK, marginBottom: 2 },
  cartItemQty:      { fontSize: 12, color: '#9ca3af' },
  cartItemPrice:    { fontSize: 14, fontWeight: '800', color: G },

  noAddrBox:     { borderWidth: 2, borderColor: '#e5e7eb', borderStyle: 'dashed', borderRadius: 12, padding: 20, alignItems: 'center' },
  noAddrText:    { fontSize: 14, color: '#9ca3af', marginBottom: 12 },
  addAddrBtn:    { backgroundColor: G, borderRadius: 10, paddingHorizontal: 22, paddingVertical: 11 },
  addAddrBtnTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },
  addrSelected:  { borderWidth: 2, borderColor: G, borderRadius: 12, padding: 14, backgroundColor: '#f0fdf4' },
  addrCardRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' },
  addrName:      { fontSize: 14, fontWeight: '800', color: DARK },
  addrPhone:     { fontSize: 12, color: '#6b7280', marginBottom: 2 },
  addrFull:      { fontSize: 13, color: '#374151', lineHeight: 19 },
  addrSelLabel:  { marginTop: 8, fontSize: 12, fontWeight: '700', color: G },

  badge:     { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },

  payBtn:        { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13, borderWidth: 2, borderColor: '#e5e7eb', borderRadius: 12, backgroundColor: '#fff', marginBottom: 10 },
  payBtnActive:  { borderColor: G, backgroundColor: '#f0fdf4' },
  payRadio:      { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center' },
  payRadioActive:{ borderColor: G },
  payRadioDot:   { width: 8, height: 8, borderRadius: 4, backgroundColor: G },
  payIcon:       { fontSize: 18 },
  payLabel:      { fontSize: 13, fontWeight: '700', color: '#374151' },
  payLabelActive:{ color: G },

  noteHeading:  { fontSize: 15, fontWeight: '800', color: DARK, marginBottom: 10 },
  noteOptional: { fontWeight: '500', fontSize: 13, color: '#9ca3af' },
  noteInput:    { borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 10, padding: 11, fontSize: 13, color: '#374151', minHeight: 80, lineHeight: 20 },

  sumRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  sumLabel:  { fontSize: 13, color: '#6b7280' },
  sumValue:  { fontSize: 13, fontWeight: '700', color: '#374151' },
  totalRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14, marginTop: 4 },
  totalLabel:{ fontSize: 15, fontWeight: '800', color: DARK },
  totalValue:{ fontSize: 22, fontWeight: '800', color: DARK },

  couponWrap:        { marginTop: 16, backgroundColor: '#f8faf8', borderRadius: 14, padding: 14 },
  couponHeading:     { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 10 },
  couponApplied:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0fdf4', borderWidth: 1.5, borderColor: '#86efac', borderRadius: 10, padding: 10, gap: 8 },
  couponAppliedCode: { fontSize: 13, fontWeight: '700', color: G },
  couponAppliedOff:  { fontSize: 12, color: '#6b7280' },
  couponRemoveBtn:   { padding: 4 },
  couponRemoveX:     { fontSize: 14, color: '#9ca3af' },
  couponInputRow:    { flexDirection: 'row' },
  couponInput:       { flex: 1, borderWidth: 1.5, borderColor: '#e5e7eb', borderRightWidth: 0, borderTopLeftRadius: 10, borderBottomLeftRadius: 10, paddingHorizontal: 13, paddingVertical: 11, fontSize: 13, color: '#374151' },
  couponApplyBtn:    { backgroundColor: DARK, borderTopRightRadius: 10, borderBottomRightRadius: 10, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', minWidth: 46 },
  couponApplyArrow:  { fontSize: 22, color: '#fff', fontWeight: '700', marginTop: -2 },
  couponError:       { marginTop: 8, fontSize: 12, color: '#ef4444' },

  errorBox: { backgroundColor: '#fef2f2', borderWidth: 1.5, borderColor: '#fecaca', borderRadius: 10, padding: 12, marginBottom: 14 },
  errorTxt: { fontSize: 13, color: '#ef4444', fontWeight: '600' },

  bottomBar:       { backgroundColor: '#fff', borderTopWidth: 1.5, borderTopColor: '#e5e7eb', paddingTop: 12, paddingHorizontal: 14, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: -3 }, elevation: 12 },
  addrWarning:     { fontSize: 12, color: '#f59e0b', fontWeight: '600', marginBottom: 6, paddingLeft: 2 },
  bottomBarInner:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  totalBarLabel:   { fontSize: 11, color: '#9ca3af', fontWeight: '600', marginBottom: 2 },
  totalBarValue:   { fontSize: 21, fontWeight: '800', color: DARK, lineHeight: 24 },
  freeDelivery:    { fontSize: 11, color: G, fontWeight: '600', marginTop: 2 },
  placeOrderBtn:   { backgroundColor: G, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 28, alignItems: 'center', justifyContent: 'center', shadowColor: G, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4, minWidth: 140 },
  placeOrderBtnDisabled: { backgroundColor: '#9ca3af', shadowOpacity: 0, elevation: 0 },
  placeOrderBtnTxt:{ color: '#fff', fontSize: 14, fontWeight: '800' },

  modalOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet:    { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%' },
  modalHandle:   { width: 40, height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  modalHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  modalTitle:    { fontSize: 16, fontWeight: '800', color: DARK },
  modalCloseBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  modalCloseX:   { fontSize: 13, color: '#6b7280', fontWeight: '700' },
  addrCard:      { borderWidth: 2, borderColor: '#e5e7eb', borderRadius: 14, padding: 14, backgroundColor: '#fff' },
  addrCardSelected: { borderColor: G, backgroundColor: '#f0fdf4' },

  // Razorpay WebView modal
  rzpHeader:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  rzpCloseBtn:    { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  rzpCloseX:      { fontSize: 14, color: '#6b7280', fontWeight: '700' },
  rzpHeaderTitle: { fontSize: 15, fontWeight: '800', color: DARK },
  rzpLoading:     { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f6f4' },
  rzpLoadingTxt:  { marginTop: 12, fontSize: 14, color: '#6b7280' },

  skeletonWrap:  { padding: 14, gap: 14 },
  skeletonBlock: { backgroundColor: '#e5e7eb', borderRadius: 14 },

  successBg:       { flex: 1, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center', padding: 20 },
  successCard:     { backgroundColor: '#fff', borderRadius: 24, padding: 36, width: '100%', maxWidth: 400, alignItems: 'center', shadowColor: G, shadowOpacity: 0.1, shadowRadius: 30, elevation: 8 },
  successIcon:     { width: 80, height: 80, borderRadius: 40, backgroundColor: '#f0fdf4', borderWidth: 3, borderColor: '#bbf7d0', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  successTitle:    { fontSize: 24, fontWeight: '800', color: DARK, marginBottom: 8 },
  successSub:      { fontSize: 14, color: '#6b7280', marginBottom: 4 },
  successOrderNo:  { fontSize: 13, fontWeight: '700', color: G, marginBottom: 24 },
  successSummary:  { backgroundColor: '#f8faf8', borderRadius: 14, padding: 16, width: '100%', marginBottom: 24 },
  successRow:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  successRowLabel: { fontSize: 13, color: '#6b7280' },
  successRowValue: { fontSize: 16, fontWeight: '800', color: DARK },
  successRowValue2:{ fontSize: 13, fontWeight: '700', color: '#374151' },
  successBtn:      { width: '100%', backgroundColor: G, borderRadius: 14, paddingVertical: 15, alignItems: 'center', shadowColor: G, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4 },
  successBtnTxt:   { color: '#fff', fontSize: 15, fontWeight: '800' },
});