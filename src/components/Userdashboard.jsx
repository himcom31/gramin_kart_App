// src/components/Userdashboard.jsx — React Native (Expo Router)
// Nav bar removed. All navigation lives inside the Account section.
// Back from any sub-page always returns to Dashboard.

import { useLocalSearchParams, useRouter } from "expo-router";


import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Dimensions,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Storage as store } from "../api/storage";
import { useAuth } from "../context/AuthContext"; // ← added

import ChangePasswordTab from "./ChangePasswordTab";
import OrderHistoryTab from "./Orderhistorytab";
import ProductCard from "./ProductCard";
import UserProfile from "./Userprofile";
import UserSupportTicket from "./Usersupportticket";

const { width: SW } = Dimensions.get("window");
const API_URL = process.env.EXPO_PUBLIC_API_URL;

// ─── Brand tokens ─────────────────────────────────────────────────────────────
const FK = {
  blue:       "#16a34a",
  blueDark:   "#13873d",
  blueLight:  "#E8F0FD",
  green:      "#388E3C",
  text:       "#212121",
  textSub:    "#878787",
  textLight:  "#BDBDBD",
  divider:    "#F0F0F0",
  bg:         "#F1F3F6",
  white:      "#FFFFFF",
  badge:      "#FB641B",
};

// ─── API ──────────────────────────────────────────────────────────────────────
const getToken = () => store.getItem("userToken");
const authHdr = async () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${await getToken()}`,
});
const apiFetch  = async (path)       => fetch(`${API_URL}${path}`, { headers: await authHdr() }).then(r => r.json());
const apiPost   = async (path, body) => fetch(`${API_URL}${path}`, { method: "POST",   headers: await authHdr(), body: JSON.stringify(body) }).then(r => r.json());
const apiPut    = async (path, body) => fetch(`${API_URL}${path}`, { method: "PUT",    headers: await authHdr(), body: JSON.stringify(body) }).then(r => r.json());
const apiDelete = async (path)       => fetch(`${API_URL}${path}`, { method: "DELETE", headers: await authHdr() }).then(r => r.json());
const apiPatch  = async (path)       => fetch(`${API_URL}${path}`, { method: "PATCH",  headers: await authHdr() }).then(r => r.json());

const fetchCart           = () => apiFetch("/api/cart");
const fetchWishlist       = () => apiFetch("/api/wishlist");
const fetchOrders         = () => apiFetch("/api/orders/my");
const fetchProfile        = () => apiFetch("/api/user/me");
const fetchAddresses      = () => apiFetch("/api/address");
const fetchRecentlyViewed = () => apiFetch("/api/user/recently-viewed").catch(() => ({ products: [] }));

const apiUpdateCartItem = (productId, qty) => apiPut(`/api/cart/update/${productId}`, { quantity: qty });
const apiRemoveFromCart = (productId)      => apiDelete(`/api/cart/remove/${productId}`);
const apiAddAddress     = (data)           => apiPost("/api/address", data);
const apiUpdateAddress  = (id, data)       => apiPut(`/api/address/${id}`, data);
const apiDeleteAddress  = (id)             => apiDelete(`/api/address/${id}`);
const apiSetDefault     = (id)             => apiPatch(`/api/address/${id}/set-default`);

// ─── Toast ────────────────────────────────────────────────────────────────────
const Toast = ({ message, type, onDone }) => {
  useEffect(() => { const t = setTimeout(onDone, 2800); return () => clearTimeout(t); }, []);
  return (
    <View style={[ts.wrap, { backgroundColor: type === "success" ? "#388E3C" : "#C62828" }]}>
      <Text style={ts.txt}>{message}</Text>
    </View>
  );
};
const ts = StyleSheet.create({
  wrap: {
    position: "absolute", bottom: 40, alignSelf: "center",
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 4,
    shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 8, elevation: 8, zIndex: 9999,
  },
  txt: { color: "#fff", fontSize: 13, fontWeight: "600" },
});

// ─── Sub-page header with back arrow (always goes to dashboard) ───────────────
const SubPageHeader = ({ title, onBack, topInset = 0 }) => (
  <View style={[sph.bar, { paddingTop: topInset + 14 }]}>
    <TouchableOpacity onPress={onBack} style={sph.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
      <Text style={sph.arrow}>←</Text>
    </TouchableOpacity>
    <Text style={sph.title}>{title}</Text>
  </View>
);
const sph = StyleSheet.create({
  bar:     { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 14, backgroundColor: FK.blue },
  backBtn: { width: 32, alignItems: "center" },
  arrow:   { fontSize: 22, color: FK.white },
  title:   { fontSize: 16, fontWeight: "700", color: FK.white, flex: 1 },
});

// ─── Section Header ───────────────────────────────────────────────────────────
const SectionHeader = ({ title, action, onAction }) => (
  <View style={sh.row}>
    <Text style={sh.title}>{title}</Text>
    {action && <TouchableOpacity onPress={onAction}><Text style={sh.action}>{action}</Text></TouchableOpacity>}
  </View>
);
const sh = StyleSheet.create({
  row:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  title:  { fontSize: 16, fontWeight: "700", color: FK.text },
  action: { fontSize: 13, fontWeight: "600", color: FK.blue },
});

// ─── Cart Item Row ────────────────────────────────────────────────────────────
const CartItemRow = ({ item, onQtyChange, onRemove }) => {
  const product  = item.product || item;
  const name     = product.name || "Product";
  const price    = Number(product.sellingPrice ?? product.discountPrice ?? product.price ?? 0);
  const oldPrice = Number(product.mrp ?? product.oldPrice ?? product.buyingPrice ?? 0);
  const image    = product.thumbnail || product.image || product.images?.[0];
  const discount = oldPrice > price ? Math.round((1 - price / oldPrice) * 100) : null;
  const qty      = item.quantity || 1;

  return (
    <View style={ci.row}>
      <View style={ci.imgWrap}>
        {image
          ? <Image source={{ uri: image }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
          : <Text style={{ fontSize: 22 }}>🛒</Text>}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={2} style={ci.name}>{name}</Text>
        <View style={ci.priceRow}>
          <Text style={ci.price}>₹{price.toFixed(2)}</Text>
          {oldPrice > price && <Text style={ci.oldPrice}>₹{oldPrice.toFixed(2)}</Text>}
          {discount && <Text style={ci.discTxt}>{discount}% off</Text>}
        </View>
      </View>
      <View style={ci.qtyGroup}>
        <TouchableOpacity onPress={() => qty > 1 ? onQtyChange(product.id, qty - 1) : onRemove(product.id)} style={ci.qtyBtn}>
          <Text style={ci.qtyBtnTxt}>−</Text>
        </TouchableOpacity>
        <Text style={ci.qty}>{qty}</Text>
        <TouchableOpacity onPress={() => onQtyChange(product.id, qty + 1)} style={ci.qtyBtn}>
          <Text style={ci.qtyBtnTxt}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
const ci = StyleSheet.create({
  row:       { flexDirection: "row", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: FK.divider, alignItems: "center" },
  imgWrap:   { width: 60, height: 60, borderRadius: 4, overflow: "hidden", backgroundColor: "#F9F9F9", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: FK.divider },
  name:      { fontSize: 13, fontWeight: "500", color: FK.text, lineHeight: 18 },
  priceRow:  { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4, flexWrap: "wrap" },
  price:     { fontSize: 14, fontWeight: "700", color: FK.text },
  oldPrice:  { fontSize: 11, color: FK.textSub, textDecorationLine: "line-through" },
  discTxt:   { fontSize: 12, fontWeight: "600", color: FK.green },
  qtyGroup:  { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: FK.textLight, borderRadius: 4, overflow: "hidden" },
  qtyBtn:    { width: 28, height: 28, alignItems: "center", justifyContent: "center", backgroundColor: FK.white },
  qtyBtnTxt: { fontSize: 18, color: FK.text, lineHeight: 22 },
  qty:       { width: 28, textAlign: "center", fontSize: 13, fontWeight: "600", color: FK.text, borderLeftWidth: 1, borderRightWidth: 1, borderColor: FK.textLight, paddingVertical: 4 },
});

// ─── Address Form Modal ───────────────────────────────────────────────────────
const EMPTY_FORM = { name: "", phone: "", altPhone: "", pincode: "", state: "", city: "", house: "", road: "", landmark: "", type: "Home", isDefault: false };

const AddressFormModal = ({ initial, onSave, onClose, saving }) => {
  const [form,     setForm]     = useState(initial || EMPTY_FORM);
  const [errors,   setErrors]   = useState({});
  const [locating, setLocating] = useState(false);

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const validate = () => {
    const e = {};
    if (!form.name.trim())    e.name    = "Full name is required";
    if (!form.phone.trim())   e.phone   = "Phone is required";
    if (!form.pincode.trim()) e.pincode = "Pincode is required";
    if (!form.state.trim())   e.state   = "State is required";
    if (!form.city.trim())    e.city    = "City is required";
    if (!form.house.trim())   e.house   = "House/Building is required";
    if (!form.road.trim())    e.road    = "Road/Area is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const useMyLocation = async () => {
    setLocating(true);
    try {
      const res  = await fetch("https://ipapi.co/json/");
      const data = await res.json();
      setForm(f => ({
        ...f,
        pincode: data.postal || f.pincode,
        state:   data.region || f.state,
        city:    data.city   || f.city,
      }));
    } catch {}
    finally { setLocating(false); }
  };

  const inp = (err) => [af.input, err && { borderColor: "#C62828" }];

  return (
    <Modal visible animationType="slide" transparent>
      <View style={af.overlay}>
        <View style={af.sheet}>
          <View style={af.header}>
            <TouchableOpacity onPress={onClose} style={af.backBtn}>
              <Text style={{ fontSize: 20, color: FK.white }}>←</Text>
            </TouchableOpacity>
            <Text style={af.headerTxt}>{initial ? "Edit Address" : "Add New Address"}</Text>
          </View>
          <ScrollView contentContainerStyle={af.body} showsVerticalScrollIndicator={false}>
            <Text style={af.lbl}>Full Name <Text style={{ color: "#C62828" }}>*</Text></Text>
            <TextInput value={form.name} onChangeText={v => set("name", v)} placeholder="Full Name" placeholderTextColor={FK.textLight} style={inp(errors.name)} />
            {!!errors.name && <Text style={af.err}>{errors.name}</Text>}

            <Text style={[af.lbl, { marginTop: 14 }]}>Phone <Text style={{ color: "#C62828" }}>*</Text></Text>
            <TextInput value={form.phone} onChangeText={v => set("phone", v)} placeholder="10-digit mobile number" keyboardType="phone-pad" placeholderTextColor={FK.textLight} style={inp(errors.phone)} />
            {!!errors.phone && <Text style={af.err}>{errors.phone}</Text>}

            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              <View style={{ flex: 1 }}>
                <Text style={af.lbl}>Pincode <Text style={{ color: "#C62828" }}>*</Text></Text>
                <TextInput value={form.pincode} onChangeText={v => set("pincode", v)} placeholder="6-digit pincode" keyboardType="numeric" placeholderTextColor={FK.textLight} style={inp(errors.pincode)} />
                {!!errors.pincode && <Text style={af.err}>{errors.pincode}</Text>}
              </View>
              <View style={{ flex: 1, justifyContent: "flex-end" }}>
                <TouchableOpacity onPress={useMyLocation} disabled={locating} style={af.locBtn}>
                  {locating
                    ? <ActivityIndicator color={FK.blue} size="small" />
                    : <Text style={af.locBtnTxt}>📍 Use My Location</Text>}
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              <View style={{ flex: 1 }}>
                <Text style={af.lbl}>State <Text style={{ color: "#C62828" }}>*</Text></Text>
                <TextInput value={form.state} onChangeText={v => set("state", v)} placeholder="State" placeholderTextColor={FK.textLight} style={inp(errors.state)} />
                {!!errors.state && <Text style={af.err}>{errors.state}</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={af.lbl}>City / District <Text style={{ color: "#C62828" }}>*</Text></Text>
                <TextInput value={form.city} onChangeText={v => set("city", v)} placeholder="City" placeholderTextColor={FK.textLight} style={inp(errors.city)} />
                {!!errors.city && <Text style={af.err}>{errors.city}</Text>}
              </View>
            </View>

            <Text style={[af.lbl, { marginTop: 14 }]}>Flat, House No., Building <Text style={{ color: "#C62828" }}>*</Text></Text>
            <TextInput value={form.house} onChangeText={v => set("house", v)} placeholder="House No., Building Name" placeholderTextColor={FK.textLight} style={inp(errors.house)} />
            {!!errors.house && <Text style={af.err}>{errors.house}</Text>}

            <Text style={[af.lbl, { marginTop: 14 }]}>Area, Colony, Street <Text style={{ color: "#C62828" }}>*</Text></Text>
            <TextInput value={form.road} onChangeText={v => set("road", v)} placeholder="Road name, Area, Colony" placeholderTextColor={FK.textLight} style={inp(errors.road)} />
            {!!errors.road && <Text style={af.err}>{errors.road}</Text>}

            <Text style={[af.lbl, { marginTop: 14 }]}>Landmark <Text style={{ color: FK.textSub }}>(optional)</Text></Text>
            <TextInput value={form.landmark} onChangeText={v => set("landmark", v)} placeholder="E.g. near Apollo Hospital" placeholderTextColor={FK.textLight} style={af.input} />

            <Text style={[af.lbl, { marginTop: 18 }]}>Address Type</Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              {["Home", "Work", "Other"].map(t => (
                <TouchableOpacity key={t} onPress={() => set("type", t)}
                  style={[af.typeBtn, form.type === t && af.typeBtnActive]}>
                  <Text style={{ fontSize: 16 }}>{t === "Home" ? "🏠" : t === "Work" ? "💼" : "📍"}</Text>
                  <Text style={[af.typeTxt, form.type === t && { color: FK.blue, fontWeight: "700" }]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity onPress={() => set("isDefault", !form.isDefault)} style={af.checkRow}>
              <View style={[af.checkbox, form.isDefault && af.checkboxOn]}>
                {form.isDefault && <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>✓</Text>}
              </View>
              <Text style={af.checkLbl}>Make this my default address</Text>
            </TouchableOpacity>
          </ScrollView>
          <View style={af.footer}>
            <TouchableOpacity onPress={() => { if (validate()) onSave(form); }} disabled={saving} style={af.saveBtn}>
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={af.saveBtnTxt}>SAVE ADDRESS</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
const af = StyleSheet.create({
  overlay:       { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  sheet:         { backgroundColor: FK.white, maxHeight: "95%" },
  header:        { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: FK.blue },
  backBtn:       { width: 30, alignItems: "center" },
  headerTxt:     { fontSize: 16, fontWeight: "700", color: FK.white },
  body:          { padding: 16, paddingBottom: 8 },
  footer:        { padding: 16, borderTopWidth: 1, borderTopColor: FK.divider },
  lbl:           { fontSize: 12, fontWeight: "600", color: FK.textSub, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 },
  input:         { borderWidth: 1, borderColor: "#D0D0D0", borderRadius: 4, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: FK.text, backgroundColor: FK.white },
  err:           { fontSize: 11, color: "#C62828", marginTop: 3 },
  locBtn:        { borderWidth: 1.5, borderColor: FK.blue, borderRadius: 4, paddingVertical: 10, alignItems: "center", justifyContent: "center" },
  locBtnTxt:     { color: FK.blue, fontSize: 12, fontWeight: "700" },
  typeBtn:       { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 9, borderWidth: 1.5, borderColor: "#D0D0D0", borderRadius: 4, backgroundColor: FK.white },
  typeBtnActive: { borderColor: FK.blue, backgroundColor: FK.blueLight },
  typeTxt:       { fontSize: 12, fontWeight: "600", color: FK.textSub },
  checkRow:      { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 16, marginBottom: 8 },
  checkbox:      { width: 18, height: 18, borderRadius: 3, borderWidth: 2, borderColor: "#D0D0D0", alignItems: "center", justifyContent: "center" },
  checkboxOn:    { backgroundColor: FK.blue, borderColor: FK.blue },
  checkLbl:      { fontSize: 14, color: FK.text },
  saveBtn:       { backgroundColor: FK.badge, borderRadius: 4, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  saveBtnTxt:    { color: "#fff", fontSize: 14, fontWeight: "800", letterSpacing: 1 },
});

// ─── Address Card ─────────────────────────────────────────────────────────────
const AddressCard = ({ addr, onEdit, onDelete, onSetDefault, deletingId, settingDefaultId }) => {
  const fullAddr = [addr.house, addr.road, addr.landmark, addr.city, addr.state, addr.pincode].filter(Boolean).join(", ");
  const emoji    = addr.type === "Home" ? "🏠" : addr.type === "Work" ? "💼" : "📍";
  return (
    <View style={[ac.card, addr.isDefault && ac.cardDefault]}>
      <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
        <Text style={{ fontSize: 22, marginTop: 2 }}>{emoji}</Text>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
            <Text style={ac.name}>{addr.name}</Text>
            <View style={[ac.typeBadge, addr.isDefault && ac.typeBadgeDefault]}>
              <Text style={ac.typeBadgeTxt}>{addr.type?.toUpperCase() || "HOME"}</Text>
            </View>
            {addr.isDefault && <Text style={ac.defaultLbl}>DEFAULT</Text>}
          </View>
          <Text style={ac.phone}>{addr.phone}{addr.altPhone ? `, ${addr.altPhone}` : ""}</Text>
          <Text style={ac.addr} numberOfLines={2}>{fullAddr}</Text>
          <View style={ac.actions}>
            <TouchableOpacity onPress={() => onEdit(addr)} style={ac.actionBtn}>
              <Text style={ac.actionBtnTxt}>EDIT</Text>
            </TouchableOpacity>
            <View style={ac.actionDivider} />
            <TouchableOpacity onPress={() => onDelete(addr.id)} disabled={deletingId === addr.id} style={ac.actionBtn}>
              {deletingId === addr.id
                ? <ActivityIndicator color={FK.blue} size="small" />
                : <Text style={ac.actionBtnTxt}>REMOVE</Text>}
            </TouchableOpacity>
            {!addr.isDefault && (
              <>
                <View style={ac.actionDivider} />
                <TouchableOpacity onPress={() => onSetDefault(addr.id)} disabled={settingDefaultId === addr.id} style={ac.actionBtn}>
                  {settingDefaultId === addr.id
                    ? <ActivityIndicator color={FK.blue} size="small" />
                    : <Text style={ac.actionBtnTxt}>SET DEFAULT</Text>}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    </View>
  );
};
const ac = StyleSheet.create({
  card:             { backgroundColor: FK.white, borderWidth: 1, borderColor: FK.divider, borderRadius: 4, padding: 14, marginBottom: 10 },
  cardDefault:      { borderColor: FK.blue, borderWidth: 1.5 },
  name:             { fontSize: 14, fontWeight: "700", color: FK.text },
  typeBadge:        { backgroundColor: FK.textSub, borderRadius: 3, paddingHorizontal: 7, paddingVertical: 2 },
  typeBadgeDefault: { backgroundColor: FK.blue },
  typeBadgeTxt:     { color: "#fff", fontSize: 10, fontWeight: "700" },
  defaultLbl:       { fontSize: 11, fontWeight: "700", color: FK.blue },
  phone:            { fontSize: 13, color: FK.textSub, marginBottom: 3 },
  addr:             { fontSize: 13, color: FK.text, lineHeight: 19 },
  actions:          { flexDirection: "row", alignItems: "center", marginTop: 10 },
  actionBtn:        { paddingHorizontal: 10, paddingVertical: 4 },
  actionBtnTxt:     { fontSize: 12, fontWeight: "700", color: FK.blue },
  actionDivider:    { width: 1, height: 16, backgroundColor: FK.divider },
});

// ─── Account Menu Card ────────────────────────────────────────────────────────
const ACCOUNT_MENU_ITEMS = [
  { id: "orders",   label: "My Orders",       sub: "Track, return or buy again",       emoji: "📦" },
  { id: "wishlist", label: "My Wishlist",      sub: "Products you saved for later",     emoji: "♡"  },
  { id: "profile",  label: "Edit Profile",     sub: "Name, email and personal details", emoji: "👤" },
  { id: "address",  label: "Manage Addresses", sub: "Add or edit delivery addresses",   emoji: "📍" },
  { id: "password", label: "Change Password",  sub: "Update your login password",       emoji: "🔒" },
  { id: "support",  label: "Help & Support",   sub: "Raise a ticket or get help",       emoji: "🎧" },
];

const AccountMenuCard = ({ profile, navigateTo, onLogout, wishCount, orderCount }) => {
  const badges = { orders: orderCount, wishlist: wishCount };
  return (
    <View style={amc.card}>
      {/* Profile strip */}
      <View style={amc.profileRow}>
        <View style={amc.avatar}>
          {profile?.avatar
            ? <Image source={{ uri: profile.avatar }} style={{ width: "100%", height: "100%" }} />
            : <Text style={{ fontSize: 26 }}>👤</Text>}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={amc.name} numberOfLines={1}>{profile?.name || profile?.fullName || "Customer"}</Text>
          <Text style={amc.phone}>{profile?.phone || profile?.phoneNumber || ""}</Text>
        </View>
        <TouchableOpacity onPress={() => navigateTo("profile")} style={amc.editProfileBtn}>
          <Text style={amc.editProfileTxt}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      <View style={amc.divider} />

      {/* Navigation rows */}
      {ACCOUNT_MENU_ITEMS.map((item, idx) => {
        const badge  = badges[item.id] || 0;
        const isLast = idx === ACCOUNT_MENU_ITEMS.length - 1;
        return (
          <TouchableOpacity
            key={item.id}
            onPress={() => navigateTo(item.id)}
            style={[amc.row, !isLast && amc.rowBorder]}>
            <View style={amc.rowIcon}>
              <Text style={{ fontSize: 18 }}>{item.emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={amc.rowLabel}>{item.label}</Text>
                {badge > 0 && (
                  <View style={amc.badge}>
                    <Text style={amc.badgeTxt}>{badge > 99 ? "99+" : badge}</Text>
                  </View>
                )}
              </View>
              <Text style={amc.rowSub}>{item.sub}</Text>
            </View>
            <Text style={{ color: FK.textLight, fontSize: 18 }}>›</Text>
          </TouchableOpacity>
        );
      })}

      <View style={amc.divider} />
      <TouchableOpacity onPress={onLogout} style={amc.logoutRow}>
        <Text style={{ fontSize: 18 }}>🚪</Text>
        <Text style={amc.logoutTxt}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};
const amc = StyleSheet.create({
  card:           { backgroundColor: FK.white, marginBottom: 8 },
  profileRow:     { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  avatar:         { width: 54, height: 54, borderRadius: 27, backgroundColor: FK.blueLight, overflow: "hidden", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#C5D8FB" },
  name:           { fontSize: 15, fontWeight: "700", color: FK.text },
  phone:          { fontSize: 12, color: FK.textSub, marginTop: 2 },
  editProfileBtn: { borderWidth: 1.5, borderColor: FK.blue, borderRadius: 4, paddingHorizontal: 12, paddingVertical: 5 },
  editProfileTxt: { fontSize: 12, fontWeight: "700", color: FK.blue },
  divider:        { height: 1, backgroundColor: FK.divider },
  row:            { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 14 },
  rowBorder:      { borderBottomWidth: 1, borderBottomColor: FK.divider },
  rowIcon:        { width: 40, height: 40, borderRadius: 20, backgroundColor: FK.bg, alignItems: "center", justifyContent: "center" },
  rowLabel:       { fontSize: 14, fontWeight: "600", color: FK.text },
  rowSub:         { fontSize: 12, color: FK.textSub, marginTop: 2 },
  badge:          { backgroundColor: FK.badge, borderRadius: 99, minWidth: 18, height: 18, paddingHorizontal: 5, alignItems: "center", justifyContent: "center" },
  badgeTxt:       { color: FK.white, fontSize: 10, fontWeight: "800" },
  logoutRow:      { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 14 },
  logoutTxt:      { fontSize: 14, fontWeight: "600", color: "#C62828" },
});

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
export default function UserDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { logout } = useAuth(); // ← pulled from context

  // ✅ Yeh add karo
const { tab: initialTab } = useLocalSearchParams();

// ✅ useState ko yeh karo
const [activeTab, setActiveTab] = useState(initialTab || "dashboard");

  const [activeTab,        setActiveTab]        = useState("dashboard");
  const [profile,          setProfile]          = useState(null);
  const [cartData,         setCartData]         = useState({ items: [] });
  const [wishlistData,     setWishlistData]     = useState({ products: [] });
  const [ordersData,       setOrdersData]       = useState([]);
  const [recentViewed,     setRecentViewed]     = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [cartTotal,        setCartTotal]        = useState(0);
  const [toast,            setToast]            = useState(null);
  const [addresses,        setAddresses]        = useState([]);
  const [addrLoading,      setAddrLoading]      = useState(false);
  const [showAddrModal,    setShowAddrModal]    = useState(false);
  const [editingAddr,      setEditingAddr]      = useState(null);
  const [savingAddr,       setSavingAddr]       = useState(false);
  const [deletingAddrId,   setDeletingAddrId]   = useState(null);
  const [settingDefaultId, setSettingDefaultId] = useState(null);

  const navigateTo = (tab) => setActiveTab(tab);

  const goBack = useCallback(() => {
    setActiveTab("dashboard");
    return true;
  }, []);

  // Android hardware back — return to dashboard when on a sub-page
  useEffect(() => {
    if (activeTab === "dashboard") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", goBack);
    return () => sub.remove();
  }, [activeTab, goBack]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [cart, wish, orders, prof, addrs] = await Promise.allSettled([
        fetchCart(), fetchWishlist(), fetchOrders(), fetchProfile(), fetchAddresses(),
      ]);
      if (cart.status   === "fulfilled") setCartData(cart.value);
      if (wish.status   === "fulfilled") setWishlistData(wish.value);
      if (orders.status === "fulfilled") setOrdersData(Array.isArray(orders.value) ? orders.value : orders.value?.orders || []);
      if (prof.status   === "fulfilled") setProfile(prof.value?.user || prof.value);
      if (addrs.status  === "fulfilled") setAddresses(addrs.value?.addresses || []);
      try { const rv = await fetchRecentlyViewed(); setRecentViewed(rv?.products || []); } catch {}
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    if (activeTab === "address") {
      setAddrLoading(true);
      fetchAddresses()
        .then(d => setAddresses(d?.addresses || []))
        .catch(() => {})
        .finally(() => setAddrLoading(false));
    }
  }, [activeTab]);

  useEffect(() => {
    const items = cartData?.items || [];
    setCartTotal(items.reduce((sum, item) => {
      const p = item.product || item;
      return sum + (Number(p.sellingPrice ?? p.price ?? p.buyingPrice ?? 0)) * (item.quantity || 1);
    }, 0));
  }, [cartData]);

  const cartItems    = cartData?.items || [];
  const cartCount    = cartItems.reduce((s, i) => s + (i.quantity || 1), 0);
  const wishProducts = wishlistData?.products || [];
  const wishCount    = wishProducts.length;
  const orderCount   = ordersData.length;
  const ongoingCount = ordersData.filter(o => ["pending", "processing", "shipped"].includes(o.status?.toLowerCase())).length;
  const defaultAddr  = addresses.find(a => a.isDefault) || addresses[0] || null;

  // ── Logout ───────────────────────────────────────────────────────────────────
  // Calls context logout() which clears storage + sets userToken to null.
  // RouteGuard in _layout.jsx detects the null token and redirects to /login.
  // No router.replace() needed here.
  const handleLogout = () => {
    logout();
  };

  const handleSaveAddress = async (formData) => {
    setSavingAddr(true);
    try {
      const res = editingAddr?.id
        ? await apiUpdateAddress(editingAddr.id, formData)
        : await apiAddAddress(formData);
      if (res?.success) {
        setAddresses(res.addresses || []);
        setShowAddrModal(false);
        setEditingAddr(null);
        setToast({ message: editingAddr?.id ? "Address updated!" : "Address saved!", type: "success" });
      } else {
        setToast({ message: res?.message || "Failed to save", type: "error" });
      }
    } catch {
      setToast({ message: "Something went wrong", type: "error" });
    } finally {
      setSavingAddr(false);
    }
  };

  const handleDeleteAddress = async (id) => {
    setDeletingAddrId(id);
    try {
      const res = await apiDeleteAddress(id);
      if (res?.success) {
        setAddresses(res.addresses || []);
        setToast({ message: "Address removed", type: "success" });
      }
    } catch {}
    finally { setDeletingAddrId(null); }
  };

  const handleSetDefault = async (id) => {
    setSettingDefaultId(id);
    try {
      const res = await apiSetDefault(id);
      if (res?.success) {
        setAddresses(res.addresses || []);
        setToast({ message: "Default address updated", type: "success" });
      }
    } catch {}
    finally { setSettingDefaultId(null); }
  };

  // ── Sub-pages ────────────────────────────────────────────────────────────────
if (activeTab === "cart") return (
  <SafeAreaView style={{ flex: 1, backgroundColor: FK.blue }}>
    <SubPageHeader title="My Cart" onBack={goBack} topInset={insets.top} />
    <ScrollView style={{ backgroundColor: FK.bg }} contentContainerStyle={{ padding: 12, paddingBottom: 30 }}>
      {cartItems.length === 0
        ? (
          <View style={empty.wrap}>
            <Text style={empty.icon}>🛒</Text>
            <Text style={empty.title}>Your cart is empty!</Text>
            <Text style={empty.sub}>Add items to get started.</Text>
            <TouchableOpacity onPress={() => router.push("/products")} style={empty.btn}>
              <Text style={empty.btnTxt}>BROWSE PRODUCTS</Text>
            </TouchableOpacity>
          </View>
        )
        : (
          <>
            {cartItems.map((item, i) => (
              <CartItemRow key={item.id || i} item={item}
                onQtyChange={async (id, qty) => setCartData(await apiUpdateCartItem(id, qty))}
                onRemove={async (id) => setCartData(await apiRemoveFromCart(id))} />
            ))}
            <View style={[dash.cartFooter, { marginTop: 16, backgroundColor: FK.white, padding: 14, borderRadius: 4 }]}>
              <View>
                <Text style={{ fontSize: 11, color: FK.textSub }}>Total Amount</Text>
                <Text style={{ fontSize: 18, fontWeight: "800", color: FK.text }}>₹{cartTotal.toFixed(2)}</Text>
              </View>
              <TouchableOpacity onPress={() => router.push("/checkout")} style={dash.checkoutBtn}>
                <Text style={dash.checkoutBtnTxt}>PLACE ORDER</Text>
              </TouchableOpacity>
            </View>
          </>
        )
      }
    </ScrollView>
    {toast && <Toast {...toast} onDone={() => setToast(null)} />}
  </SafeAreaView>
);
  if (activeTab === "orders") return (
    <SafeAreaView style={{ flex: 1, backgroundColor: FK.blue }}>
      <SubPageHeader title="My Orders" onBack={goBack} topInset={insets.top} />
      <View style={{ flex: 1, backgroundColor: FK.bg }}>
        <OrderHistoryTab onBack={goBack} />
      </View>
    </SafeAreaView>
  );

  if (activeTab === "wishlist") return (
    <SafeAreaView style={{ flex: 1, backgroundColor: FK.blue }}>
      <SubPageHeader title="My Wishlist" onBack={goBack} topInset={insets.top} />
      <ScrollView style={{ backgroundColor: FK.bg }} contentContainerStyle={{ padding: 12, paddingBottom: 30 }}>
        {loading && <ActivityIndicator color={FK.blue} size="large" style={{ marginTop: 40 }} />}
        {!loading && wishCount === 0 && (
          <View style={empty.wrap}>
            <Text style={empty.icon}>♡</Text>
            <Text style={empty.title}>Your Wishlist is empty!</Text>
            <Text style={empty.sub}>Save items you love for later.</Text>
            <TouchableOpacity onPress={() => router.push("/products")} style={empty.btn}>
              <Text style={empty.btnTxt}>CONTINUE SHOPPING</Text>
            </TouchableOpacity>
          </View>
        )}
        {!loading && wishCount > 0 && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {wishProducts.map(prod => (
              <View key={prod.id} style={{ width: (SW - 34) / 2 }}>
                <ProductCard
                  product={prod}
                  onUnwish={(id) => setWishlistData(prev => ({ ...prev, products: prev.products.filter(p => p.id !== id) }))}
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );

  if (activeTab === "profile") return (
    <SafeAreaView style={{ flex: 1, backgroundColor: FK.blue }}>
      <SubPageHeader title="Edit Profile" onBack={goBack} topInset={insets.top} />
      <View style={{ flex: 1, backgroundColor: FK.bg }}>
        <UserProfile onBack={goBack} />
      </View>
    </SafeAreaView>
  );

  if (activeTab === "password") return (
    <SafeAreaView style={{ flex: 1, backgroundColor: FK.blue }}>
      <SubPageHeader title="Change Password" onBack={goBack} topInset={insets.top} />
      <View style={{ flex: 1, backgroundColor: FK.bg }}>
        <ChangePasswordTab onToast={setToast} onBack={goBack} />
      </View>
    </SafeAreaView>
  );

  if (activeTab === "support") return (
    <SafeAreaView style={{ flex: 1, backgroundColor: FK.blue }}>
      <SubPageHeader title="Help & Support" onBack={goBack} topInset={insets.top} />
      <View style={{ flex: 1, backgroundColor: FK.bg }}>
        <UserSupportTicket onBack={goBack} />
      </View>
    </SafeAreaView>
  );

  if (activeTab === "address") return (
    <SafeAreaView style={{ flex: 1, backgroundColor: FK.blue }}>
      <SubPageHeader title="Manage Addresses" onBack={goBack} topInset={insets.top} />
      <ScrollView style={{ backgroundColor: FK.bg }} contentContainerStyle={{ padding: 12, paddingBottom: 30 }}>
        {addrLoading
          ? <ActivityIndicator color={FK.blue} size="large" style={{ marginTop: 40 }} />
          : addresses.length === 0
            ? (
              <View style={empty.wrap}>
                <Text style={empty.icon}>📍</Text>
                <Text style={empty.title}>No saved addresses</Text>
                <Text style={empty.sub}>Add an address to speed up checkout.</Text>
              </View>
            )
            : addresses.map(addr => (
              <AddressCard key={addr.id} addr={addr}
                onEdit={a => { setEditingAddr(a); setShowAddrModal(true); }}
                onDelete={handleDeleteAddress}
                onSetDefault={handleSetDefault}
                deletingId={deletingAddrId}
                settingDefaultId={settingDefaultId} />
            ))
        }
        <TouchableOpacity
          onPress={() => { setEditingAddr(null); setShowAddrModal(true); }}
          style={dash.addAddrBtn}>
          <Text style={dash.addAddrBtnTxt}>+ ADD NEW ADDRESS</Text>
        </TouchableOpacity>
      </ScrollView>
      {showAddrModal && (
        <AddressFormModal
          initial={editingAddr ? { ...editingAddr } : undefined}
          onSave={handleSaveAddress}
          onClose={() => { setShowAddrModal(false); setEditingAddr(null); }}
          saving={savingAddr} />
      )}
      {toast && <Toast {...toast} onDone={() => setToast(null)} />}
    </SafeAreaView>
  );

  // ── Dashboard (home) ─────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: FK.blue }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 30 }} style={{ backgroundColor: FK.bg }}>

        {/* Blue member banner */}
        <View style={[dash.memberBanner, { paddingTop: insets.top + 14 }]}>
          <View style={{ flex: 1 }}>
            <Text style={dash.memberName} numberOfLines={1}>
              {loading ? "Loading…" : profile?.name || profile?.fullName || "Welcome back!"}
            </Text>
            <Text style={dash.memberTier}>⚡ GraminKart Member</Text>
          </View>
          <View style={dash.memberAvatarWrap}>
            {profile?.avatar
              ? <Image source={{ uri: profile.avatar }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
              : <Text style={{ fontSize: 30 }}>🛒</Text>}
          </View>
        </View>

        {/* Branding strip */}
        <View style={dash.brandStrip}>
          <Text style={dash.brandLogo}>🌿 GraminKart</Text>
          <Text style={dash.brandTagline}>Your rural marketplace</Text>
        </View>

        {/* Cart Summary */}
        {/* Cart Summary */}
<View style={dash.section}>
  <SectionHeader title="My Cart" />
  {loading
    ? <View style={{ height: 48, backgroundColor: FK.divider, borderRadius: 4 }} />
    : cartItems.length === 0
      ? (
        <TouchableOpacity style={dash.addAddrInline} onPress={() => router.push("/products")}>
          <Text style={{ color: FK.blue, fontWeight: "700", fontSize: 13 }}>🛒  Browse Products to add items</Text>
        </TouchableOpacity>
      )
      : (
        <TouchableOpacity style={dash.cartPreview} onPress={() => navigateTo("cart")} activeOpacity={0.8}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
            <Text style={{ fontSize: 28 }}>🛒</Text>
            <View>
              <Text style={{ fontSize: 14, fontWeight: "700", color: FK.text }}>
                {cartCount} item{cartCount !== 1 ? "s" : ""} in cart
              </Text>
              <Text style={{ fontSize: 13, color: FK.textSub, marginTop: 2 }}>
                Total: <Text style={{ fontWeight: "800", color: FK.text }}>₹{cartTotal.toFixed(2)}</Text>
              </Text>
            </View>
          </View>
          <Text style={{ color: FK.blue, fontSize: 22, marginRight: 4 }}>›</Text>
        </TouchableOpacity>
      )
  }
</View>

        {/* Default Address */}
        <View style={dash.section}>
          <SectionHeader
            title="Default Delivery Address"
            action="Manage →"
            onAction={() => navigateTo("address")} />
          {loading
            ? <View style={{ height: 48, backgroundColor: FK.divider, borderRadius: 4 }} />
            : defaultAddr
              ? (
                <View style={dash.addrPreview}>
                  <Text style={{ fontSize: 18, marginRight: 10 }}>
                    {defaultAddr.type === "Home" ? "🏠" : defaultAddr.type === "Work" ? "💼" : "📍"}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: "700", color: FK.text }}>
                      {defaultAddr.name}
                      <Text style={{ fontWeight: "400", color: FK.textSub }}> · {defaultAddr.phone}</Text>
                    </Text>
                    <Text style={{ fontSize: 12, color: FK.textSub, lineHeight: 18, marginTop: 2 }} numberOfLines={2}>
                      {[defaultAddr.house, defaultAddr.road, defaultAddr.city, defaultAddr.state, defaultAddr.pincode].filter(Boolean).join(", ")}
                    </Text>
                  </View>
                </View>
              )
              : (
                <TouchableOpacity style={dash.addAddrInline} onPress={() => navigateTo("address")}>
                  <Text style={{ color: FK.blue, fontWeight: "700", fontSize: 13 }}>+ Add Delivery Address</Text>
                </TouchableOpacity>
              )
          }
        </View>

        {/* Recently Viewed */}
        <View style={dash.section}>
          <SectionHeader title="Recently Viewed" />
          {loading
            ? <ActivityIndicator color={FK.blue} />
            : recentViewed.length === 0
              ? <Text style={{ fontSize: 13, color: FK.textSub, paddingVertical: 10 }}>No recently viewed products.</Text>
              : recentViewed.map((p, i) => {
                  const price = Number(p.sellingPrice ?? p.price ?? 0);
                  const img   = p.thumbnail || p.image || p.images?.[0];
                  return (
                    <TouchableOpacity key={p.id || i} style={dash.rvRow} onPress={() => router.push(`/product/${p.id}`)}>
                      <View style={dash.rvImg}>
                        {img
                          ? <Image source={{ uri: img }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                          : <Text style={{ fontSize: 22 }}>📦</Text>}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text numberOfLines={2} style={{ fontSize: 13, color: FK.text, lineHeight: 18 }}>{p.name}</Text>
                        <Text style={{ fontSize: 14, fontWeight: "700", color: FK.text, marginTop: 4 }}>₹{price.toFixed(2)}</Text>
                      </View>
                      <Text style={{ color: FK.textLight, fontSize: 18 }}>›</Text>
                    </TouchableOpacity>
                  );
                })
          }
        </View>

        {/* My Account */}
        <View style={[dash.section, { paddingBottom: 0 }]}>
          <SectionHeader title="My Account" />
        </View>
        <AccountMenuCard
          profile={profile}
          navigateTo={navigateTo}
          onLogout={handleLogout}
          wishCount={wishCount}
          orderCount={ongoingCount}
        />

      </ScrollView>

      {toast && <Toast {...toast} onDone={() => setToast(null)} />}
    </SafeAreaView>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
const empty = StyleSheet.create({
  wrap:    { alignItems: "center", paddingVertical: 50 },
  rowWrap: { flexDirection: "row", gap: 14, alignItems: "center", paddingVertical: 16 },
  icon:    { fontSize: 44, marginBottom: 10 },
  title:   { fontSize: 17, fontWeight: "700", color: FK.text, marginBottom: 6 },
  sub:     { fontSize: 13, color: FK.textSub, textAlign: "center" },
  btn:     { marginTop: 20, borderWidth: 1.5, borderColor: FK.blue, paddingHorizontal: 28, paddingVertical: 10, borderRadius: 4 },
  btnTxt:  { color: FK.blue, fontWeight: "700", fontSize: 13, letterSpacing: 0.5 },
});

// ─── Dashboard styles ─────────────────────────────────────────────────────────
const dash = StyleSheet.create({
  memberBanner:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 14, paddingBottom: 18, backgroundColor: FK.blue },
  memberName:       { fontSize: 16, fontWeight: "700", color: FK.white, maxWidth: SW * 0.55 },
  memberTier:       { fontSize: 13, color: "rgba(255,255,255,0.85)", fontWeight: "500", marginTop: 2 },
  memberAvatarWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(255,255,255,0.15)", overflow: "hidden", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "rgba(255,255,255,0.3)" },
  brandStrip:       { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 10, backgroundColor: FK.white, borderBottomWidth: 1, borderBottomColor: FK.divider, marginBottom: 8 },
  brandLogo:        { fontSize: 18, fontWeight: "900", color: FK.blue, letterSpacing: 0.3 },
  brandTagline:     { fontSize: 12, color: FK.textSub, fontStyle: "italic" },
  section:          { backgroundColor: FK.white, padding: 14, marginBottom: 8 },
  cartFooter:       { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: FK.divider },
  checkoutBtn:      { backgroundColor: FK.badge, paddingHorizontal: 24, paddingVertical: 11, borderRadius: 4 },
  checkoutBtnTxt:   { color: "#fff", fontSize: 13, fontWeight: "800", letterSpacing: 0.8 },
  addrPreview:      { flexDirection: "row", alignItems: "flex-start", padding: 12, backgroundColor: FK.blueLight, borderRadius: 4, borderWidth: 1, borderColor: "#c5fbd0" },
  addAddrInline:    { paddingVertical: 12, alignItems: "center", borderWidth: 1.5, borderColor: FK.blue, borderRadius: 4, borderStyle: "dashed" },
  addAddrBtn:       { marginTop: 14, borderWidth: 1.5, borderColor: FK.blue, borderStyle: "dashed", borderRadius: 4, paddingVertical: 13, alignItems: "center" },
  addAddrBtnTxt:    { color: FK.blue, fontSize: 14, fontWeight: "700", letterSpacing: 0.5 },
  rvRow:            { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: FK.divider },
  rvImg:            { width: 58, height: 58, borderRadius: 4, backgroundColor: "#F9F9F9", overflow: "hidden", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: FK.divider },
  cartPreview: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  padding: 12,
  backgroundColor: FK.blueLight,
  borderRadius: 4,
  borderWidth: 1,
  borderColor: "#c5fbd0",
},
});