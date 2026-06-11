// app/privacy-policy.jsx
// ─────────────────────────────────────────────────────────────────────────────
// PrivacyPolicy — React Native (Expo Router)
// Fix: SafeAreaView → plain View + insets.top so top bar is always visible
// ─────────────────────────────────────────────────────────────────────────────

import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    LayoutAnimation,
    Linking,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    UIManager,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const sections = [
  {
    id: 'information',
    icon: '🗂️',
    title: 'Information We Collect',
    content: [
      { subtitle: 'Personal Information', text: 'When you create an account or place an order on Gramin Kart, we collect your name, email address, phone number, and delivery address to process and fulfill your orders.' },
      { subtitle: 'Usage Data', text: 'We automatically collect information about how you interact with our platform — including pages visited, items viewed, search queries, and device/browser details — to improve your shopping experience.' },
      { subtitle: 'Payment Information', text: 'Payment transactions are processed through secure, encrypted third-party gateways. Gramin Kart does not store your full card details on our servers.' },
    ],
  },
  {
    id: 'usage',
    icon: '⚙️',
    title: 'How We Use Your Information',
    content: [
      { subtitle: 'Order Processing', text: 'Your personal data is used to confirm, process, and deliver your grocery orders and to communicate updates regarding your purchases.' },
      { subtitle: 'Personalization', text: 'We use your browsing and purchase history to recommend products and offers that match your preferences and local needs.' },
      { subtitle: 'Service Improvement', text: 'Aggregate usage data helps us improve our platform, add new features, and ensure a smooth, reliable experience for all customers.' },
    ],
  },
  {
    id: 'sharing',
    icon: '🤝',
    title: 'Information Sharing',
    content: [
      { subtitle: 'Delivery Partners', text: 'We share your name, address, and contact number with our delivery partners solely to fulfill your orders. They are not permitted to use this data for any other purpose.' },
      { subtitle: 'No Third-Party Selling', text: 'Gramin Kart does not sell, rent, or trade your personal information to any third-party marketers or advertisers.' },
      { subtitle: 'Legal Obligations', text: 'We may disclose your information if required by law, court order, or to protect the rights and safety of Gramin Kart, our users, or the public.' },
    ],
  },
  {
    id: 'security',
    icon: '🔒',
    title: 'Data Security',
    content: [
      { subtitle: 'Encryption', text: 'All data transmitted between your device and our servers is protected using industry-standard SSL/TLS encryption to prevent unauthorized access.' },
      { subtitle: 'Access Control', text: 'Only authorized Gramin Kart personnel have access to your personal data, and only to the extent necessary to perform their duties.' },
      { subtitle: 'Breach Response', text: 'In the unlikely event of a data breach, we will notify affected users promptly and take immediate steps to mitigate any harm.' },
    ],
  },
  {
    id: 'rights',
    icon: '✋',
    title: 'Your Rights',
    content: [
      { subtitle: 'Access & Correction', text: 'You have the right to access the personal information we hold about you and to request corrections if any details are inaccurate or incomplete.' },
      { subtitle: 'Deletion', text: 'You may request the deletion of your account and associated data at any time by contacting our support team at privacy@graminkart.in.' },
      { subtitle: 'Opt-Out', text: 'You can opt out of promotional emails and notifications at any time via your account settings or by clicking the unsubscribe link in any marketing email.' },
    ],
  },
  {
    id: 'cookies',
    icon: '🍪',
    title: 'Cookies & Tracking',
    content: [
      { subtitle: 'Essential Cookies', text: 'We use essential cookies to keep you logged in and remember your cart. These are required for the platform to function correctly.' },
      { subtitle: 'Analytics Cookies', text: 'Analytics cookies help us understand how users navigate our site so we can improve performance and usability. You may disable these in your browser settings.' },
      { subtitle: 'Marketing Cookies', text: 'We may use marketing cookies to show you relevant offers. You can manage your cookie preferences at any time through the cookie settings panel.' },
    ],
  },
  {
    id: 'children',
    icon: '👶',
    title: "Children's Privacy",
    content: [
      { subtitle: 'Age Restriction', text: 'Gramin Kart is not directed at children under the age of 13. We do not knowingly collect personal information from children.' },
      { subtitle: 'Parental Action', text: 'If you believe your child has provided us with personal data, please contact us immediately and we will delete it from our systems.' },
    ],
  },
  {
    id: 'updates',
    icon: '📋',
    title: 'Policy Updates',
    content: [
      { subtitle: 'Changes', text: 'We may update this Privacy Policy from time to time to reflect changes in our practices or applicable laws. The updated policy will be posted on this page with a revised date.' },
      { subtitle: 'Notification', text: 'For significant changes, we will notify registered users via email or a prominent notice on our platform before the changes take effect.' },
    ],
  },
];

// ─── Hero Header ──────────────────────────────────────────────────────────────
function HeroHeader() {
  return (
    <View style={h.wrap}>
      <Text style={h.watermark}>GK</Text>
      <View style={h.blob1} />
      <View style={h.blob2} />
      <View style={h.content}>
        <View style={h.badge}>
          <Text style={h.badgeTxt}>🌿  Gramin Kart — Est. 2026</Text>
        </View>
        <Text style={h.title}>
          Privacy{' '}
          <Text style={h.titleAccent}>Policy</Text>
        </Text>
        <Text style={h.sub}>
          At Gramin Kart, your trust is our harvest. We are transparent about
          how we collect, use, and protect your personal information.
        </Text>
        <View style={h.metaRow}>
          <Text style={h.meta}>📅 Effective: Jan 1, 2026</Text>
          <Text style={h.metaDivider}>|</Text>
          <Text style={h.meta}>📅 Updated: Jun 2026</Text>
          <Text style={h.metaDivider}>|</Text>
          <Text style={h.meta}>📍 India</Text>
        </View>
      </View>
    </View>
  );
}

const h = StyleSheet.create({
  wrap:        { backgroundColor: '#16a34a', paddingTop: 28, paddingBottom: 32, paddingHorizontal: 20, overflow: 'hidden' },
  watermark:   { position: 'absolute', right: 16, top: '30%', fontSize: 80, fontWeight: '900', color: 'rgba(255,255,255,0.08)', letterSpacing: -4 },
  blob1:       { position: 'absolute', left: -40, top: '50%', width: 180, height: 260, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.06)' },
  blob2:       { position: 'absolute', right: -20, bottom: -40, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.05)' },
  content:     { position: 'relative', zIndex: 2, alignItems: 'center' },
  badge:       { backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 14 },
  badgeTxt:    { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  title:       { fontSize: 36, fontWeight: '800', color: '#fff', textAlign: 'center', lineHeight: 42, marginBottom: 10 },
  titleAccent: { color: '#facc15' },
  sub:         { fontSize: 14, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 22, marginBottom: 16, maxWidth: 300 },
  metaRow:     { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, alignItems: 'center' },
  meta:        { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  metaDivider: { fontSize: 11, color: 'rgba(255,255,255,0.3)' },
});

// ─── Accordion Section Card ───────────────────────────────────────────────────
function SectionCard({ section, index, isOpen, onToggle }) {
  return (
    <View style={[sc.card, isOpen && sc.cardOpen]}>
      <TouchableOpacity onPress={onToggle} style={sc.header} activeOpacity={0.75}>
        <View style={sc.headerLeft}>
          <View style={sc.iconWrap}>
            <Text style={sc.iconTxt}>{section.icon}</Text>
          </View>
          <Text style={sc.title} numberOfLines={2}>
            {index + 1}. {section.title}
          </Text>
        </View>
        <Text style={[sc.plus, isOpen && sc.plusOpen]}>+</Text>
      </TouchableOpacity>

      {isOpen && (
        <View style={sc.body}>
          <View style={sc.divider} />
          {section.content.map((item, i) => (
            <View key={i} style={sc.item}>
              <Text style={sc.subtitle}>{item.subtitle}</Text>
              <Text style={sc.text}>{item.text}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const sc = StyleSheet.create({
  card:       { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1.5, borderColor: '#f0f0f0', marginBottom: 10, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  cardOpen:   { borderColor: '#2d6a4f', shadowOpacity: 0.10, elevation: 3 },
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, paddingRight: 8 },
  iconWrap:   { width: 36, height: 36, borderRadius: 10, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  iconTxt:    { fontSize: 17 },
  title:      { fontSize: 15, fontWeight: '700', color: '#1a2332', flex: 1 },
  plus:       { fontSize: 22, color: '#2d6a4f', fontWeight: '700', width: 24, textAlign: 'center' },
  plusOpen:   { transform: [{ rotate: '45deg' }] },
  body:       { paddingHorizontal: 16, paddingBottom: 16 },
  divider:    { height: 1, backgroundColor: '#2d6a4f', marginBottom: 16, width: '60%' },
  item:       { marginBottom: 14 },
  subtitle:   { fontSize: 11, fontWeight: '700', color: '#1a4731', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  text:       { fontSize: 14, color: '#4b5563', lineHeight: 22 },
});

// ─── Contact Card ─────────────────────────────────────────────────────────────
function ContactCard() {
  return (
    <View style={cc.wrap}>
      <Text style={cc.watermark}>GK</Text>
      <View style={cc.blob} />
      <View style={cc.content}>
        <View style={cc.badge}>
          <Text style={cc.badgeTxt}>📬  GET IN TOUCH</Text>
        </View>
        <Text style={cc.title}>
          Have questions or{' '}
          <Text style={cc.titleAccent}>concerns?</Text>
        </Text>
        <Text style={cc.sub}>
          Our dedicated privacy team is here to help. Reach out and we'll respond within 2 business days.
        </Text>
        <TouchableOpacity onPress={() => Linking.openURL('mailto:privacy@graminkart.in')} style={cc.emailBtn} activeOpacity={0.88}>
          <Text style={cc.emailBtnTxt}>📧  privacy@graminkart.in</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => Linking.openURL('tel:+911800000000')} style={cc.phoneBtn} activeOpacity={0.88}>
          <Text style={cc.phoneBtnTxt}>📞  1800-000-0000 (Toll Free)</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const cc = StyleSheet.create({
  wrap:        { borderRadius: 20, backgroundColor: '#16a34a', padding: 24, marginTop: 6, overflow: 'hidden' },
  watermark:   { position: 'absolute', right: 16, top: '30%', fontSize: 80, fontWeight: '900', color: 'rgba(255,255,255,0.08)', letterSpacing: -4 },
  blob:        { position: 'absolute', left: -30, bottom: -30, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.07)' },
  content:     { position: 'relative', zIndex: 2 },
  badge:       { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 12 },
  badgeTxt:    { color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  title:       { fontSize: 22, fontWeight: '800', color: '#fff', lineHeight: 28, marginBottom: 8 },
  titleAccent: { color: '#facc15' },
  sub:         { fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 20, marginBottom: 16 },
  emailBtn:    { backgroundColor: '#fff', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center', marginBottom: 10 },
  emailBtnTxt: { color: '#15803d', fontSize: 13, fontWeight: '700' },
  phoneBtn:    { backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center' },
  phoneBtnTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },
});

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeSection, setActiveSection] = useState(null);

  const toggle = (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveSection(prev => (prev === id ? null : id));
  };

  return (
    // ── FIX: plain View + insets.top instead of SafeAreaView ─────────────────
    <View style={[s.safe, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Top bar — always fully visible */}
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <Text style={s.backArrow}>←</Text>
          <Text style={s.backLabel}>Back</Text>
        </TouchableOpacity>
        <Text style={s.topBarTitle}>Privacy Policy</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      >
        <HeroHeader />

        <View style={s.body}>
          <View style={s.introCard}>
            <Text style={s.introText}>
              This Privacy Policy explains how{' '}
              <Text style={s.introBold}>Gramin Kart</Text>
              {' '}("we", "our", or "us") collects, uses, shares, and protects
              information obtained from users ("you") of our website and mobile
              application. By using Gramin Kart, you agree to the practices
              described in this policy. This policy applies to all services
              offered by Gramin Kart in India since our founding in 2026.
            </Text>
          </View>

          <Text style={s.contentsLabel}>CONTENTS</Text>

          {sections.map((section, idx) => (
            <SectionCard
              key={section.id}
              section={section}
              index={idx}
              isOpen={activeSection === section.id}
              onToggle={() => toggle(section.id)}
            />
          ))}

          <ContactCard />

          <Text style={s.footerNote}>
            By continuing to use Gramin Kart, you acknowledge that you have
            read and understood this Privacy Policy.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // ── FIX: backgroundColor #fff so status bar area matches the top bar ───────
  safe: { flex: 1, backgroundColor: '#fff' },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
  },
  backBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 60 },
  backArrow:   { fontSize: 18, color: '#22c55e', fontWeight: '700' },
  backLabel:   { fontSize: 13, color: '#22c55e', fontWeight: '700' },
  topBarTitle: { fontSize: 16, fontWeight: '800', color: '#1a2332' },

  body:          { padding: 14, backgroundColor: '#f9fafb' },
  introCard:     { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  introText:     { fontSize: 14, color: '#4b5563', lineHeight: 24 },
  introBold:     { fontWeight: '700', color: '#1a4731' },
  contentsLabel: { fontSize: 10, fontWeight: '700', color: '#9ca3af', letterSpacing: 2, marginBottom: 10, marginLeft: 2 },
  footerNote:    { marginTop: 20, fontSize: 12, color: '#9ca3af', textAlign: 'center', lineHeight: 18, paddingHorizontal: 16 },
});