// app/(tabs)/cart.jsx
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { fetchCart, removeFromCart, updateCartItem } from '../../src/api/cartWishlist';
import { EventEmitter } from '../../src/api/EventEmitter';
import { useAuth } from '../../src/context/AuthContext';

// ─── Brand tokens ─────────────────────────────────────────────────────────────
const C = {
  green:      '#16a34a',
  greenLight: '#dcfce7',
  greenDark:  '#14532d',
  text:       '#111827',
  textSub:    '#6b7280',
  textLight:  '#9ca3af',
  divider:    '#f3f4f6',
  bg:         '#f8faf8',
  white:      '#ffffff',
  red:        '#991b1b',
  redLight:   '#fef2f2',
  orange:     '#fb641b',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getImage    = (item) => item?.thumbnail || item?.image || item?.product?.thumbnail || item?.product?.image || null;
const getName     = (item) => item?.name || item?.product?.name || 'Product';
const getPrice    = (item) => Number(item?.sellingPrice ?? item?.price ?? item?.product?.sellingPrice ?? item?.product?.price ?? 0);
const getOldPrice = (item) => Number(item?.mrp ?? item?.oldPrice ?? item?.product?.mrp ?? 0);
const getId       = (item) => item?.productId || item?.product?.id || item?.id;

// ─── Normalize cart response ──────────────────────────────────────────────────
const normalizeCart = (data) =>
  data?.items ||
  data?.cart?.items ||
  data?.data?.items ||
  data?.data ||
  (Array.isArray(data) ? data : []);

// ─── Toast ────────────────────────────────────────────────────────────────────
const Toast = ({ message, type, onDone }) => {
  React.useEffect(() => {
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <View style={[ts.wrap, { backgroundColor: type === 'success' ? C.green : C.red }]}>
      <Text style={ts.txt}>{message}</Text>
    </View>
  );
};
const ts = StyleSheet.create({
  wrap: {
    position: 'absolute', bottom: 30, alignSelf: 'center',
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8,
    elevation: 8, zIndex: 9999,
  },
  txt: { color: C.white, fontSize: 13, fontWeight: '600' },
});

// ─── Skeleton loader ──────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <View style={sk.card}>
    <View style={sk.img} />
    <View style={{ flex: 1, gap: 8, padding: 12 }}>
      <View style={[sk.line, { width: '40%', height: 10 }]} />
      <View style={[sk.line, { width: '90%', height: 14 }]} />
      <View style={[sk.line, { width: '30%', height: 10 }]} />
      <View style={[sk.line, { height: 32, borderRadius: 10, marginTop: 4 }]} />
    </View>
  </View>
);
const sk = StyleSheet.create({
  card: { backgroundColor: C.white, borderRadius: 16, flexDirection: 'row', marginBottom: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#e8f5e9' },
  img:  { width: 110, aspectRatio: 1, backgroundColor: C.divider },
  line: { backgroundColor: C.divider, borderRadius: 6 },
});

// ─── Empty state ──────────────────────────────────────────────────────────────
const EmptyCart = ({ onBrowse }) => (
  <View style={em.wrap}>
    <View style={em.iconWrap}>
      <Text style={{ fontSize: 40 }}>🛒</Text>
    </View>
    <Text style={em.title}>Your cart is empty</Text>
    <Text style={em.sub}>Add items to your cart and they'll show up here. Start shopping now!</Text>
    <TouchableOpacity style={em.btn} onPress={onBrowse}>
      <Text style={em.btnTxt}>Browse Products →</Text>
    </TouchableOpacity>
  </View>
);

// ─── Guest state ──────────────────────────────────────────────────────────────
const GuestCart = ({ onLogin }) => (
  <View style={em.wrap}>
    <View style={em.iconWrap}>
      <Text style={{ fontSize: 40 }}>🛒</Text>
    </View>
    <Text style={em.title}>Login to view your cart</Text>
    <Text style={em.sub}>Your cart items are saved when you're logged in. Sign in to continue shopping.</Text>
    <TouchableOpacity style={em.btn} onPress={onLogin}>
      <Text style={em.btnTxt}>Login / Register</Text>
    </TouchableOpacity>
  </View>
);

const em = StyleSheet.create({
  wrap:     { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  iconWrap: { width: 88, height: 88, borderRadius: 44, backgroundColor: C.greenLight, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  title:    { fontSize: 18, fontWeight: '800', color: C.text },
  sub:      { fontSize: 13, color: C.textSub, textAlign: 'center', maxWidth: 280, lineHeight: 20 },
  btn:      { marginTop: 8, paddingHorizontal: 28, paddingVertical: 12, backgroundColor: C.green, borderRadius: 12 },
  btnTxt:   { color: C.white, fontWeight: '700', fontSize: 14 },
});

// ─── Cart Item Card ───────────────────────────────────────────────────────────
const CartItemCard = ({ item, onQtyChange, onRemove, removing }) => {
  const image    = getImage(item);
  const name     = getName(item);
  const price    = getPrice(item);
  const oldPrice = getOldPrice(item);
  const id       = getId(item);
  const qty      = item.quantity || 1;
  const discount = oldPrice > price ? Math.round((1 - price / oldPrice) * 100) : null;

  return (
    <View style={cd.card}>
      <View style={cd.imgWrap}>
        {image
          ? <Image source={{ uri: image }} style={cd.img} resizeMode="cover" />
          : <Text style={{ fontSize: 28 }}>📦</Text>}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={cd.name} numberOfLines={2}>{name}</Text>
        <View style={cd.priceRow}>
          <Text style={cd.price}>₹{price.toFixed(2)}</Text>
          {oldPrice > price && <Text style={cd.oldPrice}>₹{oldPrice.toFixed(2)}</Text>}
          {discount && (
            <View style={cd.discBadge}>
              <Text style={cd.discTxt}>{discount}% off</Text>
            </View>
          )}
        </View>
        <Text style={cd.subtotal}>Subtotal: ₹{(price * qty).toFixed(2)}</Text>
        <View style={cd.actionRow}>
          <View style={cd.qtyGroup}>
            <TouchableOpacity
              style={cd.qtyBtn}
              onPress={() => qty > 1 ? onQtyChange(id, qty - 1) : onRemove(id)}>
              <Text style={cd.qtyBtnTxt}>−</Text>
            </TouchableOpacity>
            <Text style={cd.qty}>{qty}</Text>
            <TouchableOpacity
              style={cd.qtyBtn}
              onPress={() => onQtyChange(id, qty + 1)}>
              <Text style={cd.qtyBtnTxt}>+</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            onPress={() => onRemove(id)}
            disabled={removing}
            style={cd.removeBtn}>
            {removing
              ? <ActivityIndicator size="small" color={C.red} />
              : <Text style={cd.removeTxt}>Remove</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};
const cd = StyleSheet.create({
  card:      { backgroundColor: C.white, borderRadius: 16, padding: 12, flexDirection: 'row', gap: 12, marginBottom: 10, borderWidth: 1, borderColor: '#e8f5e9', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  imgWrap:   { width: 90, height: 90, borderRadius: 10, backgroundColor: C.divider, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  img:       { width: '100%', height: '100%' },
  name:      { fontSize: 13, fontWeight: '600', color: C.text, lineHeight: 18, marginBottom: 5 },
  priceRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 },
  price:     { fontSize: 15, fontWeight: '800', color: C.text },
  oldPrice:  { fontSize: 12, color: C.textSub, textDecorationLine: 'line-through' },
  discBadge: { backgroundColor: C.greenLight, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  discTxt:   { fontSize: 11, fontWeight: '700', color: C.green },
  subtotal:  { fontSize: 12, color: C.textSub, marginBottom: 8 },
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  qtyGroup:  { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, overflow: 'hidden' },
  qtyBtn:    { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: C.divider },
  qtyBtnTxt: { fontSize: 18, fontWeight: '700', color: C.text, lineHeight: 22 },
  qty:       { width: 32, textAlign: 'center', fontSize: 14, fontWeight: '700', color: C.text, borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#d1d5db', paddingVertical: 4 },
  removeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1.5, borderColor: '#fecaca', borderRadius: 8 },
  removeTxt: { fontSize: 12, fontWeight: '700', color: C.red },
});

// ─── Order summary row ────────────────────────────────────────────────────────
const SummaryRow = ({ label, value, bold, green }) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
    <Text style={{ fontSize: 13, color: bold ? C.text : C.textSub, fontWeight: bold ? '700' : '400' }}>{label}</Text>
    <Text style={{ fontSize: 13, color: green ? C.green : bold ? C.text : C.textSub, fontWeight: bold ? '800' : '500' }}>{value}</Text>
  </View>
);

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────
export default function CartScreen() {
  const { isLoggedIn }              = useAuth();
  const router                      = useRouter();
  const [items,      setItems]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [removingId, setRemovingId] = useState(null);
  const [toast,      setToast]      = useState(null);

  // ── Listen for cart updates from anywhere in the app ─────────────────────────
  useEffect(() => {
    const handler = ({ items }) => {
      if (Array.isArray(items)) setItems(items);
    };
    EventEmitter.on('cart-updated', handler);
    return () => EventEmitter.off('cart-updated', handler);
  }, []);

  // ── Load cart on screen focus ────────────────────────────────────────────────
  useFocusEffect(useCallback(() => {
    if (!isLoggedIn) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    fetchCart()
      .then(data => {
        const loaded = normalizeCart(data);
        setItems(loaded);
        EventEmitter.emit('cart-updated', { items: loaded });
      })
      .catch(() => setError('Failed to load cart. Please try again.'))
      .finally(() => setLoading(false));
  }, [isLoggedIn]));

  // ── Qty change ───────────────────────────────────────────────────────────────
  const handleQtyChange = async (productId, qty) => {
    if (qty < 1) { handleRemove(productId); return; }
    try {
      await updateCartItem(productId, qty);
      const updated = items.map(i =>
        getId(i) === productId ? { ...i, quantity: qty } : i
      );
      setItems(updated);
      EventEmitter.emit('cart-updated', { items: updated });
    } catch {
      setToast({ message: 'Failed to update quantity', type: 'error' });
    }
  };

  // ── Remove item ──────────────────────────────────────────────────────────────
  const handleRemove = async (productId) => {
    setRemovingId(productId);
    try {
      await removeFromCart(productId);
      const updated = items.filter(i => getId(i) !== productId);
      setItems(updated);
      EventEmitter.emit('cart-updated', { items: updated });
      setToast({ message: 'Item removed from cart', type: 'success' });
    } catch {
      setToast({ message: 'Failed to remove item', type: 'error' });
    } finally {
      setRemovingId(null);
    }
  };

  // ── Totals ───────────────────────────────────────────────────────────────────
  const itemCount   = items.reduce((s, i) => s + (i.quantity || 1), 0);
  const subtotal    = items.reduce((s, i) => s + getPrice(i) * (i.quantity || 1), 0);
  const totalSaving = items.reduce((s, i) => {
    const old = getOldPrice(i);
    const cur = getPrice(i);
    return s + (old > cur ? (old - cur) * (i.quantity || 1) : 0);
  }, 0);
  const total = subtotal;

  // ── Guest view ───────────────────────────────────────────────────────────────
  if (!isLoggedIn) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <GuestCart onLogin={() => router.push('/login')} />
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={hd.bar}>
        <Text style={hd.title}>My Cart</Text>
        {!loading && items.length > 0 && (
          <View style={hd.badge}>
            <Text style={hd.badgeTxt}>{itemCount} item{itemCount !== 1 ? 's' : ''}</Text>
          </View>
        )}
      </View>

      {/* Loading skeletons */}
      {loading && (
        <View style={{ padding: 12 }}>
          {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
        </View>
      )}

      {/* Error */}
      {!loading && error && (
        <View style={er.wrap}>
          <Text style={er.txt}>{error}</Text>
          <TouchableOpacity style={er.btn} onPress={() => {
            setLoading(true);
            fetchCart()
              .then(data => {
                const loaded = normalizeCart(data);
                setItems(loaded);
                EventEmitter.emit('cart-updated', { items: loaded });
              })
              .catch(() => setError('Failed to load cart.'))
              .finally(() => setLoading(false));
          }}>
            <Text style={er.btnTxt}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Empty */}
      {!loading && !error && items.length === 0 && (
        <EmptyCart onBrowse={() => router.push('/products')} />
      )}

      {/* Cart list + order summary */}
      {!loading && !error && items.length > 0 && (
        <FlatList
          data={items}
          keyExtractor={(item, i) => String(getId(item) || i)}
          contentContainerStyle={{ padding: 12, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <CartItemCard
              item={item}
              onQtyChange={handleQtyChange}
              onRemove={handleRemove}
              removing={removingId === getId(item)}
            />
          )}
          ListFooterComponent={(
            <View style={sm.card}>
              <Text style={sm.title}>Order Summary</Text>
              <SummaryRow
                label={`Price (${itemCount} item${itemCount !== 1 ? 's' : ''})`}
                value={`₹${subtotal.toFixed(2)}`}
              />
              {totalSaving > 0 && (
                <SummaryRow label="Your savings" value={`−₹${totalSaving.toFixed(2)}`} green />
              )}
              <View style={sm.divider} />
              <SummaryRow label="Total Amount" value={`₹${total.toFixed(2)}`} bold />
              {totalSaving > 0 && (
                <View style={sm.savingsBanner}>
                  <Text style={sm.savingsTxt}>
                    🎉 You're saving ₹{totalSaving.toFixed(2)} on this order!
                  </Text>
                </View>
              )}
            </View>
          )}
        />
      )}

      {/* Checkout footer */}
      {!loading && !error && items.length > 0 && (
        <View style={ft.bar}>
          <View>
            <Text style={{ fontSize: 11, color: C.textSub }}>Total Amount</Text>
            <Text style={ft.total}>₹{total.toFixed(2)}</Text>
            {totalSaving > 0 && (
              <Text style={{ fontSize: 11, color: C.green, fontWeight: '600' }}>
                Save ₹{totalSaving.toFixed(2)}
              </Text>
            )}
          </View>
          <TouchableOpacity style={ft.btn} onPress={() => router.push('/checkout')}>
            <Text style={ft.btnTxt}>Proceed to Checkout</Text>
          </TouchableOpacity>
        </View>
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const hd = StyleSheet.create({
  bar:      { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.divider },
  title:    { fontSize: 18, fontWeight: '800', color: C.text },
  badge:    { backgroundColor: C.greenLight, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  badgeTxt: { fontSize: 12, fontWeight: '700', color: C.green },
});

const er = StyleSheet.create({
  wrap:   { margin: 16, padding: 16, backgroundColor: C.redLight, borderRadius: 12, borderWidth: 1, borderColor: '#fecaca', flexDirection: 'row', alignItems: 'center', gap: 10 },
  txt:    { flex: 1, fontSize: 13, fontWeight: '600', color: C.red },
  btn:    { backgroundColor: C.red, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 },
  btnTxt: { color: C.white, fontSize: 13, fontWeight: '700' },
});

const sm = StyleSheet.create({
  card:          { backgroundColor: C.white, borderRadius: 16, padding: 16, marginTop: 4, borderWidth: 1, borderColor: '#e8f5e9' },
  title:         { fontSize: 15, fontWeight: '800', color: C.text, marginBottom: 14 },
  divider:       { height: 1, backgroundColor: C.divider, marginVertical: 10 },
  savingsBanner: { backgroundColor: C.greenLight, borderRadius: 10, padding: 10, marginTop: 10 },
  savingsTxt:    { fontSize: 12, fontWeight: '700', color: C.green, textAlign: 'center' },
});

const ft = StyleSheet.create({
  bar:    { backgroundColor: C.white, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: C.divider, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 8 },
  total:  { fontSize: 20, fontWeight: '900', color: C.text },
  btn:    { backgroundColor: C.orange, paddingHorizontal: 24, paddingVertical: 13, borderRadius: 12 },
  btnTxt: { color: C.white, fontWeight: '800', fontSize: 14 },
});