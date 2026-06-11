// components/ChangePasswordTab.jsx  — React Native (Expo Router)

import { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text, TextInput, TouchableOpacity,
  View,
} from "react-native";
import { Storage as store } from "../api/storage";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

// ─── Password strength ────────────────────────────────────────────────────────
const getStrength = (val) => {
  if (!val) return null;
  let score = 0;
  if (val.length >= 6)            score++;
  if (val.length >= 10)           score++;
  if (/[A-Z]/.test(val))          score++;
  if (/[0-9]/.test(val))          score++;
  if (/[^A-Za-z0-9]/.test(val))   score++;
  if (score <= 1) return { label: "Weak",   color: "#ef4444", pct: 0.25 };
  if (score <= 2) return { label: "Fair",   color: "#f59e0b", pct: 0.50 };
  if (score <= 3) return { label: "Good",   color: "#3b82f6", pct: 0.75 };
  return            { label: "Strong", color: "#16a34a", pct: 1.00 };
};

// ─── Single password field ────────────────────────────────────────────────────
const PasswordField = ({ label, value, onChange, error, showStrength }) => {
  const [show, setShow] = useState(false);
  const strength = showStrength ? getStrength(value) : null;

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={s.label}>{label}</Text>
      <View style={[s.inputWrap, error && { borderColor: "#ef4444" }]}>
        <TextInput
          value={value}
          onChangeText={onChange}
          secureTextEntry={!show}
          placeholder={`Enter ${label}`}
          placeholderTextColor="#9ca3af"
          style={s.input}
        />
        <TouchableOpacity onPress={() => setShow(v => !v)} style={s.eyeBtn}>
          <Text style={{ fontSize: 16 }}>{show ? "🙈" : "👁"}</Text>
        </TouchableOpacity>
      </View>

      {strength && (
        <View style={{ marginTop: 6 }}>
          <View style={s.strengthBar}>
            <View style={[s.strengthFill, { width: `${strength.pct * 100}%`, backgroundColor: strength.color }]} />
          </View>
          <Text style={[s.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
        </View>
      )}

      {!!error && <Text style={s.errTxt}>{error}</Text>}
    </View>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ChangePasswordTab({ onToast }) {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (field, val) => {
    setForm(f => ({ ...f, [field]: val }));
    if (errors[field]) setErrors(e => ({ ...e, [field]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!form.currentPassword) e.currentPassword = "Current password is required";
    if (!form.newPassword) e.newPassword = "New password is required";
    else if (form.newPassword.length < 6) e.newPassword = "Minimum 6 characters";
    else if (form.newPassword === form.currentPassword) e.newPassword = "Must differ from current";
    if (!form.confirmPassword) e.confirmPassword = "Please confirm your password";
    else if (form.confirmPassword !== form.newPassword) e.confirmPassword = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const token = await store.getItem("userToken");
      const res   = await fetch(`${API_URL}/api/user/change-password`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ currentPassword: form.currentPassword, newPassword: form.newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        onToast?.({ message: "Password updated successfully!", type: "success" });
        setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
        setErrors({});
      } else {
        if (data.message?.toLowerCase().includes("current")) {
          setErrors({ currentPassword: data.message });
        } else {
          onToast?.({ message: data.message || "Failed to update", type: "error" });
        }
      }
    } catch {
      onToast?.({ message: "Network error. Please try again.", type: "error" });
    } finally { setSaving(false); }
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
      <Text style={s.heading}>Change Password</Text>

      <View style={s.card}>
        <Text style={s.cardTitle}>Update your password</Text>

        <PasswordField
          label="Current Password"
          value={form.currentPassword}
          onChange={v => set("currentPassword", v)}
          error={errors.currentPassword}
        />
        <PasswordField
          label="New Password"
          value={form.newPassword}
          onChange={v => set("newPassword", v)}
          error={errors.newPassword}
          showStrength
        />
        <PasswordField
          label="Confirm New Password"
          value={form.confirmPassword}
          onChange={v => set("confirmPassword", v)}
          error={errors.confirmPassword}
        />

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={saving}
          style={[s.btn, saving && { backgroundColor: "#15803d" }]}
        >
          {saving
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={s.btnTxt}>Update Password</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  heading:   { fontSize: 20, fontWeight: "800", color: "#111", marginBottom: 16 },
  card: {
    backgroundColor: "#fff", borderRadius: 16,
    padding: 20, borderWidth: 1, borderColor: "#f0f0f0",
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 12, elevation: 2,
  },
  cardTitle: { fontSize: 14, fontWeight: "700", color: "#374151", marginBottom: 20,
               paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  label:    { fontSize: 13, fontWeight: "700", color: "#374151", marginBottom: 8 },
  inputWrap: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1.5, borderColor: "#e5e7eb", borderRadius: 10,
    backgroundColor: "#fff", paddingHorizontal: 14,
  },
  input:    { flex: 1, fontSize: 14, color: "#111", paddingVertical: 12 },
  eyeBtn:   { padding: 6 },
  strengthBar: { height: 4, backgroundColor: "#f3f4f6", borderRadius: 99, overflow: "hidden" },
  strengthFill: { height: "100%", borderRadius: 99 },
  strengthLabel: { fontSize: 11, fontWeight: "700", marginTop: 3 },
  errTxt:   { fontSize: 12, color: "#ef4444", marginTop: 5 },
  btn: {
    marginTop: 24, backgroundColor: "#16a34a", borderRadius: 10,
    paddingVertical: 14, alignItems: "center", justifyContent: "center",
  },
  btnTxt: { color: "#fff", fontSize: 14, fontWeight: "700" },
});