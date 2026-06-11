// src/components/InfoMenu.jsx
// Hamburger trigger (3 thin lines, no box — Flipkart style) → slide-in panel

import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ── Hamburger: 3 lines, thin stroke, no container ─────────────────────────────
const HamburgerIcon = ({ color = '#1F2937' }) => (
  <View style={{ width: 20, height: 14, justifyContent: 'space-between' }}>
    <View style={{ height: 1.8, backgroundColor: color, borderRadius: 1 }} />
    <View style={{ height: 1.8, backgroundColor: color, borderRadius: 1, marginHorizontal: 2 }} />
    <View style={{ height: 1.8, backgroundColor: color, borderRadius: 1 }} />
  </View>
);

// ── Thin × close icon ─────────────────────────────────────────────────────────
const CloseIcon = ({ size = 14, color = '#6B7280' }) => (
  <View style={{ width: size, height: size }}>
    <View style={{ position: 'absolute', top: size / 2 - 0.8, left: 0, right: 0, height: 1.5, backgroundColor: color, borderRadius: 1, transform: [{ rotate: '45deg' }] }} />
    <View style={{ position: 'absolute', top: size / 2 - 0.8, left: 0, right: 0, height: 1.5, backgroundColor: color, borderRadius: 1, transform: [{ rotate: '-45deg' }] }} />
  </View>
);

// ── Thin right chevron ────────────────────────────────────────────────────────
const ChevronRight = ({ size = 14, color = '#D1D5DB' }) => (
  <View style={{ width: size * 0.6, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: size * 0.38, height: size * 0.38, borderTopWidth: 1.5, borderRightWidth: 1.5, borderColor: color, transform: [{ rotate: '45deg' }] }} />
  </View>
);

// ── Menu item icons ───────────────────────────────────────────────────────────

// Newspaper/document icon for Blog
const BlogIcon = ({ color }) => (
  <View style={{ width: 20, height: 20 }}>
    {/* page outline */}
    <View style={{ position: 'absolute', inset: 0, borderWidth: 1.5, borderColor: color, borderRadius: 3 }} />
    {/* folded corner */}
    <View style={{ position: 'absolute', top: 0, right: 0, width: 5, height: 5, backgroundColor: color, borderBottomLeftRadius: 2 }} />
    {/* text lines */}
    <View style={{ position: 'absolute', left: 3, top: 7, right: 7, height: 1.2, backgroundColor: color, borderRadius: 1, opacity: 0.55 }} />
    <View style={{ position: 'absolute', left: 3, top: 10, right: 5, height: 1.2, backgroundColor: color, borderRadius: 1, opacity: 0.55 }} />
    <View style={{ position: 'absolute', left: 3, top: 13, right: 8, height: 1.2, backgroundColor: color, borderRadius: 1, opacity: 0.55 }} />
  </View>
);

// Phone handset for Contact
const ContactIcon = ({ color }) => (
  <View style={{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>
    {/* receiver body — approximated with a rounded rectangle + rotation */}
    <View style={{
      width: 10, height: 15,
      borderWidth: 1.8, borderColor: color,
      borderRadius: 5,
      transform: [{ rotate: '20deg' }],
    }} />
    {/* cut out the middle to make it look like a handset */}
    <View style={{
      position: 'absolute',
      width: 6, height: 5,
      backgroundColor: '#FFFFFF',
      top: 7, left: 7,
      transform: [{ rotate: '20deg' }],
    }} />
  </View>
);


const PrivacyIcon = ({ color }) => (
  <View style={{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{
      width: 14, height: 16,
      borderWidth: 1.8, borderColor: color,
      borderRadius: 3,
      borderBottomLeftRadius: 7,
      borderBottomRightRadius: 7,
      alignItems: 'center', justifyContent: 'center',
    }}>
      <View style={{ width: 5, height: 5, borderRadius: 2.5, borderWidth: 1.5, borderColor: color }} />
    </View>
  </View>
);


const TermsIcon = ({ color }) => (
  <View style={{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ borderWidth: 1.5, borderColor: color, borderRadius: 3, width: 14, height: 16, paddingTop: 3, paddingHorizontal: 3, gap: 2.5 }}>
      <View style={{ height: 1.2, backgroundColor: color, borderRadius: 1, opacity: 0.6 }} />
      <View style={{ height: 1.2, backgroundColor: color, borderRadius: 1, opacity: 0.6 }} />
      <View style={{ height: 1.2, backgroundColor: color, borderRadius: 1, opacity: 0.6, width: '70%' }} />
    </View>
  </View>
);

// ── Config ────────────────────────────────────────────────────────────────────

const MENU_ITEMS = [
  {
    key: 'blog',
    label: 'Blog',
    sub: 'Articles & updates',
    route: '/blog',
    iconBg: '#EEF2FF',
    iconColor: '#4338CA',
    Icon: BlogIcon,
  },
  {
    key: 'contact',
    label: 'Contact',
    sub: 'Get in touch with us',
    route: '/contact',
    iconBg: '#F0FDF4',
    iconColor: '#16A34A',
    Icon: ContactIcon,
  },

  {
    key: 'privacy',
    label: 'Privacy Policy',
    sub: 'How we handle your data',
    route: '/Privacypolicy',
    iconBg: '#F0F9FF',
    iconColor: '#0369A1',
    Icon: PrivacyIcon,
  },

  {
    key: 'terms',
    label: 'Terms & Conditions',
    sub: 'Rules of using Gramin Kart',
    route: '/termsandconditions',
    iconBg: '#FFF7ED',
    iconColor: '#C2410C',
    Icon: TermsIcon,
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

const PANEL_WIDTH = Math.min(Dimensions.get('window').width * 0.72, 280);

export default function InfoMenu() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(PANEL_WIDTH)).current;

  const open = () => {
    setVisible(true);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 70,
      friction: 12,
    }).start();
  };

  const close = (callback) => {
    Animated.timing(slideAnim, {
      toValue: PANEL_WIDTH,
      duration: 210,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      callback?.();
    });
  };

  const navigate = (route) => close(() => router.push(route));

  return (
    <>
      {/* ── Trigger: bare hamburger, no border/bg box ── */}
      <TouchableOpacity
        onPress={open}
        activeOpacity={0.5}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityLabel="Open menu"
        accessibilityRole="button"
        style={styles.trigger}
      >
        <HamburgerIcon color="#1F2937" />
      </TouchableOpacity>

      {/* ── Panel ── */}
      <Modal visible={visible} transparent animationType="none" onRequestClose={() => close()}>
        <Pressable style={styles.backdrop} onPress={() => close()} />

        <Animated.View style={[styles.panel, { paddingTop: insets.top, transform: [{ translateX: slideAnim }] }]}>

          {/* Header */}
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Menu</Text>
            <TouchableOpacity
              onPress={() => close()}
              style={styles.closeBtn}
              activeOpacity={0.65}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Close menu"
            >
              <CloseIcon size={13} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Items */}
          {MENU_ITEMS.map((item, idx) => (
            <TouchableOpacity
              key={item.key}
              style={[styles.menuItem, idx < MENU_ITEMS.length - 1 && styles.menuItemDivider]}
              onPress={() => navigate(item.route)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconWrap, { backgroundColor: item.iconBg }]}>
                <item.Icon color={item.iconColor} />
              </View>
              <View style={styles.itemText}>
                <Text style={styles.itemLabel}>{item.label}</Text>
                <Text style={styles.itemSub}>{item.sub}</Text>
              </View>
              <ChevronRight size={14} color="#D1D5DB" />
            </TouchableOpacity>
          ))}

        </Animated.View>
      </Modal>
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Bare trigger — no box, just the icon
  trigger: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    flexShrink: 0,
  },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },

  panel: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: PANEL_WIDTH,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.10,
    shadowRadius: 18,
    elevation: 14,
  },

  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: 0.1,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 17,
  },
  menuItemDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  itemText: {
    flex: 1,
    minWidth: 0,
  },
  itemLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  itemSub: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});