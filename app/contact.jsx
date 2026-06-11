// app/contact.jsx
// ─────────────────────────────────────────────────────────────────────────────
// ContactUs — React Native (Expo Router)
// Fix: top bar no longer hidden behind status bar — uses insets.top manually
// ─────────────────────────────────────────────────────────────────────────────

import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ── EmailJS credentials ───────────────────────────────────────────────────────
const EMAILJS_SERVICE_ID  = 'YOUR_SERVICE_ID';
const EMAILJS_TEMPLATE_ID = 'YOUR_TEMPLATE_ID';
const EMAILJS_PUBLIC_KEY  = 'YOUR_PUBLIC_KEY';

const IS_DEMO =
  EMAILJS_SERVICE_ID  === 'YOUR_SERVICE_ID' ||
  EMAILJS_PUBLIC_KEY  === 'YOUR_PUBLIC_KEY';

async function sendEmailJS(params) {
  const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id:      EMAILJS_SERVICE_ID,
      template_id:     EMAILJS_TEMPLATE_ID,
      user_id:         EMAILJS_PUBLIC_KEY,
      template_params: params,
    }),
  });
  if (!res.ok) throw new Error(`EmailJS error: ${res.status}`);
}

// ─── Agent illustration ───────────────────────────────────────────────────────
function AgentIllustration() {
  return (
    <View style={il.wrap}>
      <View style={il.circleBg1} />
      <View style={il.circleBg2} />

      <View style={il.avatarOuter}>
        <View style={il.head}>
          <View style={il.hair} />
          <View style={il.face}>
            <View style={il.eyeRow}>
              <View style={il.eye}><View style={il.pupil} /></View>
              <View style={il.eye}><View style={il.pupil} /></View>
            </View>
            <View style={il.smile} />
          </View>
          <View style={il.headsetBand} />
          <View style={[il.earCup, { left: -8 }]} />
          <View style={[il.earCup, { right: -8 }]} />
        </View>
        <View style={il.body}>
          <View style={il.shirtDots}>
            <View style={il.dot} />
            <View style={il.dot} />
            <View style={il.dot} />
          </View>
        </View>
      </View>

      <View style={il.desk}>
        <View style={il.notebook} />
        <View style={il.deskSquare} />
      </View>
      <View style={il.micDot} />
    </View>
  );
}

const il = StyleSheet.create({
  wrap:       { width: '100%', height: 220, borderRadius: 20, overflow: 'hidden', backgroundColor: '#e8f5e9', alignItems: 'center', justifyContent: 'center' },
  circleBg1:  { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.4)', top: -30, right: -30 },
  circleBg2:  { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.3)', bottom: 10, left: 10 },
  avatarOuter:{ alignItems: 'center', zIndex: 2 },
  head:       { width: 72, height: 72, borderRadius: 36, backgroundColor: '#fcd9bd', alignItems: 'center', justifyContent: 'center', marginBottom: 2, overflow: 'visible' },
  hair:       { position: 'absolute', top: -4, width: 72, height: 30, borderRadius: 20, backgroundColor: '#6b4226' },
  face:       { alignItems: 'center', marginTop: 12 },
  eyeRow:     { flexDirection: 'row', gap: 14, marginBottom: 6 },
  eye:        { width: 10, height: 10, borderRadius: 5, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  pupil:      { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#374151' },
  smile:      { width: 18, height: 8, borderRadius: 4, borderBottomWidth: 2.5, borderColor: '#c97d60', borderTopWidth: 0, borderLeftWidth: 0, borderRightWidth: 0 },
  headsetBand:{ position: 'absolute', top: 6, width: 68, height: 30, borderTopLeftRadius: 34, borderTopRightRadius: 34, borderWidth: 4, borderColor: '#1f2937', borderBottomWidth: 0, backgroundColor: 'transparent' },
  earCup:     { position: 'absolute', top: 26, width: 12, height: 18, borderRadius: 6, backgroundColor: '#374151' },
  body:       { width: 60, height: 50, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  shirtDots:  { flexDirection: 'row', gap: 6 },
  dot:        { width: 6, height: 6, borderRadius: 3, backgroundColor: '#e5e7eb' },
  desk:       { position: 'absolute', bottom: 0, left: 0, right: 0, height: 36, backgroundColor: 'rgba(255,255,255,0.5)', borderBottomLeftRadius: 20, borderBottomRightRadius: 20, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 10 },
  notebook:   { width: 60, height: 18, backgroundColor: '#fff', borderRadius: 4, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 3, elevation: 1 },
  deskSquare: { width: 22, height: 22, backgroundColor: '#bbf7d0', borderRadius: 4 },
  micDot:     { position: 'absolute', right: 56, bottom: 58, width: 10, height: 10, borderRadius: 5, backgroundColor: '#22c55e', zIndex: 3 },
});

// ─── Field ────────────────────────────────────────────────────────────────────
function Field({ label, required, children }) {
  return (
    <View style={f.wrap}>
      <Text style={f.label}>
        {label}
        {required && <Text style={f.req}> *</Text>}
      </Text>
      {children}
    </View>
  );
}

const f = StyleSheet.create({
  wrap:  { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151' },
  req:   { color: '#ef4444' },
});

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function ContactScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [form, setForm]     = useState({ fullName: '', phone: '', subject: '', message: '' });
  const [status, setStatus] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const set = (key) => (val) => setForm(p => ({ ...p, [key]: val }));

  const handleSend = async () => {
    if (!form.fullName || !form.phone || !form.subject || !form.message) {
      setErrorMsg('Please fill in all required fields.');
      setStatus('error');
      return;
    }
    setStatus('sending');
    setErrorMsg('');

    if (IS_DEMO) {
      setTimeout(() => setStatus('demo'), 800);
      return;
    }

    try {
      await sendEmailJS({
        from_name: form.fullName,
        phone:     form.phone,
        subject:   form.subject,
        message:   form.message,
      });
      setStatus('success');
      setForm({ fullName: '', phone: '', subject: '', message: '' });
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to send message. Please try again.');
      setStatus('error');
    }
  };

  return (
    // ── FIX: plain View + insets.top instead of SafeAreaView ─────────────────
    // SafeAreaView on Android sometimes doesn't push content below the status
    // bar when the screen is navigated to (not the root screen). Using a plain
    // View with paddingTop = insets.top fixes it on every device.
    <View style={[s.safe, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Top bar — now always fully visible */}
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <Text style={s.backArrow}>←</Text>
          <Text style={s.backLabel}>Back</Text>
        </TouchableOpacity>
        <Text style={s.topBarTitle}>Contact Us</Text>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={s.heading}>Can't find the answer you are looking for?</Text>
          <Text style={s.sub}>Our friendly assistant is here to help you 24 hours a day!</Text>

          <View style={s.illustrationWrap}>
            <AgentIllustration />
          </View>

          <View style={s.card}>

            {/* Row: Full Name + Phone */}
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Field label="Full Name" required>
                  <TextInput
                    style={s.input}
                    value={form.fullName}
                    onChangeText={set('fullName')}
                    placeholder="Enter full name"
                    placeholderTextColor="#9ca3af"
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Phone Number" required>
                  <TextInput
                    style={s.input}
                    value={form.phone}
                    onChangeText={set('phone')}
                    placeholder="Enter phone"
                    placeholderTextColor="#9ca3af"
                    keyboardType="phone-pad"
                    returnKeyType="next"
                  />
                </Field>
              </View>
            </View>

            {/* Subject */}
            <Field label="Subject" required>
              <TextInput
                style={s.input}
                value={form.subject}
                onChangeText={set('subject')}
                placeholder="Enter subject line"
                placeholderTextColor="#9ca3af"
                returnKeyType="next"
              />
            </Field>

            {/* Message */}
            <Field label="Message" required>
              <TextInput
                style={[s.input, s.textarea]}
                value={form.message}
                onChangeText={set('message')}
                placeholder="Write your message …"
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                returnKeyType="default"
              />
            </Field>

            {/* Status feedback */}
            {status === 'error' && (
              <View style={s.alertBox}>
                <Text style={s.alertError}>⚠ {errorMsg}</Text>
              </View>
            )}

            {status === 'success' && (
              <View style={[s.alertBox, s.alertSuccess]}>
                <Text style={s.alertSuccessText}>
                  ✓ Message sent successfully! We'll get back to you soon.
                </Text>
              </View>
            )}

            {status === 'demo' && (
              <View style={[s.alertBox, s.alertDemo]}>
                <Text style={s.alertDemoTitle}>⚠ Demo Mode — Email Not Sent</Text>
                <Text style={s.alertDemoBody}>
                  Replace{' '}
                  <Text style={s.code}>YOUR_SERVICE_ID</Text>,{' '}
                  <Text style={s.code}>YOUR_TEMPLATE_ID</Text>, and{' '}
                  <Text style={s.code}>YOUR_PUBLIC_KEY</Text>{' '}
                  at the top of this file with your EmailJS credentials.
                </Text>
              </View>
            )}

            {/* Send button */}
            <TouchableOpacity
              onPress={handleSend}
              disabled={status === 'sending'}
              style={[s.sendBtn, status === 'sending' && s.sendBtnDisabled]}
              activeOpacity={0.85}
            >
              {status === 'sending'
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={s.sendBtnTxt}>Send Message</Text>}
            </TouchableOpacity>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const G    = '#22c55e';
const DARK = '#1a2332';

const s = StyleSheet.create({
  // ── FIX: backgroundColor moved here so the area above topBar matches ───────
  safe: { flex: 1, backgroundColor: '#fff' },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingBottom: 12,   // ← was paddingVertical; top padding now comes from insets.top on the parent
    paddingTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
  },
  backBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 60 },
  backArrow:   { fontSize: 18, color: G, fontWeight: '700' },
  backLabel:   { fontSize: 13, color: G, fontWeight: '700' },
  topBarTitle: { fontSize: 16, fontWeight: '800', color: DARK },

  scroll:           { padding: 16, backgroundColor: '#f9fafb' },
  heading:          { fontSize: 20, fontWeight: '800', color: DARK, marginBottom: 6, lineHeight: 28 },
  sub:              { fontSize: 13, color: '#6b7280', marginBottom: 16, lineHeight: 19 },
  illustrationWrap: { borderRadius: 20, overflow: 'hidden', marginBottom: 18 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  row: { flexDirection: 'row', gap: 12 },

  input: {
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontSize: 13,
    color: '#374151',
    backgroundColor: '#fff',
  },
  textarea: {
    minHeight: 110,
    paddingTop: 11,
    lineHeight: 20,
  },

  alertBox:         { borderRadius: 10, padding: 12 },
  alertError:       { fontSize: 13, color: '#ef4444', fontWeight: '600' },
  alertSuccess:     { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#86efac' },
  alertSuccessText: { fontSize: 13, color: '#16a34a', fontWeight: '600' },
  alertDemo:        { backgroundColor: '#fefce8', borderWidth: 1, borderColor: '#fde68a' },
  alertDemoTitle:   { fontSize: 13, fontWeight: '700', color: '#92400e', marginBottom: 4 },
  alertDemoBody:    { fontSize: 12, color: '#78350f', lineHeight: 18 },
  code:             { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', backgroundColor: '#fef9c3', fontSize: 11 },

  sendBtn:         { backgroundColor: G, borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', shadowColor: G, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  sendBtnDisabled: { opacity: 0.6, shadowOpacity: 0 },
  sendBtnTxt:      { color: '#fff', fontSize: 14, fontWeight: '800' },
});