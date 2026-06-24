// components/UserProfile.jsx  — React Native (Expo Router)

import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Storage as store } from "../api/storage";

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const API_BASE = `${API_URL}/api/user`;

const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Argentina", "Australia", "Austria", "Bangladesh",
  "Belgium", "Brazil", "Canada", "Chile", "China", "Colombia", "Croatia", "Czech Republic",
  "Denmark", "Egypt", "Ethiopia", "Finland", "France", "Germany", "Ghana", "Greece", "Hungary",
  "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Japan", "Jordan",
  "Kenya", "Malaysia", "Mexico", "Morocco", "Netherlands", "New Zealand", "Nigeria", "Norway",
  "Pakistan", "Peru", "Philippines", "Poland", "Portugal", "Romania", "Russia", "Saudi Arabia",
  "South Africa", "South Korea", "Spain", "Sri Lanka", "Sweden", "Switzerland", "Thailand",
  "Turkey", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Vietnam",
];

const GENDERS = ["Male", "Female", "Other", "Prefer not to say"];

// ─── Toast ────────────────────────────────────────────────────────────────────
const Toast = ({ msg, type }) => {
  if (!msg) return null;
  return (
    <View style={[ts.wrap, { backgroundColor: type === "error" ? "#ef4444" : "#16a34a" }]}>
      <Text style={ts.txt}>{msg}</Text>
    </View>
  );
};
const ts = StyleSheet.create({
  wrap: {
    position: "absolute", bottom: 24, alignSelf: "center",
    paddingHorizontal: 22, paddingVertical: 12,
    borderRadius: 40, zIndex: 9999,
    shadowColor: "#000", shadowOpacity: 0.22, shadowRadius: 8, elevation: 8,
  },
  txt: { color: "#fff", fontSize: 13, fontWeight: "600" },
});

// ─── Modal-based Select ───────────────────────────────────────────────────────
const SelectField = ({ value, placeholder, options, onChange }) => {
  const [visible, setVisible] = useState(false);
  const label = value || placeholder;

  return (
    <>
      <TouchableOpacity
        style={[s.input, s.selectTrigger]}
        onPress={() => setVisible(true)}
        activeOpacity={0.75}
      >
        <Text style={{ color: value ? "#1e293b" : "#9ca3af", fontSize: 14, flex: 1 }}>
          {label}
        </Text>
        <Text style={{ color: "#64748b", fontSize: 12 }}>▾</Text>
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <TouchableOpacity
          style={sm.overlay}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        />
        <View style={sm.sheet}>
          <View style={sm.handle} />
          <FlatList
            data={options}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[sm.option, item === value && sm.optionSelected]}
                onPress={() => { onChange(item); setVisible(false); }}
              >
                <Text style={[sm.optionTxt, item === value && sm.optionTxtSelected]}>
                  {item}
                </Text>
                {item === value && <Text style={{ color: "#16a34a", fontSize: 16 }}>✓</Text>}
              </TouchableOpacity>
            )}
            style={{ maxHeight: 360 }}
            showsVerticalScrollIndicator={false}
          />
          <TouchableOpacity style={sm.cancelBtn} onPress={() => setVisible(false)}>
            <Text style={sm.cancelTxt}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
};

const sm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: {
    backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 24,
    shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 20, elevation: 20,
  },
  handle: {
    width: 40, height: 4, backgroundColor: "#e2e8f0",
    borderRadius: 4, alignSelf: "center", marginBottom: 12,
  },
  option: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 14, paddingHorizontal: 6,
    borderBottomWidth: 1, borderBottomColor: "#f1f5f9",
  },
  optionSelected: { backgroundColor: "#f0fdf4" },
  optionTxt: { fontSize: 14, color: "#1e293b" },
  optionTxtSelected: { fontWeight: "700", color: "#16a34a" },
  cancelBtn: {
    marginTop: 10, backgroundColor: "#f1f5f9",
    borderRadius: 10, paddingVertical: 13, alignItems: "center",
  },
  cancelTxt: { fontSize: 14, fontWeight: "600", color: "#64748b" },
});

// ─── Field wrapper ────────────────────────────────────────────────────────────
const Field = ({ label, children }) => (
  <View style={{ marginBottom: 14 }}>
    <Text style={s.fieldLabel}>{label}</Text>
    {children}
  </View>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export default function UserProfile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ msg: "", type: "success" });
  const [localImg, setLocalImg] = useState(null); // ← restored

  const [form, setForm] = useState({
    fullName: "", country: "", phone: "", gender: "",
    dateOfBirth: "", email: "", avatar: "",
  });

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "success" }), 3000);
  };

  // ── Load profile ────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const token = await store.getItem("userToken");
        const res = await fetch(`${API_BASE}/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) {
          const u = data.user;
          setForm({
            fullName: u.fullName || "",
            country: u.country || "",
            phone: u.phone || "",
            gender: u.gender || "",
            dateOfBirth: u.dateOfBirth ? u.dateOfBirth.slice(0, 10) : "",
            email: u.email || "",
            avatar: u.avatar || "",
          });
        }
      } catch {
        showToast("Failed to load profile", "error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Pick image via expo-image-picker ────────────────────────────────────────
  const pickImage = async () => {
    try {
      const { status: existingStatus } = await ImagePicker.getMediaLibraryPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        showToast("Gallery permission is required to change photo", "error");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],   // ← updated, MediaTypeOptions is deprecated
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setLocalImg(result.assets[0].uri);
      }
    } catch (e) {
      console.error("Image picker error:", e);
      showToast("Image picker unavailable", "error");
    }
  };

  // ── Save profile ────────────────────────────────────────────────────────────
  const handleSave = async () => {
  setSaving(true);
  try {
    const token = await store.getItem("userToken");

    if (!token) {
      showToast("Token missing", "error");
      setSaving(false);
      return;
    }

    const fd = new FormData();
    fd.append("fullName",    form.fullName);
    fd.append("country",     form.country);
    fd.append("phone",       form.phone);
    fd.append("gender",      form.gender);
    fd.append("dateOfBirth", form.dateOfBirth);

    if (localImg) {
      const filename = localImg.split("/").pop();
      const match = /\.(\w+)$/.exec(filename);
      const ext  = match ? match[1].toLowerCase() : "jpeg";
      const type = ext === "heic" ? "image/jpeg" : `image/${ext}`;
      const name = ext === "heic" ? "photo.jpg" : filename;

      // ✅ Image info toast mein dikhao
      showToast(`IMG: ${name} | ${type}`, "success");
      await new Promise(r => setTimeout(r, 2500));

      fd.append("image", { uri: localImg, name, type });
    } else {
      showToast("No image selected", "error");
      await new Promise(r => setTimeout(r, 2500));
    }

    // ✅ URL check
    showToast(`URL: ${API_BASE}/update-profile`, "success");
    await new Promise(r => setTimeout(r, 2500));

    const res = await fetch(`${API_BASE}/update-profile`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      body: fd,
    });

    // ✅ Raw response dikhao
    const rawText = await res.text();
    showToast(`STATUS:${res.status} | ${rawText.slice(0, 60)}`, res.ok ? "success" : "error");

  } catch (e) {
    // ✅ Exact error dikhao
    showToast(`ERR: ${e.message}`, "error");
  } finally {
    setSaving(false);
  }
};

  const initials = form.fullName
    ? form.fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : "U";
  const avatarUri = localImg || form.avatar || null; // local preview takes priority

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#16a34a" size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.headerRow}>
          <View>
            <Text style={s.heading}>My Profile</Text>
            <Text style={s.subheading}>Manage your personal information</Text>
          </View>
          <View style={s.verifiedBadge}>
            <Text style={s.verifiedTxt}>✓ Verified</Text>
          </View>
        </View>

        {/* Avatar Card */}
        <View style={s.card}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>

            <TouchableOpacity onPress={pickImage} activeOpacity={0.8}>
              <View style={{ position: "relative" }}>
                <View style={s.avatarRing}>
                  {avatarUri
                    ? <Image source={{ uri: avatarUri }} style={s.avatarImg} />
                    : <Text style={s.avatarInitials}>{initials}</Text>}
                </View>
                <View style={s.cameraOverlay}>
                  <Text style={{ fontSize: 12 }}>📷</Text>
                </View>
              </View>
            </TouchableOpacity>

            <View style={{ flex: 1 }}>
              <Text style={s.avatarName} numberOfLines={1}>{form.fullName || "Your Name"}</Text>
              <Text style={s.avatarEmail} numberOfLines={1}>{form.email || "email@example.com"}</Text>
              <TouchableOpacity onPress={pickImage} style={s.changePhotoBtn}>
                <Text style={s.changePhotoTxt}>📷 Change Photo</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Form Card */}
        <View style={s.card}>
          <Text style={s.sectionLabel}>PERSONAL INFORMATION</Text>

          <Field label="Full Name">
            <TextInput
              value={form.fullName}
              onChangeText={v => setForm(f => ({ ...f, fullName: v }))}
              placeholder="Enter full name"
              placeholderTextColor="#9ca3af"
              style={s.input}
            />
          </Field>

          <Field label="Country">
            <SelectField
              value={form.country}
              placeholder="Select Country"
              options={COUNTRIES}
              onChange={v => setForm(f => ({ ...f, country: v }))}
            />
          </Field>

          <Field label="Mobile Number">
            <View style={[s.input, { flexDirection: "row", alignItems: "center", padding: 0 }]}>
              <View style={s.phonePrefix}>
                <Text style={{ color: "#64748b", fontSize: 13 }}>+91</Text>
              </View>
              <TextInput
                value={form.phone}
                onChangeText={v => setForm(f => ({ ...f, phone: v }))}
                placeholder="Mobile number"
                keyboardType="phone-pad"
                placeholderTextColor="#9ca3af"
                style={[s.input, { flex: 1, borderWidth: 0 }]}
              />
            </View>
          </Field>

          <Field label="Gender">
            <SelectField
              value={form.gender}
              placeholder="Select Gender"
              options={GENDERS}
              onChange={v => setForm(f => ({ ...f, gender: v }))}
            />
          </Field>

          <Field label="Date of Birth">
            <TextInput
              value={form.dateOfBirth}
              onChangeText={v => setForm(f => ({ ...f, dateOfBirth: v }))}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9ca3af"
              style={s.input}
            />
          </Field>

          <Field label="Email Address (read-only)">
            <TextInput
              value={form.email}
              editable={false}
              style={[s.input, { backgroundColor: "#f8fafc", color: "#94a3b8" }]}
            />
          </Field>

          {/* Save */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            style={[s.saveBtn, saving && { backgroundColor: "#86efac" }]}
          >
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.saveBtnTxt}>✓ Update Profile</Text>}
          </TouchableOpacity>
        </View>

      </ScrollView>

      <Toast msg={toast.msg} type={toast.type} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16, gap: 10 },
  heading: { fontSize: 22, fontWeight: "700", color: "#0f172a" },
  subheading: { fontSize: 13, color: "#64748b", marginTop: 4 },
  verifiedBadge: { backgroundColor: "#f0fdf4", borderWidth: 1.5, borderColor: "#bbf7d0", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  verifiedTxt: { fontSize: 11, fontWeight: "700", color: "#16a34a" },
  card: {
    backgroundColor: "#fff", borderRadius: 16, padding: 20, marginBottom: 12,
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 16, elevation: 3,
  },
  avatarRing: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 3, borderColor: "#4ade80",
    alignItems: "center", justifyContent: "center",
    backgroundColor: "#f0fdf4",
  },
  avatarImg: { width: "100%", height: "100%", borderRadius: 40, overflow: "hidden", },
  avatarInitials: { fontSize: 24, fontWeight: "700", color: "#16a34a" },
  avatarName: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  avatarEmail: { fontSize: 12, color: "#64748b", marginTop: 2 },
  cameraOverlay: {
    position: "absolute", bottom: 0, right: 0,
    backgroundColor: "#fff", borderRadius: 10,
    width: 22, height: 22, alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 4, elevation: 3,
  },
  changePhotoBtn: {
    marginTop: 10, backgroundColor: "#0f172a", borderRadius: 9,
    paddingHorizontal: 14, paddingVertical: 8, alignSelf: "flex-start",
  },
  changePhotoTxt: { color: "#fff", fontSize: 12, fontWeight: "600" },
  sectionLabel: { fontSize: 11, fontWeight: "700", color: "#16a34a", letterSpacing: 1, marginBottom: 16 },
  fieldLabel: { fontSize: 11, fontWeight: "700", color: "#64748b", letterSpacing: 0.5, marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: "#e2e8f0", borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: "#1e293b", backgroundColor: "#fff",
  },
  selectTrigger: { flexDirection: "row", alignItems: "center" },
  phonePrefix: {
    paddingHorizontal: 10, paddingVertical: 12,
    backgroundColor: "#f1f5f9",
    borderRightWidth: 1, borderRightColor: "#e2e8f0",
    justifyContent: "center",
  },
  saveBtn: { backgroundColor: "#22c55e", borderRadius: 10, paddingVertical: 14, alignItems: "center", justifyContent: "center", marginTop: 20 },
  saveBtnTxt: { color: "#fff", fontSize: 14, fontWeight: "700" },
});