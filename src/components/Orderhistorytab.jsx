// components/OrderHistoryTab.jsx — React Native (Expo Router)
// Status filter redesigned as a 2×4 pill grid — fully visible, no horizontal scroll needed.

import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { Storage as store } from "../api/storage";

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const { width: SW } = Dimensions.get("window");

// ─── Token helper ─────────────────────────────────────────────────────────────
const getToken = () => store.getItem("userToken");
const authHdr = async () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${await getToken()}`,
});

// ─── API ──────────────────────────────────────────────────────────────────────
const apiFetchOrders = async () => {
  const headers = await authHdr();
  return fetch(`${API_URL}/api/orders/my`, { headers }).then(r => r.json());
};
const apiFetchOrder = async (id) => {
  const headers = await authHdr();
  return fetch(`${API_URL}/api/orders/my/${id}`, { headers }).then(r => r.json());
};
const apiCancelOrder = async (id) => {
  const headers = await authHdr();
  return fetch(`${API_URL}/api/orders/my/${id}/cancel`, { method: "PATCH", headers }).then(r => r.json());
};

// ─── PDF Download Helper ──────────────────────────────────────────────────────
const downloadPdf = async (type, orderId, orderNumber) => {
  // type: "invoice" | "receipt"
  const token = await getToken();
  const endpoint =
    type === "invoice"
      ? `${API_URL}/api/invoice/${orderId}/invoice?download=1`
      : `${API_URL}/api/receipt/${orderId}/receipt?download=1`;

  const filename = type === "invoice"
    ? `Invoice-${orderNumber || orderId}.pdf`
    : `Receipt-${orderNumber || orderId}.pdf`;

  const localUri = FileSystem.documentDirectory + filename;

  const downloadResumable = FileSystem.createDownloadResumable(
    endpoint,
    localUri,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const { uri } = await downloadResumable.downloadAsync();
  return uri;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) +
    " " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
};
const fmtEstDelivery = (createdAt) => {
  if (!createdAt) return "2-3 days";
  const d = new Date(createdAt);
  d.setDate(d.getDate() + 3);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_COLOR = {
  Pending:      { bg: "#f59e0b", color: "#fff" },
  Processing:   { bg: "#3b82f6", color: "#fff" },
  Shipped:      { bg: "#8b5cf6", color: "#fff" },
  "Picked Up":  { bg: "#0d9488", color: "#fff" },
  "In Transit": { bg: "#6366f1", color: "#fff" },
  "On The Way": { bg: "#f97316", color: "#fff" },
  Delivered:    { bg: "#16a34a", color: "#fff" },
  Cancelled:    { bg: "#ef4444", color: "#fff" },
};
const sc = (s) => STATUS_COLOR[s] || { bg: "#e5e7eb", color: "#374151" };

const STEP_MAP = { "Picked Up": "Shipped", "In Transit": "Shipped" };

// ─── Filter tabs — 8 pills arranged in a 2-row grid ──────────────────────────
const FILTER_TABS = [
  { key: "All",        label: "All",        emoji: "🗂",  statuses: null },
  { key: "Pending",    label: "Pending",    emoji: "🕐",  statuses: ["Pending"] },
  { key: "Confirmed",  label: "Confirmed",  emoji: "✅",  statuses: ["Processing"] },
  { key: "Picked Up",  label: "Picked Up",  emoji: "📦",  statuses: ["Shipped", "Picked Up"] },
  { key: "In Transit", label: "In Transit", emoji: "🚚",  statuses: ["In Transit"] },
  { key: "On The Way", label: "On Way",     emoji: "🛵",  statuses: ["On The Way"] },
  { key: "Delivered",  label: "Delivered",  emoji: "🎉",  statuses: ["Delivered"] },
  { key: "Cancelled",  label: "Cancelled",  emoji: "✕",   statuses: ["Cancelled"] },
];

const TAB_ACCENT = {
  All:         { active: "#1d4ed8", light: "#eff6ff" },
  Pending:     { active: "#d97706", light: "#fffbeb" },
  Confirmed:   { active: "#2563eb", light: "#eff6ff" },
  "Picked Up": { active: "#0f766e", light: "#f0fdfa" },
  "In Transit":{ active: "#4f46e5", light: "#eef2ff" },
  "On The Way":{ active: "#ea580c", light: "#fff7ed" },
  Delivered:   { active: "#16a34a", light: "#f0fdf4" },
  Cancelled:   { active: "#dc2626", light: "#fef2f2" },
};

// ─── Toast ────────────────────────────────────────────────────────────────────
const Toast = ({ message, type, onDone }) => {
  useEffect(() => { const t = setTimeout(onDone, 2800); return () => clearTimeout(t); }, []);
  return (
    <View style={[tos.wrap, { backgroundColor: type === "success" ? "#166534" : "#991b1b" }]}>
      <Text style={tos.txt}>{message}</Text>
    </View>
  );
};
const tos = StyleSheet.create({
  wrap: {
    position: "absolute", bottom: 20, alignSelf: "center",
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12,
    shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 8, elevation: 6,
  },
  txt: { color: "#fff", fontSize: 13, fontWeight: "600" },
});

// ─── Progress Stepper ─────────────────────────────────────────────────────────
const STEPS = ["Pending", "Processing", "Shipped", "On The Way", "Delivered"];
const STEP_LABELS = ["Placed", "Confirmed", "Picked Up", "On Way", "Delivered"];

const OrderStepper = ({ status }) => {
  const display = STEP_MAP[status] || status;
  if (display === "Cancelled" || display === "Returned") return null;
  const currentIdx = STEPS.indexOf(display);
  const DOT = 28;
  const LINE = (SW - 32 - DOT * 5 - 8) / 4;

  return (
    <View style={{ marginVertical: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
        {STEPS.map((step, i) => {
          const done   = i < currentIdx;
          const active = i === currentIdx;
          return (
            <View key={step} style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{ alignItems: "center" }}>
                <View style={[
                  stp.dot,
                  { width: DOT, height: DOT, borderRadius: DOT / 2 },
                  (done || active) && { backgroundColor: "#16a34a" },
                  active && { borderWidth: 2.5, borderColor: "#bbf7d0" },
                ]}>
                  {done
                    ? <Text style={{ color: "#fff", fontSize: 9, fontWeight: "800" }}>✓</Text>
                    : <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: active ? "#fff" : "#9ca3af" }} />}
                </View>
                <Text style={[
                  stp.label,
                  { width: DOT + 10, textAlign: "center" },
                  active && { color: "#16a34a", fontWeight: "700" },
                  done && { color: "#374151" },
                ]}>
                  {STEP_LABELS[i]}
                </Text>
              </View>
              {i < STEPS.length - 1 && (
                <View style={[stp.line, { width: LINE }, done && { backgroundColor: "#16a34a" }]} />
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
};
const stp = StyleSheet.create({
  dot:   { backgroundColor: "#e5e7eb", alignItems: "center", justifyContent: "center" },
  label: { fontSize: 9, fontWeight: "500", color: "#9ca3af", marginTop: 4 },
  line:  { height: 3, backgroundColor: "#e5e7eb", marginBottom: 14 },
});

// ─── Summary Row ──────────────────────────────────────────────────────────────
const SummaryRow = ({ label, value, valueColor }) => (
  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
    <Text style={{ fontSize: 13, color: "#6b7280" }}>{label}</Text>
    <Text style={{ fontSize: 13, fontWeight: "600", color: valueColor || "#374151" }}>{value}</Text>
  </View>
);

// ─── Download Button ──────────────────────────────────────────────────────────
const DownloadButton = ({ label, emoji, color, bgColor, onPress, loading }) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={loading}
    activeOpacity={0.75}
    style={[
      dlb.btn,
      { backgroundColor: bgColor, opacity: loading ? 0.65 : 1 },
    ]}
  >
    {loading
      ? <ActivityIndicator size="small" color={color} style={{ marginRight: 6 }} />
      : <Text style={{ fontSize: 14, marginRight: 4 }}>{emoji}</Text>}
    <Text style={[dlb.txt, { color }]}>
      {loading ? "Downloading…" : label}
    </Text>
  </TouchableOpacity>
);
const dlb = StyleSheet.create({
  btn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 10, borderRadius: 10, gap: 4,
  },
  txt: { fontSize: 12, fontWeight: "700" },
});

// ─── Order Detail ─────────────────────────────────────────────────────────────
const OrderDetail = ({ order, onBack, onCancel, cancelling }) => {
  const sc_ = sc(order.status);
  const addr = order.shippingAddress || {};
  const driver = order.assignedDriver;
  const fullAddr = [addr.house, addr.road, addr.landmark, addr.city, addr.state, addr.pincode].filter(Boolean).join(", ");

  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [receiptLoading, setReceiptLoading] = useState(false);

  const handleDownload = async (type) => {
    const setLoading = type === "invoice" ? setInvoiceLoading : setReceiptLoading;
    setLoading(true);
    try {
      const uri = await downloadPdf(type, order.id, order.orderNumber);
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: type === "invoice" ? "Download Invoice" : "Download Receipt",
        });
      } else {
        Alert.alert("Saved", `${type === "invoice" ? "Invoice" : "Receipt"} saved to documents.`);
      }
    } catch (err) {
      Alert.alert("Error", `Failed to download ${type}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={dt.topBar}>
        <TouchableOpacity onPress={onBack} style={dt.backBtn}>
          <Text style={dt.backTxt}>← Back</Text>
        </TouchableOpacity>
        <Text style={dt.heading}>Order Details</Text>
      </View>

      {/* Order ID + Status */}
      <View style={dt.card}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={dt.orderId}>#{order.orderNumber || String(order.id || "").slice(-8).toUpperCase()}</Text>
            <Text style={dt.meta}>Placed  <Text style={{ color: "#374151", fontWeight: "600" }}>{fmtDate(order.createdAt)}</Text></Text>
            <Text style={dt.meta}>Est. delivery  <Text style={{ color: "#374151", fontWeight: "600" }}>{fmtEstDelivery(order.createdAt)}</Text></Text>
          </View>
          <View style={[dt.statusBadge, { backgroundColor: sc_.bg }]}>
            <Text style={[dt.statusTxt, { color: sc_.color }]}>{order.status}</Text>
          </View>
        </View>
        <OrderStepper status={order.status} />
        {(order.status === "Cancelled" || order.status === "Returned") && (
          <View style={dt.cancelBanner}>
            <Text style={dt.cancelTxt}>This order has been {order.status.toLowerCase()}.</Text>
          </View>
        )}
      </View>

      {/* Products */}
      <View style={dt.card}>
        <Text style={dt.sectionTitle}>Products ({order.items?.length || 0})</Text>
        {(order.items || []).map((item, i) => (
          <View key={item.id || i} style={[dt.itemRow, i < order.items.length - 1 && { borderBottomWidth: 1, borderBottomColor: "#f3f4f6" }]}>
            <View style={dt.itemImgPlaceholder}><Text style={{ fontSize: 22 }}>📦</Text></View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={2} style={dt.itemName}>{item.name}</Text>
              <Text style={dt.itemQty}>{item.quantity} × ₹{Number(item.price || 0).toFixed(2)}</Text>
            </View>
            <Text style={dt.itemTotal}>₹{Number(item.total || (item.price * item.quantity) || 0).toFixed(2)}</Text>
          </View>
        ))}
      </View>

      {/* Summary */}
      <View style={dt.card}>
        <Text style={dt.sectionTitle}>Order Summary</Text>
        <SummaryRow label="Items"           value={order.items?.reduce((s, i) => s + i.quantity, 0) || 0} />
        <SummaryRow label="Subtotal"        value={`₹${Number(order.subtotal || 0).toFixed(2)}`} />
        <SummaryRow label="Discount"        value={`-₹${Number(order.discount || 0).toFixed(2)}`} valueColor="#ef4444" />
        <SummaryRow label="Shipping Charge" value={`₹${Number(order.shippingCharge || 0).toFixed(2)}`} />
        {order.tax > 0 && <SummaryRow label="Tax" value={`₹${Number(order.tax).toFixed(2)}`} />}
        <View style={dt.totalRow}>
          <Text style={dt.totalLabel}>Total Amount</Text>
          <Text style={dt.totalValue}>₹{Number(order.total || 0).toFixed(2)}</Text>
        </View>

        {/* Payment Method */}
        <View style={dt.paymentBox}>
          <Text style={dt.paymentLabel}>PAYMENT METHOD</Text>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={dt.paymentMethod}>
              {order.paymentMethod === "COD" ? "Cash on Delivery" : order.paymentMethod}
            </Text>
            <View style={[dt.payStatusBadge, { backgroundColor: order.paymentStatus === "Paid" ? "#dcfce7" : "#fef3c7" }]}>
              <Text style={[dt.payStatusTxt, { color: order.paymentStatus === "Paid" ? "#16a34a" : "#d97706" }]}>
                {order.paymentStatus}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Download Buttons ───────────────────────────────────────────── */}
        <View style={dt.downloadRow}>
          <DownloadButton
            label="Download Receipt"
            emoji="🧾"
            color="#1d4ed8"
            bgColor="#eff6ff"
            loading={receiptLoading}
            onPress={() => handleDownload("receipt")}
          />
          <DownloadButton
            label="Download Invoice"
            emoji="⬇"
            color="#15803d"
            bgColor="#f0fdf4"
            loading={invoiceLoading}
            onPress={() => handleDownload("invoice")}
          />
        </View>
      </View>

      {/* Delivery Address */}
      <View style={dt.card}>
        <Text style={dt.sectionTitle}>Delivery Address</Text>
        <Text style={dt.addrName}>{addr.name}</Text>
        <Text style={dt.addrMeta}>{addr.phone}{addr.altPhone ? `, ${addr.altPhone}` : ""}</Text>
        <Text style={dt.addrMeta}>{fullAddr}</Text>
      </View>

      {/* Delivery Agent */}
      {(order.status === "On The Way" || order.status === "Delivered") && (
        <View style={[dt.card, { borderWidth: 1.5, borderColor: "#bbf7d0" }]}>
          <Text style={dt.sectionTitle}>Delivery Agent</Text>
          {driver ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={dt.driverAvatar}><Text style={{ fontSize: 22 }}>🧑‍🦯</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={dt.driverName}>{driver.fullName || driver.name || "Agent"}</Text>
                <Text style={dt.driverPhone}>{driver.phone || "—"}</Text>
                {driver.vehicleType && (
                  <Text style={dt.driverVehicle}>{driver.vehicleType}{driver.vehicleNumber ? ` · ${driver.vehicleNumber}` : ""}</Text>
                )}
              </View>
              {driver.phone && (
                <TouchableOpacity onPress={() => Linking.openURL(`tel:${driver.phone}`)} style={dt.callBtn}>
                  <Text style={{ color: "#fff", fontSize: 16 }}>📞</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <Text style={{ fontSize: 13, color: "#9ca3af" }}>Assigning a delivery agent…</Text>
          )}
        </View>
      )}

      {/* Cancel */}
      {["Pending", "Processing"].includes(order.status) && (
        <TouchableOpacity onPress={() => onCancel(order.id)} disabled={cancelling} style={dt.cancelBtn}>
          {cancelling
            ? <ActivityIndicator color="#ef4444" size="small" />
            : <Text style={dt.cancelBtnTxt}>Cancel Order</Text>}
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const dt = StyleSheet.create({
  topBar:       { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  backBtn:      { borderWidth: 1.5, borderColor: "#e5e7eb", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  backTxt:      { fontSize: 13, fontWeight: "700", color: "#374151" },
  heading:      { fontSize: 18, fontWeight: "800", color: "#111" },
  card:         { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 10, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  orderId:      { fontSize: 15, fontWeight: "800", color: "#2563eb", marginBottom: 4 },
  meta:         { fontSize: 12, color: "#9ca3af", marginBottom: 2 },
  statusBadge:  { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, flexShrink: 0 },
  statusTxt:    { fontSize: 12, fontWeight: "700" },
  cancelBanner: { backgroundColor: "#fef2f2", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#fecaca", marginTop: 8 },
  cancelTxt:    { fontSize: 13, fontWeight: "600", color: "#dc2626" },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#111", marginBottom: 12 },
  itemRow:      { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  itemImgPlaceholder: { width: 54, height: 54, borderRadius: 8, backgroundColor: "#f9fafb", alignItems: "center", justifyContent: "center" },
  itemName:     { fontSize: 13, fontWeight: "700", color: "#111", marginBottom: 4 },
  itemQty:      { fontSize: 12, color: "#6b7280" },
  itemTotal:    { fontSize: 13, fontWeight: "700", color: "#111", flexShrink: 0 },
  totalRow:     { flexDirection: "row", justifyContent: "space-between", paddingTop: 10, borderTopWidth: 1, borderTopColor: "#f0f0f0", marginTop: 4 },
  totalLabel:   { fontSize: 15, fontWeight: "800", color: "#111" },
  totalValue:   { fontSize: 15, fontWeight: "800", color: "#111" },
  paymentBox:   { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, padding: 12, marginTop: 14 },
  paymentLabel: { fontSize: 10, fontWeight: "700", color: "#9ca3af", letterSpacing: 0.6, marginBottom: 6 },
  paymentMethod:{ fontSize: 15, fontWeight: "700", color: "#111" },
  payStatusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6 },
  payStatusTxt: { fontSize: 12, fontWeight: "700" },
  downloadRow:  { flexDirection: "row", gap: 10, marginTop: 14 },
  addrName:     { fontSize: 14, fontWeight: "700", color: "#111", marginBottom: 2 },
  addrMeta:     { fontSize: 12, color: "#6b7280", lineHeight: 20 },
  driverAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#f0fdf4", borderWidth: 2, borderColor: "#16a34a", alignItems: "center", justifyContent: "center" },
  driverName:   { fontSize: 14, fontWeight: "700", color: "#111" },
  driverPhone:  { fontSize: 13, color: "#6b7280", marginTop: 2 },
  driverVehicle:{ fontSize: 12, color: "#9ca3af", marginTop: 2 },
  callBtn:      { width: 36, height: 36, borderRadius: 18, backgroundColor: "#16a34a", alignItems: "center", justifyContent: "center" },
  cancelBtn:    { borderWidth: 1.5, borderColor: "#fca5a5", borderRadius: 12, paddingVertical: 14, alignItems: "center", justifyContent: "center", marginTop: 4 },
  cancelBtnTxt: { fontSize: 14, fontWeight: "700", color: "#ef4444" },
});

// ─── Order List Item ──────────────────────────────────────────────────────────
const OrderListItem = ({ order, onView }) => {
  const { bg, color } = sc(order.status);
  const qty = (order.items || []).reduce((s, i) => s + i.quantity, 0);
  const displayId = order.orderNumber || String(order.id || "").slice(-8).toUpperCase();
  return (
    <View style={li.card}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <Text style={li.orderId}>#{displayId}</Text>
        <View style={[li.badge, { backgroundColor: bg }]}>
          <Text style={[li.badgeTxt, { color }]}>{order.status}</Text>
        </View>
      </View>
      <Text style={li.date}>{fmtDate(order.createdAt)}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
        <View style={{ flexDirection: "row", gap: 16, alignItems: "center" }}>
          <Text style={li.qty}>{qty} item{qty !== 1 ? "s" : ""}</Text>
          <Text style={li.amount}>₹<Text style={{ color: "#16a34a", fontWeight: "800" }}>{Number(order.total || 0).toFixed(2)}</Text></Text>
        </View>
        <TouchableOpacity onPress={() => onView(order.id)} style={li.viewBtn}>
          <Text style={li.viewBtnTxt}>Details →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
const li = StyleSheet.create({
  card:       { backgroundColor: "#fff", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#f0f0f0", shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 2, marginBottom: 10 },
  orderId:    { fontSize: 13, fontWeight: "800", color: "#2563eb" },
  badge:      { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeTxt:   { fontSize: 11, fontWeight: "700" },
  date:       { fontSize: 12, color: "#9ca3af" },
  qty:        { fontSize: 13, color: "#6b7280" },
  amount:     { fontSize: 14, fontWeight: "700", color: "#111" },
  viewBtn:    { backgroundColor: "#f0fdf4", paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 },
  viewBtnTxt: { fontSize: 12, fontWeight: "700", color: "#16a34a" },
});

// ─── Status Filter Grid ───────────────────────────────────────────────────────
const PILL_GAP    = 8;
const PILL_H_PAD  = 12;
const PILL_WIDTH  = (SW - PILL_H_PAD * 2 - PILL_GAP * 3) / 4;

const StatusFilterGrid = ({ activeKey, counts, onSelect }) => (
  <View style={fg.wrap}>
    <View style={fg.row}>
      {FILTER_TABS.slice(0, 4).map(tab => {
        const active  = activeKey === tab.key;
        const accent  = TAB_ACCENT[tab.key] || TAB_ACCENT.All;
        const count   = counts[tab.key] ?? 0;
        return (
          <TouchableOpacity
            key={tab.key}
            onPress={() => onSelect(tab.key)}
            activeOpacity={0.75}
            style={[
              fg.pill,
              { width: PILL_WIDTH },
              active
                ? { backgroundColor: accent.active, borderColor: accent.active }
                : { backgroundColor: "#fff", borderColor: "#e5e7eb" },
            ]}>
            <Text style={fg.emoji}>{tab.emoji}</Text>
            <Text numberOfLines={1} style={[fg.label, active ? { color: "#fff" } : { color: "#374151" }]}>
              {tab.label}
            </Text>
            <View style={[fg.countBubble, active ? { backgroundColor: "rgba(255,255,255,0.25)" } : { backgroundColor: accent.light }]}>
              <Text style={[fg.countTxt, { color: active ? "#fff" : accent.active }]}>{count}</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
    <View style={fg.row}>
      {FILTER_TABS.slice(4).map(tab => {
        const active  = activeKey === tab.key;
        const accent  = TAB_ACCENT[tab.key] || TAB_ACCENT.All;
        const count   = counts[tab.key] ?? 0;
        return (
          <TouchableOpacity
            key={tab.key}
            onPress={() => onSelect(tab.key)}
            activeOpacity={0.75}
            style={[
              fg.pill,
              { width: PILL_WIDTH },
              active
                ? { backgroundColor: accent.active, borderColor: accent.active }
                : { backgroundColor: "#fff", borderColor: "#e5e7eb" },
            ]}>
            <Text style={fg.emoji}>{tab.emoji}</Text>
            <Text numberOfLines={1} style={[fg.label, active ? { color: "#fff" } : { color: "#374151" }]}>
              {tab.label}
            </Text>
            <View style={[fg.countBubble, active ? { backgroundColor: "rgba(255,255,255,0.25)" } : { backgroundColor: accent.light }]}>
              <Text style={[fg.countTxt, { color: active ? "#fff" : accent.active }]}>{count}</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  </View>
);

const fg = StyleSheet.create({
  wrap:        { paddingHorizontal: PILL_H_PAD, paddingVertical: 10, backgroundColor: "#f8fafc", borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  row:         { flexDirection: "row", gap: PILL_GAP, marginBottom: PILL_GAP },
  pill:        { borderWidth: 1.5, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 6, alignItems: "center", gap: 3 },
  emoji:       { fontSize: 16 },
  label:       { fontSize: 11, fontWeight: "700", letterSpacing: 0.1 },
  countBubble: { borderRadius: 99, paddingHorizontal: 6, paddingVertical: 1, minWidth: 20, alignItems: "center" },
  countTxt:    { fontSize: 10, fontWeight: "800" },
});

// ─── Skeleton loader ──────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <View style={[li.card, { opacity: 0.45 }]}>
    <View style={{ height: 13, width: "38%", backgroundColor: "#e5e7eb", borderRadius: 4, marginBottom: 8 }} />
    <View style={{ height: 11, width: "22%", backgroundColor: "#e5e7eb", borderRadius: 4, marginBottom: 12 }} />
    <View style={{ height: 11, width: "55%", backgroundColor: "#e5e7eb", borderRadius: 4 }} />
  </View>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export default function OrderHistoryTab({ onBack }) {
  const [orders,      setOrders]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [activeKey,   setActiveKey]   = useState("All");
  const [detailOrder, setDetailOrder] = useState(null);
  const [detailLoad,  setDetailLoad]  = useState(false);
  const [cancelling,  setCancelling]  = useState(false);
  const [toast,       setToast]       = useState(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetchOrders();
      setOrders(Array.isArray(data) ? data : data?.orders || []);
    } catch { setToast({ message: "Failed to load orders", type: "error" }); }
    finally  { setLoading(false); }
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const handleView = async (id) => {
    setDetailLoad(true);
    try {
      const data = await apiFetchOrder(id);
      setDetailOrder(data?.order || null);
    } catch { setToast({ message: "Failed to load order details", type: "error" }); }
    finally  { setDetailLoad(false); }
  };

  const handleCancel = async (id) => {
    setCancelling(true);
    try {
      const data = await apiCancelOrder(id);
      if (data?.success) {
        setDetailOrder(data.order);
        setOrders(prev => prev.map(o => o.id === id ? data.order : o));
        setToast({ message: "Order cancelled", type: "success" });
      } else {
        setToast({ message: data?.message || "Cannot cancel", type: "error" });
      }
    } catch { setToast({ message: "Something went wrong", type: "error" }); }
    finally  { setCancelling(false); }
  };

  const counts = FILTER_TABS.reduce((acc, tab) => {
    acc[tab.key] = tab.statuses
      ? orders.filter(o => tab.statuses.includes(o.status)).length
      : orders.length;
    return acc;
  }, {});

  const activeTab     = FILTER_TABS.find(t => t.key === activeKey);
  const visibleOrders = activeTab?.statuses
    ? orders.filter(o => activeTab.statuses.includes(o.status))
    : orders;

  if (detailLoad) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, backgroundColor: "#f3f4f6" }}>
        <ActivityIndicator color="#16a34a" size="large" />
        <Text style={{ color: "#9ca3af", fontSize: 14 }}>Loading order…</Text>
      </View>
    );
  }

  if (detailOrder) {
    return (
      <View style={{ flex: 1, backgroundColor: "#f3f4f6" }}>
        <OrderDetail
          order={detailOrder}
          onBack={() => setDetailOrder(null)}
          onCancel={handleCancel}
          cancelling={cancelling} />
        {toast && <Toast {...toast} onDone={() => setToast(null)} />}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#f3f4f6" }}>
      <View style={oh.header}>
        <Text style={oh.heading}>My Orders</Text>
        {orders.length > 0 && (
          <View style={oh.totalBadge}>
            <Text style={oh.totalBadgeTxt}>{orders.length} total</Text>
          </View>
        )}
      </View>

      <StatusFilterGrid
        activeKey={activeKey}
        counts={counts}
        onSelect={setActiveKey} />

      <ScrollView
        contentContainerStyle={{ padding: 12, paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}>
        {loading
          ? [1, 2, 3].map(i => <SkeletonCard key={i} />)
          : visibleOrders.length === 0
            ? (
              <View style={oh.emptyWrap}>
                <Text style={oh.emptyIcon}>
                  {activeKey === "Delivered" ? "🎉" : activeKey === "Cancelled" ? "❌" : "📋"}
                </Text>
                <Text style={oh.emptyTitle}>
                  {activeKey === "All" ? "No orders yet" : `No ${activeKey.toLowerCase()} orders`}
                </Text>
                <Text style={oh.emptySub}>
                  {activeKey === "All"
                    ? "Your orders will appear here once you place one."
                    : "Orders in this status will appear here."}
                </Text>
              </View>
            )
            : visibleOrders.map(order => (
              <OrderListItem key={order.id} order={order} onView={handleView} />
            ))
        }
      </ScrollView>

      {toast && <Toast {...toast} onDone={() => setToast(null)} />}
    </View>
  );
}

const oh = StyleSheet.create({
  header:       { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  heading:      { fontSize: 17, fontWeight: "800", color: "#111" },
  totalBadge:   { backgroundColor: "#eff6ff", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  totalBadgeTxt:{ fontSize: 12, fontWeight: "700", color: "#1d4ed8" },
  emptyWrap:    { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyIcon:    { fontSize: 40, marginBottom: 12 },
  emptyTitle:   { fontSize: 15, fontWeight: "700", color: "#374151", marginBottom: 6 },
  emptySub:     { fontSize: 13, color: "#9ca3af", textAlign: "center", maxWidth: 240 },
});