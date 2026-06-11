// src/components/AppLoader.jsx
// Matches the web PageLoader exactly — same animations, same brand colors
// Uses only React Native core (no react-native-svg, no third-party deps)
// Drop-in usage: {!appReady && <AppLoader fading={fadeOut} />}

import { useEffect, useRef } from "react";
import {
    Animated,
    Dimensions,
    Easing,
    Modal,
    StyleSheet,
    Text,
    View,
} from "react-native";

const { width: SW } = Dimensions.get("window");

const GREEN  = "#4CAF50";
const ORANGE = "#FF6B2B";
const WORD   = ["G","r","a","m","i","n","K","a","r","t"];
const GREEN_LETTERS  = 6;  // "Gramin" = indices 0-5
// "Kart"   = indices 6-9

// ─────────────────────────────────────────────────────────────────────────────
// Pulse ring — fades out + scales up, loops
// ─────────────────────────────────────────────────────────────────────────────
const PulseRing = ({ color, delay }) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, {
          toValue: 1, duration: 1800,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const scale   = anim.interpolate({ inputRange: [0,1], outputRange: [0.8, 1.6] });
  const opacity = anim.interpolate({ inputRange: [0,0.3,1], outputRange: [0, 0.5, 0] });

  return (
    <Animated.View
      style={[
        st.pulseRing,
        { borderColor: color, transform: [{ scale }], opacity },
      ]}
      pointerEvents="none"
    />
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Cart SVG — drawn purely with Views (no react-native-svg needed)
// Matches the web SVG structure: cart body, wheels, handle
// ─────────────────────────────────────────────────────────────────────────────
const CartIcon = ({ slideAnim }) => (
  <Animated.View style={[st.cartWrap, { transform: [{ translateX: slideAnim }] }]}>
    {/* Cart body */}
    <View style={st.cartBody} />
    {/* Handle top */}
    <View style={st.cartHandle} />
    {/* Stick from handle */}
    <View style={st.cartStick} />
    {/* Wheel left */}
    <View style={[st.wheel, { left: 8 }]} />
    {/* Wheel right */}
    <View style={[st.wheel, { left: 28 }]} />
    {/* Orange accent dot */}
    <View style={st.accentDot} />
  </Animated.View>
);

// ─────────────────────────────────────────────────────────────────────────────
// Single animated letter — floats up/down, staggered
// ─────────────────────────────────────────────────────────────────────────────
const AnimLetter = ({ char, color, delay }) => {
  const y = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(y, { toValue: -8, duration: 400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(y, { toValue: 0,  duration: 400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.delay(1600 - delay),           // fill remaining of the 1.6s period
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.Text style={[st.letter, { color, transform: [{ translateY: y }] }]}>
      {char}
    </Animated.Text>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Progress bar — width oscillates 0 → 100% → 0, matching web `gk-bar`
// ─────────────────────────────────────────────────────────────────────────────
const ProgressBar = () => {
  const prog = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(prog, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        Animated.timing(prog, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const width = prog.interpolate({ inputRange: [0,1], outputRange: ["0%", "100%"] });

  return (
    <View style={st.barTrack}>
      <Animated.View style={[st.barFill, { width }]} />
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Trailing dots — each bounces in/out staggered, matching web `gk-dot`
// ─────────────────────────────────────────────────────────────────────────────
const Dot = ({ color, delay }) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 300, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 300, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.delay(1200 - delay - 300),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const scale   = anim.interpolate({ inputRange: [0,1], outputRange: [0.6, 1] });
  const opacity = anim.interpolate({ inputRange: [0,1], outputRange: [0.2, 1] });

  return (
    <Animated.View
      style={[st.dot, { backgroundColor: color, transform: [{ scale }], opacity }]}
    />
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Float animation for the whole cart container
// ─────────────────────────────────────────────────────────────────────────────
const FloatWrap = ({ children }) => {
  const floatY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, { toValue: -10, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(floatY, { toValue: 0,   duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View style={{ transform: [{ translateY: floatY }] }}>
      {children}
    </Animated.View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main loader
// ─────────────────────────────────────────────────────────────────────────────
export default function AppLoader({ fading, visible = true }) {
  const opacity   = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(-60)).current;

  // Fade out when `fading` becomes true
  useEffect(() => {
    if (fading) {
      Animated.timing(opacity, {
        toValue: 0, duration: 1000,
        easing: Easing.ease,
        useNativeDriver: true,
      }).start();
    }
  }, [fading]);

  // Cart slide-in on mount (runs once)
  useEffect(() => {
    Animated.sequence([
      Animated.delay(200),
      Animated.spring(slideAnim, {
        toValue: 0, tension: 60, friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    // Modal ensures loader renders ABOVE the entire Stack navigator —
    // blank white screen guaranteed until app is fully ready
    <Modal
      visible={visible}
      transparent={false}
      animationType="none"
      statusBarTranslucent>
      <Animated.View style={[st.root, { opacity }]}>

        {/* ── Circle background + pulse rings + cart ── */}
        <View style={st.cartContainer}>
          <PulseRing color={GREEN  + "33"} delay={0}    />
          <PulseRing color={ORANGE + "33"} delay={600}  />

          {/* Circle */}
          <View style={st.circle}>
            <FloatWrap>
              <CartIcon slideAnim={slideAnim} />
            </FloatWrap>
          </View>
        </View>

        {/* ── Animated letters: "Gramin" green + "Kart" orange ── */}
        <View style={st.wordRow}>
          {WORD.map((ch, i) => (
            <AnimLetter
              key={i}
              char={ch}
              color={i < GREEN_LETTERS ? GREEN : ORANGE}
              delay={i * 80}
            />
          ))}
        </View>

        {/* ── Progress bar ── */}
        <ProgressBar />

        {/* ── Trailing dots ── */}
        <View style={st.dotsRow}>
          {[0,1,2,3,4].map(i => (
            <Dot key={i} color={i % 2 === 0 ? GREEN : ORANGE} delay={i * 150} />
          ))}
        </View>

        {/* ── Tagline ── */}
        <Text style={st.tagline}>FRESH PICKS LOADING...</Text>

      </Animated.View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  root: {
     flex: 1,
    backgroundColor: "#fff",
    alignItems:      "center",
    justifyContent:  "center",
    zIndex:          9999,
  },

  // ── Cart section ──
  cartContainer: {
    width:  90,
    height: 90,
    alignItems:     "center",
    justifyContent: "center",
    marginBottom:   8,
  },
  pulseRing: {
    position:     "absolute",
    width:        90,
    height:       90,
    borderRadius: 45,
    borderWidth:  2,
  },
  circle: {
    width:           72,
    height:          72,
    borderRadius:    36,
    backgroundColor: "#f0faf0",
    borderWidth:     1.5,
    borderColor:     GREEN,
    alignItems:      "center",
    justifyContent:  "center",
    overflow:        "hidden",
  },

  // ── Cart drawn from Views ──
  cartWrap: {
    width:  48,
    height: 44,
    position: "relative",
  },
  cartBody: {
    position:        "absolute",
    bottom:          10,
    left:            4,
    width:           36,
    height:          18,
    borderWidth:     2.2,
    borderColor:     GREEN,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    borderBottomLeftRadius:  2,
    backgroundColor: "transparent",
  },
  cartHandle: {
    position:        "absolute",
    top:             6,
    left:            2,
    width:           16,
    height:          2,
    backgroundColor: GREEN,
    borderRadius:    1,
    transform:       [{ rotate: "-35deg" }],
  },
  cartStick: {
    position:        "absolute",
    top:             4,
    left:            16,
    width:           2,
    height:          8,
    backgroundColor: GREEN,
    borderRadius:    1,
  },
  wheel: {
    position:        "absolute",
    bottom:          2,
    width:           8,
    height:          8,
    borderRadius:    4,
    backgroundColor: ORANGE,
  },
  accentDot: {
    position:        "absolute",
    top:             2,
    right:           6,
    width:           5,
    height:          5,
    borderRadius:    2.5,
    backgroundColor: ORANGE,
  },

  // ── Letters ──
  wordRow: {
    flexDirection:  "row",
    alignItems:     "flex-end",
    marginTop:      16,
    marginBottom:   6,
  },
  letter: {
    fontSize:   36,
    fontWeight: "700",
  },

  // ── Progress bar ──
  barTrack: {
    width:        180,
    height:       3,
    backgroundColor: "#eee",
    borderRadius: 99,
    overflow:     "hidden",
    marginBottom: 16,
  },
  barFill: {
    height:       "100%",
    borderRadius: 99,
    // Gradient approximated with a solid brand color blend —
    // LinearGradient needs expo-linear-gradient. Using orange which
    // blends visually between green and orange at ~50%.
    backgroundColor: ORANGE,
  },

  // ── Dots ──
  dotsRow: {
    flexDirection: "row",
    gap:           6,
    alignItems:    "center",
  },
  dot: {
    width:        7,
    height:       7,
    borderRadius: 3.5,
  },

  // ── Tagline ──
  tagline: {
    marginTop:    14,
    fontSize:     11,
    color:        "#bbb",
    letterSpacing: 1.5,
  },
});