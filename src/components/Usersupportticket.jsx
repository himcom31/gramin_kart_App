// components/UserSupportTicket.jsx  — React Native (Expo Router)

// ❌ REMOVED: import * as DocumentPicker from "expo-document-picker";
import { useEffect, useState } from "react";
import {
  ActivityIndicator, Modal, Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Storage as store } from "../api/storage";

const API_URL    = process.env.EXPO_PUBLIC_API_URL;
const API_BASE   = `${API_URL}/api/support`;
const ISSUE_API  = `${API_URL}/api/ticket`;
const ORDER_API  = `${API_URL}/api/orders/my`;

const getToken = () => store.getItem("userToken");

const authHdr = async () => ({ Authorization: `Bearer ${await getToken()}` });
const jsonHdr = async () => ({
  "Content-Type": "application/json",
  Authorization:  `Bearer ${await getToken()}`,
});

const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

// ─── Status Badge ─────────────────────────────────────────────────────────────
const STATUS_STYLE = {
  Pending:   { bg: "#fef9c3", color: "#b45309" },
  Confirm:   { bg: "#ede9fe", color: "#7c3aed" },
  Completed: { bg: "#dcfce7", color: "#16a34a" },
  Cancel:    { bg: "#fee2e2", color: "#dc2626" },
};
const StatusBadge = ({ status }) => {
  const s = STATUS_STYLE[status] || { bg: "#f3f4f6", color: "#6b7280" };
  return (
    <View style={[st.badge, { backgroundColor: s.bg }]}>
      <Text style={[st.badgeTxt, { color: s.color }]}>{status}</Text>
    </View>
  );
};

// ─── Spinner ──────────────────────────────────────────────────────────────────
const Spinner = ({ color = "#fff" }) => <ActivityIndicator color={color} size="small" />;

// ─── Simple Picker Modal (replaces <select>) ──────────────────────────────────
const PickerModal = ({ label, options, value, onSelect, placeholder }) => {
  const [open, setOpen] = useState(false);
  const display = options.find(o => (o.value ?? o) === value)?.label ?? value ?? placeholder ?? `Select ${label}`;
  return (
    <>
      <TouchableOpacity onPress={() => setOpen(true)} style={st.pickerBtn}>
        <Text style={[st.pickerTxt, !value && { color: "#9ca3af" }]}>{display}</Text>
        <Text style={{ color: "#9ca3af" }}>▾</Text>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="slide">
        <View style={st.pickerOverlay}>
          <View style={st.pickerSheet}>
            <View style={st.pickerHandle} />
            <Text style={st.pickerHeading}>Select {label}</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {options.map((opt, i) => {
                const v = opt.value ?? opt;
                const l = opt.label ?? opt;
                return (
                  <TouchableOpacity key={i} onPress={() => { onSelect(v, opt); setOpen(false); }}
                    style={[st.pickerItem, v === value && { backgroundColor: "#f0fdf4" }]}>
                    <Text style={[st.pickerItemTxt, v === value && { color: "#16a34a", fontWeight: "700" }]}>{l}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity onPress={() => setOpen(false)} style={st.pickerCancel}>
              <Text style={st.pickerCancelTxt}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

// ─── Create Ticket Modal ──────────────────────────────────────────────────────
const CreateTicketModal = ({ onClose, onCreated }) => {
  const [orders,     setOrders]     = useState([]);
  const [issueTypes, setIssueTypes] = useState([]);
  const [form, setForm] = useState({
    orderNumber: "", issueType: "", issueTypeName: "",
    subject: "", message: "", email: "", phone: "",
    includeEmail: true, includePhone: false,
  });
  const [file,   setFile]   = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const h = await authHdr();
      const [ordRes, issRes] = await Promise.all([
        fetch(ORDER_API, { headers: h }).then(r => r.json()).catch(() => ({})),
        fetch(ISSUE_API, { headers: h }).then(r => r.json()).catch(() => ({})),
      ]);
      setOrders(Array.isArray(ordRes) ? ordRes : ordRes.orders || []);
      setIssueTypes((issRes.types || []).filter(t => t.status));
    })();
  }, []);

  const set = (field, val) => {
    setForm(f => ({ ...f, [field]: val }));
    if (errors[field]) setErrors(e => ({ ...e, [field]: "" }));
  };

  // ── Pick file — lazy import so native module isn't touched at startup ────
  const pickFile = async () => {
    try {
      const DocumentPicker = await import("expo-document-picker");
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/jpeg", "image/png", "application/pdf"],
        copyToCacheDirectory: true,
      });
      if (!result.canceled) setFile(result.assets[0]);
    } catch (err) {
      console.warn("Document picker unavailable:", err);
    }
  };

  const validate = () => {
    const e = {};
    if (!form.issueType)       e.issueType = "Issue type is required";
    if (!form.subject.trim())  e.subject   = "Subject is required";
    if (!form.message.trim())  e.message   = "Message is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const token = await getToken();
      const fd    = new FormData();
      fd.append("orderNumber",   form.orderNumber);
      fd.append("issueType",     form.issueType);
      fd.append("issueTypeName", form.issueTypeName);
      fd.append("subject",       form.subject);
      fd.append("message",       form.message);
      if (form.includeEmail) fd.append("email", form.email);
      if (form.includePhone) fd.append("phone", form.phone);
      if (file) fd.append("attachment", { uri: file.uri, name: file.name, type: file.mimeType });

      const res  = await fetch(API_BASE, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
      const data = await res.json();
      if (data.success) { onCreated(data.ticket); onClose(); }
      else setErrors({ submit: data.message || "Failed to create ticket" });
    } catch {
      setErrors({ submit: "Network error. Please try again." });
    } finally { setSaving(false); }
  };

  const orderOptions = orders.map(o => ({
    value: o.orderNumber || o.id,
    label: o.orderNumber || `#${String(o.id).slice(-6).toUpperCase()}`,
  }));
  const issueOptions = issueTypes.map(t => ({ value: t.id, label: t.name }));

  return (
    <Modal visible animationType="slide" transparent>
      <View style={cm.overlay}>
        <View style={cm.sheet}>
          {/* Header */}
          <View style={cm.header}>
            <Text style={cm.headerTxt}>Create Support Ticket</Text>
            <TouchableOpacity onPress={onClose} style={cm.closeBtn}>
              <Text style={{ fontSize: 18, color: "#374151" }}>×</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={cm.body} showsVerticalScrollIndicator={false}>
            {/* Order + Issue Type */}
            <View style={cm.row}>
              <View style={{ flex: 1 }}>
                <Text style={cm.lbl}>Order Number</Text>
                <PickerModal label="Order" options={orderOptions}
                  value={form.orderNumber} placeholder="Select order"
                  onSelect={v => set("orderNumber", v)} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={cm.lbl}>Issue Type <Text style={{ color: "#ef4444" }}>*</Text></Text>
                <PickerModal label="Issue Type" options={issueOptions}
                  value={form.issueType} placeholder="Select issue"
                  onSelect={(v, opt) => { set("issueType", v); set("issueTypeName", opt?.label || ""); }} />
                {!!errors.issueType && <Text style={cm.err}>{errors.issueType}</Text>}
              </View>
            </View>

            {/* Subject */}
            <View style={{ marginBottom: 16 }}>
              <Text style={cm.lbl}>Subject</Text>
              <TextInput
                value={form.subject} onChangeText={v => set("subject", v)}
                placeholder="Enter subject" placeholderTextColor="#9ca3af"
                style={[cm.input, errors.subject && { borderColor: "#ef4444" }]} />
              {!!errors.subject && <Text style={cm.err}>{errors.subject}</Text>}
            </View>

            {/* Message */}
            <View style={{ marginBottom: 16 }}>
              <Text style={cm.lbl}>Message <Text style={{ color: "#ef4444" }}>*</Text></Text>
              <TextInput
                value={form.message} onChangeText={v => set("message", v)}
                placeholder="Write your message..." placeholderTextColor="#9ca3af"
                multiline numberOfLines={5}
                style={[cm.input, cm.textarea, errors.message && { borderColor: "#ef4444" }]} />
              {!!errors.message && <Text style={cm.err}>{errors.message}</Text>}
            </View>

            {/* File Attachment */}
            <View style={{ marginBottom: 16 }}>
              <Text style={cm.lbl}>File Attachment <Text style={{ color: "#9ca3af", fontSize: 11 }}>(jpg, png, pdf)</Text></Text>
              <TouchableOpacity onPress={pickFile} style={cm.fileZone}>
                <Text style={{ fontSize: 20 }}>📎</Text>
                {file
                  ? <Text style={cm.fileTxt} numberOfLines={1}>{file.name}</Text>
                  : <Text style={cm.fileHint}>Tap to pick a file</Text>}
              </TouchableOpacity>
            </View>

            {/* Contact Info */}
            <Text style={[cm.lbl, { fontSize: 14, fontWeight: "800", color: "#111", marginBottom: 10 }]}>Contact Info</Text>
            <View style={cm.row}>
              {[["includeEmail", "email", "Email", "email-address"],
                ["includePhone", "phone", "Phone", "phone-pad"]].map(([tog, field, label, kbType]) => (
                <View key={field} style={{ flex: 1 }}>
                  <TouchableOpacity onPress={() => set(tog, !form[tog])} style={cm.checkRow}>
                    <View style={[cm.checkbox, form[tog] && cm.checkboxOn]}>
                      {form[tog] && <Text style={{ color: "#fff", fontSize: 10 }}>✓</Text>}
                    </View>
                    <Text style={cm.checkLbl}>{label}</Text>
                  </TouchableOpacity>
                  <TextInput
                    value={form[field]} onChangeText={v => set(field, v)}
                    placeholder={`Enter ${label}`} placeholderTextColor="#9ca3af"
                    keyboardType={kbType} editable={form[tog]}
                    style={[cm.input, !form[tog] && { opacity: 0.5 }]} />
                </View>
              ))}
            </View>

            {!!errors.submit && (
              <View style={cm.submitErr}>
                <Text style={{ fontSize: 13, color: "#ef4444" }}>{errors.submit}</Text>
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={cm.footer}>
            <TouchableOpacity onPress={handleSubmit} disabled={saving} style={cm.submitBtn}>
              {saving ? <Spinner /> : <Text style={cm.submitTxt}>Submit Ticket</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function UserSupportTicket() {
  const [activeTab,  setActiveTab]  = useState("Running");
  const [tickets,    setTickets]    = useState([]);
  const [counts,     setCounts]     = useState({ running: 0, completed: 0, cancel: 0 });
  const [loading,    setLoading]    = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const loadCounts = async () => {
    try {
      const h    = await authHdr();
      const res  = await fetch(`${API_BASE}/my/counts`, { headers: h });
      const data = await res.json();
      if (data.success) setCounts(data.counts);
    } catch {}
  };

  const loadTickets = async (tab) => {
    setLoading(true);
    try {
      const h    = await authHdr();
      const res  = await fetch(`${API_BASE}/my?tab=${tab}`, { headers: h });
      const data = await res.json();
      if (data.success) setTickets(data.tickets);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { loadCounts(); loadTickets(activeTab); }, [activeTab]);

  const handleCreated = () => { loadCounts(); loadTickets(activeTab); };

  const tabs = [
    { key: "Running",   label: "Running",   count: counts.running   },
    { key: "Completed", label: "Completed", count: counts.completed },
    { key: "Cancel",    label: "Cancel",    count: counts.cancel    },
  ];

  return (
    <View style={st.container}>
      {/* Header */}
      <View style={st.header}>
        <Text style={st.heading}>Support Ticket</Text>
        <TouchableOpacity onPress={() => setShowCreate(true)} style={st.createBtn}>
          <Text style={st.createBtnTxt}>+ Create Ticket</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.tabBar} contentContainerStyle={{ gap: 0 }}>
        {tabs.map(tab => (
          <TouchableOpacity key={tab.key} onPress={() => setActiveTab(tab.key)} style={[st.tab, activeTab === tab.key && st.tabActive]}>
            <Text style={[st.tabTxt, activeTab === tab.key && st.tabTxtActive]}>
              {tab.label} ({tab.count})
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        {loading
          ? [1, 2].map(i => (
              <View key={i} style={[st.ticketCard, { opacity: 0.5 }]}>
                <View style={{ height: 12, width: "40%", backgroundColor: "#f0f0f0", borderRadius: 4, marginBottom: 10 }} />
                <View style={{ height: 10, width: "70%", backgroundColor: "#f0f0f0", borderRadius: 4 }} />
              </View>
            ))
          : tickets.length === 0
            ? (
              <View style={st.emptyWrap}>
                <Text style={{ fontSize: 40, marginBottom: 12 }}>🎫</Text>
                <Text style={st.emptyTitle}>No {activeTab.toLowerCase()} tickets</Text>
                <Text style={st.emptyMsg}>
                  {activeTab === "Running" ? "Tap Create Ticket to raise a support request." : "Nothing here yet."}
                </Text>
              </View>
            )
            : tickets.map(ticket => (
              <View key={ticket.id} style={st.ticketCard}>
                <View style={st.ticketTop}>
                  <Text style={st.ticketDate}>{fmtDate(ticket.createdAt)}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={st.ticketNum}>#{ticket.ticketNumber}</Text>
                    <StatusBadge status={ticket.status} />
                  </View>
                </View>
                <View style={st.ticketRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={st.ticketMeta}>Order Number</Text>
                    <Text style={st.ticketVal}>{ticket.orderNumber || "—"}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.ticketMeta}>Issue Type</Text>
                    <Text style={st.ticketVal}>{ticket.issueTypeName || "—"}</Text>
                  </View>
                </View>
                <View style={{ marginTop: 6 }}>
                  <Text style={st.ticketMeta}>Subject</Text>
                  <Text style={st.ticketVal} numberOfLines={1}>{ticket.subject}</Text>
                </View>
              </View>
            ))
        }
      </ScrollView>

      {showCreate && (
        <CreateTicketModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: 16, paddingBottom: 8,
  },
  heading:    { fontSize: 20, fontWeight: "800", color: "#111" },
  createBtn:  {
    backgroundColor: "#16a34a", paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 10,
    shadowColor: "#16a34a", shadowOpacity: 0.3, shadowRadius: 8, elevation: 3,
  },
  createBtnTxt: { color: "#fff", fontSize: 13, fontWeight: "700" },
  tabBar:     { borderBottomWidth: 2, borderBottomColor: "#e5e7eb", paddingHorizontal: 8, flexGrow: 0 },
  tab:        { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 2.5, borderBottomColor: "transparent" },
  tabActive:  { borderBottomColor: "#16a34a" },
  tabTxt:     { fontSize: 13, fontWeight: "500", color: "#6b7280" },
  tabTxtActive: { fontWeight: "700", color: "#16a34a" },
  emptyWrap:  { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: "#374151" },
  emptyMsg:   { fontSize: 13, color: "#9ca3af", marginTop: 6, textAlign: "center" },
  ticketCard: {
    backgroundColor: "#fff", borderRadius: 12, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: "#e5e7eb",
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  ticketTop:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  ticketDate: { fontSize: 12, color: "#6b7280" },
  ticketNum:  { fontSize: 13, fontWeight: "700", color: "#6366f1" },
  ticketRow:  { flexDirection: "row", gap: 16 },
  ticketMeta: { fontSize: 11, color: "#9ca3af", marginBottom: 3 },
  ticketVal:  { fontSize: 13, fontWeight: "700", color: "#111" },
  badge:      { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeTxt:   { fontSize: 11, fontWeight: "700" },
  // Picker modal
  pickerBtn:  {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderWidth: 1.5, borderColor: "#e5e7eb", borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 11, backgroundColor: "#fff",
  },
  pickerTxt:  { fontSize: 13, color: "#111", flex: 1 },
  pickerOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  pickerSheet: {
    backgroundColor: "#fff", borderRadius: 20, padding: 20,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
  },
  pickerHandle: { width: 40, height: 4, backgroundColor: "#e5e7eb", borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  pickerHeading: { fontSize: 16, fontWeight: "700", color: "#111", marginBottom: 12 },
  pickerItem: { paddingVertical: 13, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  pickerItemTxt: { fontSize: 14, color: "#374151" },
  pickerCancel: {
    marginTop: 12, paddingVertical: 12, backgroundColor: "#f3f4f6",
    borderRadius: 10, alignItems: "center",
  },
  pickerCancelTxt: { fontSize: 14, fontWeight: "600", color: "#374151" },
});

const cm = StyleSheet.create({
  overlay:  { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
  sheet:    { backgroundColor: "#fff", borderRadius: 20, maxHeight: "95%", flex: 0 },
  header:   {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: 20, borderBottomWidth: 1, borderBottomColor: "#f0f0f0",
  },
  headerTxt: { fontSize: 17, fontWeight: "800", color: "#111" },
  closeBtn:  { width: 32, height: 32, borderRadius: 16, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" },
  body:      { padding: 20, paddingBottom: 8 },
  footer:    { padding: 20, paddingTop: 0 },
  row:       { flexDirection: "row", gap: 12, marginBottom: 16 },
  lbl:       { fontSize: 12, fontWeight: "600", color: "#374151", marginBottom: 7 },
  input: {
    borderWidth: 1.5, borderColor: "#e5e7eb", borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 11,
    fontSize: 13, color: "#111", backgroundColor: "#fff",
  },
  textarea:  { minHeight: 110, textAlignVertical: "top" },
  err:       { fontSize: 11, color: "#ef4444", marginTop: 4 },
  fileZone: {
    borderWidth: 2, borderColor: "#d1fae5", borderStyle: "dashed",
    borderRadius: 10, paddingVertical: 24, alignItems: "center", gap: 6,
    backgroundColor: "#fafff8",
  },
  fileTxt:   { fontSize: 12, color: "#374151", fontWeight: "600", maxWidth: 200 },
  fileHint:  { fontSize: 13, color: "#16a34a", fontWeight: "600" },
  checkRow:  { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  checkbox:  {
    width: 16, height: 16, borderRadius: 4, borderWidth: 1.5, borderColor: "#e5e7eb",
    alignItems: "center", justifyContent: "center",
  },
  checkboxOn: { backgroundColor: "#16a34a", borderColor: "#16a34a" },
  checkLbl:   { fontSize: 12, fontWeight: "600", color: "#374151" },
  submitErr: {
    backgroundColor: "#fef2f2", paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 8, borderWidth: 1, borderColor: "#fca5a5", marginBottom: 12,
  },
  submitBtn: {
    backgroundColor: "#16a34a", borderRadius: 10,
    paddingVertical: 14, alignItems: "center", justifyContent: "center",
  },
  submitTxt: { color: "#fff", fontSize: 14, fontWeight: "800" },
});