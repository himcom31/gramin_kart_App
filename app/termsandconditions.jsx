// app/terms.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Terms & Conditions — React Native (Expo Router)
// Fix: SafeAreaView → plain View + insets.top so top bar is always visible
// ─────────────────────────────────────────────────────────────────────────────

import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
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

// Enable LayoutAnimation on Android (kept for consistency)
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const sections = [
  {
    id: 'acceptance',
    title: 'Acceptance of Terms',
    content: `By accessing or using Gramin Kart's website, mobile application, or any of our services, you confirm that you have read, understood, and agree to be bound by these Terms & Conditions. If you do not agree, please discontinue use of our platform immediately.\n\nThese terms apply to all visitors, users, and customers of Gramin Kart. We reserve the right to update these terms at any time, and continued use of the platform constitutes acceptance of any revised terms.`,
  },
  {
    id: 'about',
    title: 'About Gramin Kart',
    content: `Gramin Kart is an online grocery platform founded in 2026, dedicated to bridging the gap between rural producers and urban consumers across India. We connect local farmers, artisans, and vendors with customers seeking fresh, authentic, and affordable produce.\n\nOur mission is to empower the rural economy while delivering quality groceries directly to your doorstep. Gramin Kart operates as an e-commerce marketplace facilitating transactions between buyers and registered sellers.`,
  },
  {
    id: 'eligibility',
    title: 'Eligibility & Account',
    content: `To use Gramin Kart, you must be at least 18 years of age or have parental/guardian consent. By creating an account, you represent that all information provided is accurate, current, and complete.\n\nYou are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately of any unauthorized use of your account. Gramin Kart shall not be liable for any losses arising from unauthorized account access due to your failure to safeguard login information.`,
  },
  {
    id: 'orders',
    title: 'Orders & Payments',
    content: `All orders placed on Gramin Kart are subject to availability and confirmation. We reserve the right to cancel or refuse any order at our discretion, including cases of suspected fraud, inaccurate product information, or pricing errors.\n\nPayments must be made through our supported payment methods including UPI, credit/debit cards, net banking, and cash on delivery (where available). Prices are listed in Indian Rupees (INR) and are inclusive of applicable taxes unless stated otherwise.`,
  },
  {
    id: 'delivery',
    title: 'Delivery Policy',
    content: `Gramin Kart strives to deliver your orders within the estimated timeframe shown at checkout. Delivery timelines may vary based on your location, product availability, and external factors such as weather or public holidays.\n\nWe currently serve select pin codes across India. Delivery charges, if applicable, will be clearly displayed before order confirmation. Risk of loss and title for products pass to you upon delivery.`,
  },
  {
    id: 'returns',
    title: 'Returns & Refunds',
    content: `We want you to be satisfied with every purchase. If you receive a damaged, defective, or incorrect item, please report it within 24 hours of delivery through our app or customer support.\n\nPerishable items (fresh produce, dairy, etc.) are not eligible for return unless they arrive in a damaged or spoiled condition. Refunds, where approved, will be processed to the original payment method within 5–7 business days.`,
  },
  {
    id: 'prohibited',
    title: 'Prohibited Activities',
    content: `Users must not engage in any activity that disrupts, damages, or impairs the platform. This includes but is not limited to: placing fraudulent orders, scraping or harvesting data without authorization, impersonating other users or Gramin Kart staff, uploading malicious content, or attempting to gain unauthorized access to our systems.\n\nViolation of these prohibitions may result in immediate account suspension and legal action where applicable.`,
  },
  {
    id: 'ip',
    title: 'Intellectual Property',
    content: `All content on the Gramin Kart platform — including logos, text, images, graphics, and software — is the exclusive property of Gramin Kart or its licensors and is protected under applicable intellectual property laws.\n\nYou may not reproduce, distribute, modify, or create derivative works from any content on our platform without prior written permission from Gramin Kart.`,
  },
  {
    id: 'privacy',
    title: 'Privacy & Data',
    content: `Your privacy matters to us. Gramin Kart collects and processes personal data in accordance with our Privacy Policy. By using our platform, you consent to the collection and use of your data as described therein.\n\nWe implement industry-standard security measures to protect your data. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.`,
  },
  {
    id: 'liability',
    title: 'Limitation of Liability',
    content: `To the maximum extent permitted by law, Gramin Kart shall not be liable for any indirect, incidental, special, or consequential damages arising out of your use of or inability to use our platform or services.\n\nOur total liability for any claim arising in connection with these terms shall not exceed the amount paid by you for the specific order giving rise to the claim.`,
  },
  {
    id: 'governing',
    title: 'Governing Law',
    content: `These Terms & Conditions shall be governed by and construed in accordance with the laws of India. Any disputes arising out of or in connection with these terms shall be subject to the exclusive jurisdiction of the courts located in Patna, Bihar.\n\nIf any provision of these terms is found to be unenforceable, the remaining provisions shall continue in full force and effect.`,
  },
  {
    id: 'contact',
    title: 'Contact Us',
    content: `If you have any questions, concerns, or feedback regarding these Terms & Conditions, please reach out to us:\n\nEmail: support@graminkart.in\nPhone: 1800-XXX-XXXX (Toll Free)\nAddress: Gramin Kart Pvt. Ltd., Patna, Bihar – 800001, India\nSupport Hours: Monday – Saturday, 9:00 AM – 6:00 PM IST`,
  },
];

// ─── Hero Header ──────────────────────────────────────────────────────────────
function HeroHeader() {
  return (
    <View style={h.wrap}>
      <Text style={h.wmLeft}>GK</Text>
      <Text style={h.wmRight}>GK</Text>
      <View style={h.blob1} />
      <View style={h.blob2} />
      <View style={h.content}>
        <View style={h.badge}>
          <Text style={h.badgeTxt}>🌿  Gramin Kart · Est. 2026</Text>
        </View>
        <Text style={h.title}>
          Terms &amp;{' '}
          <Text style={h.accent}>Conditions</Text>
        </Text>
        <Text style={h.sub}>
          Please read these terms carefully before using our platform. By continuing, you agree to the following.
        </Text>
        <View style={h.metaRow}>
          <Text style={h.meta}>📅 Effective: Jan 1, 2026</Text>
          <Text style={h.sep}>|</Text>
          <Text style={h.meta}>📅 Updated: Jun 2026</Text>
          <Text style={h.sep}>|</Text>
          <Text style={h.meta}>📄 Version 1.0</Text>
        </View>
      </View>
    </View>
  );
}

const h = StyleSheet.create({
  wrap:    { backgroundColor: '#16a34a', paddingTop: 28, paddingBottom: 32, paddingHorizontal: 20, overflow: 'hidden' },
  wmLeft:  { position: 'absolute', left: 16, top: '30%', fontSize: 80, fontWeight: '900', color: 'rgba(255,255,255,0.08)', letterSpacing: -4 },
  wmRight: { position: 'absolute', right: 16, bottom: -10, fontSize: 80, fontWeight: '900', color: 'rgba(255,255,255,0.08)', letterSpacing: -4 },
  blob1:   { position: 'absolute', left: -40, top: '50%', width: 180, height: 260, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.06)' },
  blob2:   { position: 'absolute', right: -20, bottom: -40, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.05)' },
  content: { position: 'relative', zIndex: 2, alignItems: 'center' },
  badge:   { backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 14 },
  badgeTxt:{ color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  title:   { fontSize: 34, fontWeight: '800', color: '#fff', textAlign: 'center', lineHeight: 40, marginBottom: 10 },
  accent:  { color: '#facc15' },
  sub:     { fontSize: 13, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 21, marginBottom: 16, maxWidth: 300 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 6 },
  meta:    { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  sep:     { fontSize: 11, color: 'rgba(255,255,255,0.3)' },
});

// ─── TOC Strip ────────────────────────────────────────────────────────────────
function TOCStrip({ activeId, onPress }) {
  return (
    <View style={toc.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={toc.row}>
        {sections.map((s, i) => {
          const active = activeId === s.id;
          return (
            <TouchableOpacity
              key={s.id}
              onPress={() => onPress(s.id)}
              style={[toc.pill, active && toc.pillActive]}
              activeOpacity={0.75}
            >
              <Text style={[toc.pillTxt, active && toc.pillTxtActive]}>
                {i + 1}. {s.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const toc = StyleSheet.create({
  wrap:         { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  row:          { paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  pill:         { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  pillActive:   { backgroundColor: '#dcfce7', borderColor: '#86efac' },
  pillTxt:      { fontSize: 11, fontWeight: '600', color: '#6b7280' },
  pillTxtActive:{ color: '#15803d', fontWeight: '700' },
});

// ─── Warning Banner ───────────────────────────────────────────────────────────
function WarningBanner() {
  return (
    <View style={wb.wrap}>
      <Text style={wb.icon}>⚠️</Text>
      <Text style={wb.txt}>
        These Terms & Conditions govern your use of Gramin Kart's platform. By placing an order or creating an account, you legally agree to these terms. Questions?{' '}
        <Text style={wb.bold}>support@graminkart.in</Text>
      </Text>
    </View>
  );
}

const wb = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: 10, backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fcd34d', borderRadius: 16, padding: 14, marginBottom: 14 },
  icon: { fontSize: 18, lineHeight: 22 },
  txt:  { flex: 1, fontSize: 13, color: '#92400e', lineHeight: 20 },
  bold: { fontWeight: '700' },
});

// ─── Section Card ─────────────────────────────────────────────────────────────
function SectionCard({ section, index }) {
  return (
    <View style={sc.card}>
      <View style={sc.header}>
        <View style={sc.numBadge}>
          <Text style={sc.numTxt}>{index + 1}</Text>
        </View>
        <Text style={sc.title}>{section.title}</Text>
      </View>
      <View style={sc.divider} />
      <View style={sc.body}>
        {section.content.split('\n\n').map((para, i) => (
          <Text key={i} style={sc.para}>{para}</Text>
        ))}
      </View>
    </View>
  );
}

const sc = StyleSheet.create({
  card:     { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#f0f0f0', marginBottom: 10, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  header:   { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  numBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#16a34a', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  numTxt:   { fontSize: 12, fontWeight: '800', color: '#fff' },
  title:    { fontSize: 15, fontWeight: '700', color: '#111827', flex: 1 },
  divider:  { height: 1, backgroundColor: '#f3f4f6', marginHorizontal: 16 },
  body:     { paddingHorizontal: 16, paddingVertical: 14, gap: 10 },
  para:     { fontSize: 13, color: '#4b5563', lineHeight: 21 },
});

// ─── Footer CTA ───────────────────────────────────────────────────────────────
function FooterCTA() {
  return (
    <View style={fc.wrap}>
      <Text style={fc.wm}>GK</Text>
      <View style={fc.blob} />
      <View style={fc.content}>
        <View style={fc.badge}>
          <Text style={fc.badgeTxt}>🌾  GRAMIN KART PROMISE</Text>
        </View>
        <Text style={fc.title}>
          You're in <Text style={fc.accent}>good hands</Text>
        </Text>
        <Text style={fc.sub}>
          By using Gramin Kart, you trust us with your grocery needs. We promise to uphold quality, transparency, and fairness in everything we do.
        </Text>
        <TouchableOpacity onPress={() => Linking.openURL('mailto:support@graminkart.in')} style={fc.emailBtn} activeOpacity={0.88}>
          <Text style={fc.emailBtnTxt}>📧  support@graminkart.in</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => Linking.openURL('tel:+911800000000')} style={fc.phoneBtn} activeOpacity={0.88}>
          <Text style={fc.phoneBtnTxt}>📞  1800-XXX-XXXX (Toll Free)</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const fc = StyleSheet.create({
  wrap:       { borderRadius: 20, backgroundColor: '#16a34a', padding: 24, marginTop: 6, overflow: 'hidden' },
  wm:         { position: 'absolute', right: 16, bottom: -10, fontSize: 80, fontWeight: '900', color: 'rgba(255,255,255,0.08)', letterSpacing: -4 },
  blob:       { position: 'absolute', left: -30, top: -30, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.07)' },
  content:    { position: 'relative', zIndex: 2 },
  badge:      { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 12 },
  badgeTxt:   { color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  title:      { fontSize: 22, fontWeight: '800', color: '#fff', lineHeight: 28, marginBottom: 8 },
  accent:     { color: '#facc15' },
  sub:        { fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 20, marginBottom: 16 },
  emailBtn:   { backgroundColor: '#fff', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center', marginBottom: 10 },
  emailBtnTxt:{ color: '#15803d', fontSize: 13, fontWeight: '700' },
  phoneBtn:   { backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center' },
  phoneBtnTxt:{ color: '#fff', fontSize: 13, fontWeight: '700' },
});

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
export default function TermsScreen() {
  const router    = useRouter();
  const insets    = useSafeAreaInsets();
  const scrollRef = useRef(null);
  const [activeId, setActiveId] = useState('acceptance');
  const offsetsRef = useRef({});

  const handleTOCPress = (id) => {
    setActiveId(id);
    const y = offsetsRef.current[id];
    if (y !== undefined && scrollRef.current) {
      scrollRef.current.scrollTo({ y: y - 12, animated: true });
    }
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
        <Text style={s.topBarTitle}>Terms & Conditions</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* TOC strip — sticky below top bar */}
      <TOCStrip activeId={activeId} onPress={handleTOCPress} />

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        scrollEventThrottle={16}
      >
        <HeroHeader />

        <View style={s.body}>
          <WarningBanner />

          {sections.map((section, index) => (
            <View
              key={section.id}
              onLayout={(e) => {
                offsetsRef.current[section.id] =
                  e.nativeEvent.layout.y + 28 + 14;
              }}
            >
              <SectionCard section={section} index={index} />
            </View>
          ))}

          <FooterCTA />

          <Text style={s.footerNote}>
            By continuing to use Gramin Kart, you acknowledge that you have read and understood these Terms & Conditions.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // ── FIX: #fff so status bar area matches the white top bar ────────────────
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
  backBtn:    { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 60 },
  backArrow:  { fontSize: 18, color: '#22c55e', fontWeight: '700' },
  backLabel:  { fontSize: 13, color: '#22c55e', fontWeight: '700' },
  topBarTitle:{ fontSize: 16, fontWeight: '800', color: '#1a2332' },
  body:       { padding: 14, backgroundColor: '#f9fafb' },
  footerNote: { marginTop: 20, fontSize: 12, color: '#9ca3af', textAlign: 'center', lineHeight: 18, paddingHorizontal: 16 },
});