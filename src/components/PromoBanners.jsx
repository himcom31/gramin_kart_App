import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet,
  Dimensions, Animated, Easing, PanResponder,
} from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const { width } = Dimensions.get('window');
const CARD_WIDTH  = width - 96;   // side cards peek in
const CARD_HEIGHT = 180;
const INTERVAL_MS = 2000;
const RADIUS      = width * 0.75; // circular depth radius — tune to taste

const fallbacks = [
  { bg: '#1a1a1a', emoji: '🥬', tag: 'Fresh & healthy', label: 'For home delivery', badge: '20% off', badgeColor: '#4caf50' },
  { bg: '#e67e22', emoji: '🛒', tag: 'GROCERY',         label: 'SALE', sub: 'BEST VEGETABLE ONLINE', badge: 'SAVE 50%', badgeColor: '#fff' },
  { bg: '#1a6b1a', emoji: '🍅', tag: 'Limited',         label: 'Fresh Daily', badge: '50% OFF', badgeColor: '#ffe600' },
];

/* ─── Single banner card ─────────────────────────────────────────────────── */
function BannerCard({ item }) {
  const emojiY     = useRef(new Animated.Value(0)).current;
  const emojiScale = useRef(new Animated.Value(1)).current;
  const shimmerX   = useRef(new Animated.Value(-60)).current;
  const cOpacity   = useRef(new Animated.Value(0)).current;
  const cY         = useRef(new Animated.Value(18)).current;
  const badgeScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(cOpacity,   { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(cY,         { toValue: 0, speed: 14, bounciness: 8, useNativeDriver: true }),
      Animated.spring(badgeScale, { toValue: 1, speed: 10, bounciness: 14, delay: 300, useNativeDriver: true }),
    ]).start();

    const floatLoop = Animated.loop(Animated.sequence([
      Animated.timing(emojiY, { toValue: -10, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(emojiY, { toValue: 0,   duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    const scaleLoop = Animated.loop(Animated.sequence([
      Animated.timing(emojiScale, { toValue: 1.15, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(emojiScale, { toValue: 1,    duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    const shimmerLoop = Animated.loop(Animated.sequence([
      Animated.timing(shimmerX, { toValue: 140, duration: 1400, easing: Easing.linear, useNativeDriver: true }),
      Animated.delay(2200),
      Animated.timing(shimmerX, { toValue: -60, duration: 0, useNativeDriver: true }),
    ]));

    floatLoop.start(); scaleLoop.start(); shimmerLoop.start();
    return () => { floatLoop.stop(); scaleLoop.stop(); shimmerLoop.stop(); };
  }, []);

  if (item.image) {
    return (
      <View style={[styles.card, { padding: 0, overflow: 'hidden' }]}>
        <Image source={{ uri: item.image }} style={styles.bannerImg} resizeMode="cover" />
        <View style={styles.imageOverlay}>
          <Animated.Text style={[styles.imageTitle, { opacity: cOpacity, transform: [{ translateY: cY }] }]}>
            {item.title}
          </Animated.Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: item.bg }]}>
      <Animated.Text style={[styles.cardEmoji, { transform: [{ translateY: emojiY }, { scale: emojiScale }] }]}>
        {item.emoji}
      </Animated.Text>
      <Animated.View pointerEvents="none" style={[styles.shimmer, { transform: [{ translateX: shimmerX }] }]} />
      <Animated.View style={{ opacity: cOpacity, transform: [{ translateY: cY }] }}>
        <Text style={styles.cardTag}>{item.tag}</Text>
        <Text style={styles.cardLabel}>{item.label}</Text>
        {item.sub && <Text style={styles.cardSub}>{item.sub}</Text>}
      </Animated.View>
      <Animated.View style={[styles.badge, { backgroundColor: item.badgeColor, transform: [{ scale: badgeScale }] }]}>
        <Text style={[styles.badgeText, { color: item.badgeColor === '#fff' ? '#e67e22' : '#1a1a1a' }]}>
          {item.badge}
        </Text>
      </Animated.View>
    </View>
  );
}

/* ─── Main carousel ──────────────────────────────────────────────────────── */
export default function PromoBanners() {
  const [ads, setAds]                 = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const currentRef  = useRef(0);
  const animsRef    = useRef([]);
  const autoTimer   = useRef(null);
  const isAnimating = useRef(false);

  useEffect(() => {
    fetch(`${API_URL}/api/ad/`)
      .then(r => r.json())
      .then(data => setAds((data.ads || []).filter(a => a.isActive)))
      .catch(() => {});
  }, []);

  const realItems = ads.length > 0 ? ads : fallbacks;
  const N = realItems.length;

  /* Build per-card animated values once N is known */
  if (animsRef.current.length !== N) {
    animsRef.current = realItems.map((_, i) => ({
      x:       new Animated.Value(0),
      scale:   new Animated.Value(i === 0 ? 1 : 0.72),
      opacity: new Animated.Value(i === 0 ? 1 : 0.45),
    }));
  }

  /* Circular position math — same as Testimonials widget */
  const applyLayout = (idx, animated = true) => {
    animsRef.current.forEach((anim, i) => {
      let offset = i - idx;
      while (offset >  N / 2) offset -= N;
      while (offset < -N / 2) offset += N;

      const angle  = (offset / N) * 2 * Math.PI;
      const xVal   = Math.sin(angle) * RADIUS;
      const zNorm  = (Math.cos(angle) + 1) / 2;   // 0..1, front = 1
      const scaleV = 0.6 + 0.4 * zNorm;
      const opacV  = 0.25 + 0.75 * zNorm;

      if (animated) {
        Animated.parallel([
          Animated.spring(anim.x,       { toValue: xVal,   useNativeDriver: true, speed: 16, bounciness: 4 }),
          Animated.spring(anim.scale,    { toValue: scaleV, useNativeDriver: true, speed: 16, bounciness: 4 }),
          Animated.timing(anim.opacity,  { toValue: opacV,  duration: 350, useNativeDriver: true }),
        ]).start();
      } else {
        anim.x.setValue(xVal);
        anim.scale.setValue(scaleV);
        anim.opacity.setValue(opacV);
      }
    });
  };

  useEffect(() => { applyLayout(0, false); }, [N]);

  const goTo = (idx) => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    const next = ((idx % N) + N) % N;
    currentRef.current = next;
    setActiveIndex(next);
    applyLayout(next, true);
    setTimeout(() => { isAnimating.current = false; }, 500);
  };

  /* Auto-rotate */
  const resetTimer = () => {
    clearInterval(autoTimer.current);
    autoTimer.current = setInterval(() => goTo(currentRef.current + 1), INTERVAL_MS);
  };
  useEffect(() => { resetTimer(); return () => clearInterval(autoTimer.current); }, [N]);

  /* Swipe */
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  (_, g) => Math.abs(g.dx) > 8,
      onPanResponderRelease: (_, g) => {
        resetTimer();
        if (Math.abs(g.dx) > 40) goTo(currentRef.current + (g.dx < 0 ? 1 : -1));
      },
    })
  ).current;

  /* Dot animations */
  const dotWidths    = useRef(Array.from({ length: 10 }, (_, i) => new Animated.Value(i === 0 ? 22 : 6))).current;
  const dotOpacities = useRef(Array.from({ length: 10 }, (_, i) => new Animated.Value(i === 0 ? 1 : 0.35))).current;

  useEffect(() => {
    for (let i = 0; i < N; i++) {
      Animated.spring(dotWidths[i],    { toValue: i === activeIndex ? 22 : 6,    useNativeDriver: false, speed: 20, bounciness: 6 }).start();
      Animated.timing(dotOpacities[i], { toValue: i === activeIndex ? 1 : 0.35, duration: 300,          useNativeDriver: false }).start();
    }
  }, [activeIndex]);

  /* Progress bar */
  const progressAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    progressAnim.setValue(0);
    const prog = Animated.timing(progressAnim, {
      toValue: 1, duration: INTERVAL_MS - 100,
      easing: Easing.linear, useNativeDriver: false,
    });
    prog.start();
    return () => prog.stop();
  }, [activeIndex]);

  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={styles.wrapper}>

      {/* ── 3D Stage ── */}
      <View style={styles.stage} {...panResponder.panHandlers}>
        {realItems.map((item, i) => {
          const anim = animsRef.current[i];
          if (!anim) return null;
          return (
            <Animated.View
              key={i}
              style={[
                styles.cardWrapper,
                {
                  transform: [{ translateX: anim.x }, { scale: anim.scale }],
                  opacity: anim.opacity,
                  zIndex: i === activeIndex ? 10 : 1,
                },
              ]}
            >
              <TouchableOpacity activeOpacity={0.9} onPress={() => { goTo(i); resetTimer(); }}>
                <BannerCard item={item} />
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
      </View>

      {/* Dots */}
      <View style={styles.dots}>
        {realItems.map((_, i) => (
          <Animated.View
            key={i}
            style={[styles.dot, {
              width:           dotWidths[i],
              opacity:         dotOpacities[i],
              backgroundColor: i === activeIndex ? '#1a6b1a' : '#888',
            }]}
          />
        ))}
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 24 },

  stage: {
    height: CARD_HEIGHT + 24,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardWrapper: {
    position: 'absolute',
    width: CARD_WIDTH,
  },

  card: {
    borderRadius: 14,
    padding: 18,
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    justifyContent: 'space-between',
    overflow: 'hidden',
    position: 'relative',
  },
  cardEmoji: {
    position: 'absolute', right: 14, top: '20%',
    fontSize: 72, opacity: 0.22,
  },
  shimmer: {
    position: 'absolute', top: 0, bottom: 0, width: 50,
    backgroundColor: 'rgba(255,255,255,0.12)',
    transform: [{ skewX: '-20deg' }],
  },
  cardTag:   { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginBottom: 4, letterSpacing: 1 },
  cardLabel: { fontSize: 22, fontWeight: '900', color: '#fff', lineHeight: 26 },
  cardSub:   { fontSize: 12, fontWeight: '700', color: '#fff', opacity: 0.8, marginTop: 2 },
  badge: {
    alignSelf: 'flex-start', paddingHorizontal: 12,
    paddingVertical: 4, borderRadius: 6, marginTop: 10,
  },
  badgeText: { fontWeight: '900', fontSize: 12, letterSpacing: 0.5 },

  bannerImg:    { width: '100%', height: '100%' },
  imageOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)', padding: 12,
  },
  imageTitle: { color: '#fff', fontWeight: '700', fontSize: 14, textAlign: 'center' },

  progressTrack: {
    height: 2, backgroundColor: 'rgba(0,0,0,0.08)',
    marginHorizontal: 24, marginTop: 10, borderRadius: 2, overflow: 'hidden',
  },
  progressBar: { height: '100%', backgroundColor: '#1a6b1a', borderRadius: 2 },

  dots: {
    flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', marginTop: 8, gap: 5,
  },
  dot: { height: 6, borderRadius: 3 },
});