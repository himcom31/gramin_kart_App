import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text, TextInput, TouchableOpacity,
  View
} from 'react-native';
import { useAuth } from '../src/context/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

const STRENGTH_COLORS = ['#f44336', '#ff9800', '#8bc34a', '#2d9e2d'];
const STRENGTH_LABELS = ['Weak', 'Fair', 'Good', 'Strong'];

const COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Argentina', 'Australia',
  'Austria', 'Bangladesh', 'Belgium', 'Brazil', 'Canada',
  'China', 'Colombia', 'Czech Republic', 'Denmark', 'Egypt',
  'Ethiopia', 'Finland', 'France', 'Germany', 'Ghana',
  'Greece', 'Hungary', 'India', 'Indonesia', 'Iran',
  'Iraq', 'Ireland', 'Israel', 'Italy', 'Japan',
  'Jordan', 'Kenya', 'Malaysia', 'Mexico', 'Morocco',
  'Netherlands', 'New Zealand', 'Nigeria', 'Norway', 'Pakistan',
  'Philippines', 'Poland', 'Portugal', 'Romania', 'Russia',
  'Saudi Arabia', 'South Africa', 'South Korea', 'Spain', 'Sri Lanka',
  'Sweden', 'Switzerland', 'Thailand', 'Turkey', 'Ukraine',
  'United Arab Emirates', 'United Kingdom', 'United States', 'Vietnam',
];

function getPasswordStrength(password) {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

function formatPhone(value) {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length > 5) return digits.slice(0, 5) + '-' + digits.slice(5);
  return digits;
}

// ─── Floating Label Input ───────────────────────────────────────────────────
function FloatingInput({ label, value, onChangeText, secureTextEntry, isPassword, showPw, onTogglePw, ...rest }) {
  const [focused, setFocused] = useState(false);
  const floatAnim = useRef(new Animated.Value(value ? 1 : 0)).current;

  const onFocus = () => {
    setFocused(true);
    Animated.timing(floatAnim, { toValue: 1, duration: 150, useNativeDriver: false }).start();
  };
  const onBlur = () => {
    setFocused(false);
    if (!value) Animated.timing(floatAnim, { toValue: 0, duration: 150, useNativeDriver: false }).start();
  };

  const labelTop   = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 6] });
  const labelSize  = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [14, 11] });
  const labelColor = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#b0b8b0', focused ? '#2d9e2d' : '#999'],
  });

  return (
    <View style={[styles.inputWrap, focused && styles.inputWrapFocused]}>
      <Animated.Text style={[styles.floatLabel, { top: labelTop, fontSize: labelSize, color: labelColor }]}>
        {label}
      </Animated.Text>
      <TextInput
        style={[styles.floatInput, isPassword && { paddingRight: 48 }]}
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        onBlur={onBlur}
        secureTextEntry={secureTextEntry}
        {...rest}
      />
      {isPassword && (
        <TouchableOpacity style={styles.eyeBtn} onPress={onTogglePw} activeOpacity={0.7}>
          <Text style={styles.eyeIcon}>{showPw ? '🙈' : '👁️'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Country Picker ─────────────────────────────────────────────────────────
function CountryPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={[styles.inputWrap, open && styles.inputWrapFocused]}
        onPress={() => setOpen(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.countryLabel}>Country</Text>
        <Text style={[styles.countryValue, !value && styles.countryPlaceholder]}>
          {value || 'Select country'}
        </Text>
        <Text style={styles.countryChevron}>▼</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country</Text>
              <TouchableOpacity onPress={() => setOpen(false)} activeOpacity={0.7}>
                <Text style={styles.modalDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={COUNTRIES}
              keyExtractor={item => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.countryItem}
                  onPress={() => { onChange(item); setOpen(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.countryItemText, item === value && styles.countryItemSelected]}>
                    {item}
                  </Text>
                  {item === value && (
                    <Text style={styles.countryItemCheck}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

// ─── Animated Logo ──────────────────────────────────────────────────────────
function AnimatedLogo() {
  const spinAnim  = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.logoWrapper}>
      {/* Pulsing outer ring */}
      <Animated.View style={[styles.logoRingOuter, { transform: [{ scale: pulseAnim }] }]} />

      {/* Spinning dot ring */}
      <Animated.View style={[styles.logoRingSpin, { transform: [{ rotate: spin }] }]}>
        {[0, 60, 120, 180, 240, 300].map((deg, i) => (
          <View
            key={i}
            style={[
              styles.ringDot,
              {
                opacity: i % 2 === 0 ? 1 : 0.35,
                transform: [{ rotate: `${deg}deg` }, { translateY: -44 }],
              },
            ]}
          />
        ))}
      </Animated.View>

      {/* White logo circle */}
      <View style={styles.logoCircle}>
        <Image
          source={require('../assets/UserLogo.png')}
          style={styles.heroLogo}
          resizeMode="contain"
        />
      </View>
    </View>
  );
}

// ─── Main Screen ────────────────────────────────────────────────────────────
export default function LoginScreen() {
  const router     = useRouter();
  const { login }  = useAuth();

  const [mode,       setMode]       = useState('login');
  const [identifier, setIdentifier] = useState('');
  const [password,   setPassword]   = useState('');
  const [fullName,   setFullName]   = useState('');
  const [phone,      setPhone]      = useState('');
  const [email,      setEmail]      = useState('');
  const [country,    setCountry]    = useState('');
  const [loading,    setLoading]    = useState(false);
  const [showPw,     setShowPw]     = useState(false);
  const [pwStrength, setPwStrength] = useState(0);

  const shakeAnim = useRef(new Animated.Value(0)).current;

  const switchMode = (newMode) => {
    setMode(newMode);
    setPassword('');
    setShowPw(false);
    setPwStrength(0);
  };

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6,   duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,   duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleLogin = async () => {
    if (!identifier.trim() || !password.trim()) { shake(); Alert.alert('Missing fields', 'Please fill in all fields.'); return; }
    setLoading(true);
    try {
      const res  = await fetch(`${API_URL}/api/user/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) { Alert.alert('Login failed', data.message || 'Invalid credentials.'); return; }
      await login(data.token);
      router.back();
    } catch {
      Alert.alert('Error', 'Could not connect to server. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!fullName || !email || !country || !phone || !password) {
      shake();
      Alert.alert('Missing fields', 'Please fill in all fields.');
      return;
    }
    setLoading(true);
    try {
      const res  = await fetch(`${API_URL}/api/user/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, country, email, phone: phone.replace(/\D/g, ''), password }),
      });
      const data = await res.json();
      if (!res.ok) { Alert.alert('Error', data.message || 'Registration failed.'); return; }
      Alert.alert('Account created!', 'You can now log in.', [
        { text: 'Login', onPress: () => switchMode('login') },
      ]);
    } catch {
      Alert.alert('Error', 'Could not connect to server. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const strengthScore = getPasswordStrength(password);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#f4faf4' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

        {/* ── Hero Header ── */}
        <View style={styles.hero}>
          <View style={styles.blobCircle1} />
          <View style={styles.blobCircle2} />

          <AnimatedLogo />

          <Text style={styles.heroTitle}>
            Gramin <Text style={{ color: '#FF6B00' }}>Kart</Text>
          </Text>
          <Text style={styles.heroSub}>FRESH FROM THE FARM</Text>
        </View>

        {/* ── Card ── */}
        <Animated.View style={[styles.card, { transform: [{ translateX: shakeAnim }] }]}>

          {/* Tabs */}
          <View style={styles.tabRow}>
            {['login', 'register'].map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.tab, mode === t && styles.tabActive]}
                onPress={() => switchMode(t)}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, mode === t && styles.tabTextActive]}>
                  {t === 'login' ? 'Login' : 'Register'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Login Form ── */}
          {mode === 'login' ? (
            <>
              <FloatingInput
                label="Email or phone"
                value={identifier}
                onChangeText={setIdentifier}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <FloatingInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPw}
                isPassword
                showPw={showPw}
                onTogglePw={() => setShowPw(s => !s)}
              />
              <TouchableOpacity style={styles.forgotRow}>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnMain, loading && styles.btnDisabled]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.btnText}>Login</Text>}
              </TouchableOpacity>
              <Text style={styles.switchRow}>
                Don't have an account?{' '}
                <Text style={styles.switchLink} onPress={() => switchMode('register')}>Register now</Text>
              </Text>
            </>
          ) : (

          /* ── Register Form ── */
            <>
              <FloatingInput
                label="Full name"
                value={fullName}
                onChangeText={setFullName}
              />
              <FloatingInput
                label="Email address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              {/* Country Picker */}
              <CountryPicker value={country} onChange={setCountry} />

              <FloatingInput
                label="Phone number"
                value={phone}
                onChangeText={(v) => setPhone(formatPhone(v))}
                keyboardType="phone-pad"
              />
              <FloatingInput
                label="Create password"
                value={password}
                onChangeText={(v) => { setPassword(v); setPwStrength(getPasswordStrength(v)); }}
                secureTextEntry={!showPw}
                isPassword
                showPw={showPw}
                onTogglePw={() => setShowPw(s => !s)}
              />

              {/* Password strength meter */}
              {password.length > 0 && (
                <View style={styles.strengthWrap}>
                  <View style={styles.strengthBar}>
                    {[1, 2, 3, 4].map(i => (
                      <View
                        key={i}
                        style={[
                          styles.strengthSeg,
                          { backgroundColor: i <= strengthScore ? STRENGTH_COLORS[strengthScore - 1] : '#e0e0e0' },
                        ]}
                      />
                    ))}
                  </View>
                  <Text style={[styles.strengthLabel, { color: STRENGTH_COLORS[strengthScore - 1] || '#bbb' }]}>
                    {STRENGTH_LABELS[strengthScore - 1] || ''}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.btnMain, loading && styles.btnDisabled]}
                onPress={handleRegister}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.btnText}>Create account</Text>}
              </TouchableOpacity>
              <Text style={styles.switchRow}>
                Already have an account?{' '}
                <Text style={styles.switchLink} onPress={() => switchMode('login')}>Login</Text>
              </Text>
            </>
          )}

          {/* Trust badges */}
          <View style={styles.trustRow}>
            {[['🔒', 'Secure'], ['✅', 'Trusted'], ['🌱', '100% Fresh']].map(([icon, label]) => (
              <View key={label} style={styles.trustItem}>
                <Text style={styles.trustIcon}>{icon}</Text>
                <Text style={styles.trustLabel}>{label}</Text>
              </View>
            ))}
          </View>

        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1, backgroundColor: '#f4faf4', paddingBottom: 32 },

  // Hero
  hero: {
    backgroundColor: '#2d9e2d',
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomLeftRadius: 60,
    borderBottomRightRadius: 60,
    overflow: 'hidden',
  },
  blobCircle1: {
    position: 'absolute', width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.07)', top: -70, right: -50,
  },
  blobCircle2: {
    position: 'absolute', width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.07)', bottom: -40, left: 10,
  },
  heroTitle: { fontSize: 26, fontWeight: '700', color: '#fff', letterSpacing: -0.5, marginTop: 6 },
  heroSub:   { fontSize: 11, color: 'rgba(255,255,255,0.7)', letterSpacing: 1.5, marginTop: 4 },

  // Animated logo
  logoWrapper: {
    width: 100, height: 100,
    alignItems: 'center', justifyContent: 'center',
  },
  logoRingOuter: {
    position: 'absolute', width: 96, height: 96, borderRadius: 48,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)',
  },
  logoRingSpin: {
    position: 'absolute', width: 96, height: 96,
    alignItems: 'center', justifyContent: 'center',
  },
  ringDot: {
    position: 'absolute', width: 6, height: 6,
    borderRadius: 3, backgroundColor: '#fff',
  },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 6,
  },
  heroLogo: { width: 54, height: 54 },

  // Card
  card: {
    backgroundColor: '#fff', marginHorizontal: 16, marginTop: -32,
    borderRadius: 24, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10, shadowRadius: 20, elevation: 8,
  },

  // Tabs
  tabRow: {
    flexDirection: 'row', backgroundColor: '#f5f7f5',
    borderRadius: 12, padding: 4, marginBottom: 24, gap: 4,
  },
  tab:            { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 9 },
  tabActive:      { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 },
  tabText:        { fontSize: 14, fontWeight: '500', color: '#999' },
  tabTextActive:  { color: '#2d9e2d', fontWeight: '700' },

  // Floating input
  inputWrap: {
    borderWidth: 1.5, borderColor: '#e5e7e5',
    borderRadius: 12, paddingHorizontal: 14,
    marginBottom: 14, position: 'relative', height: 58,
    justifyContent: 'center',
  },
  inputWrapFocused: { borderColor: '#2d9e2d' },
  floatLabel:  { position: 'absolute', left: 14 },
  floatInput:  { position: 'absolute', bottom: 8, left: 14, right: 14, fontSize: 14, color: '#222', padding: 0 },
  eyeBtn:      { position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center' },
  eyeIcon:     { fontSize: 17 },

  // Country picker
  countryLabel:       { fontSize: 11, color: '#999', marginBottom: 4 },
  countryValue:       { fontSize: 14, color: '#222' },
  countryPlaceholder: { color: '#b0b8b0' },
  countryChevron:     { position: 'absolute', right: 14, fontSize: 11, color: '#999' },

  // Country modal
  modalOverlay: {
    flex: 1, justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '72%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 0.5, borderBottomColor: '#eee',
  },
  modalTitle: { fontSize: 15, fontWeight: '600', color: '#222' },
  modalDone:  { fontSize: 14, color: '#2d9e2d', fontWeight: '600' },
  countryItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 0.5, borderBottomColor: '#f5f5f5',
  },
  countryItemText:     { fontSize: 14, color: '#333' },
  countryItemSelected: { color: '#2d9e2d', fontWeight: '600' },
  countryItemCheck:    { fontSize: 14, color: '#2d9e2d' },

  // Forgot
  forgotRow:  { alignItems: 'flex-end', marginBottom: 16, marginTop: -4 },
  forgotText: { fontSize: 12, color: '#2d9e2d', fontWeight: '500' },

  // Button
  btnMain:     { backgroundColor: '#2d9e2d', borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 4 },
  btnDisabled: { opacity: 0.55 },
  btnText:     { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },

  // Switch row
  switchRow:  { textAlign: 'center', fontSize: 13, color: '#999', marginTop: 16 },
  switchLink: { color: '#2d9e2d', fontWeight: '600' },

  // Strength meter
  strengthWrap: { marginTop: -6, marginBottom: 14 },
  strengthBar:  { flexDirection: 'row', gap: 4, height: 4, marginBottom: 4 },
  strengthSeg:  { flex: 1, borderRadius: 2 },
  strengthLabel:{ fontSize: 11, fontWeight: '500' },

  // Trust badges
  trustRow:  { flexDirection: 'row', justifyContent: 'center', gap: 24, marginTop: 20, paddingTop: 16, borderTopWidth: 0.5, borderTopColor: '#f0f0f0' },
  trustItem: { alignItems: 'center', gap: 4 },
  trustIcon: { fontSize: 20 },
  trustLabel:{ fontSize: 11, color: '#bbb' },
});