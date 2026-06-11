import React, { useState, useEffect, useRef } from 'react';
import { View, Image, TouchableOpacity, StyleSheet, Animated } from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function HeroBanner() {
  const [slides, setSlides] = useState([]);
  const [current, setCurrent] = useState(0);
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    fetch(`${API_URL}/api/banner/list`)
      .then(r => r.json())
      .then(data => {
        if (data.success) setSlides(data.data.filter(b => b.status === 'Active'));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (slides.length === 0) return;
    const t = setInterval(() => {
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
        setCurrent(c => (c + 1) % slides.length);
        Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      });
    }, 4500);
    return () => clearInterval(t);
  }, [slides.length]);

  if (slides.length === 0) return <View style={styles.skeleton} />;

  const goTo = (i) => {
    Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setCurrent(i);
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  };

  return (
    <View style={styles.container}>
      <Animated.Image
        source={{ uri: slides[current].bannerImage }}
        style={[styles.image, { opacity }]}
        resizeMode="cover"
      />
      <View style={styles.dotsRow}>
        {slides.map((_, i) => (
          <TouchableOpacity key={i} onPress={() => goTo(i)}>
            <View style={[styles.dot, i === current && styles.dotActive]} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', height: 200, borderRadius: 10, overflow: 'hidden', marginBottom: 20 },
  skeleton: { width: '100%', height: 200, borderRadius: 10, backgroundColor: '#e5e7eb', marginBottom: 20 },
  image: { width: '100%', height: '100%' },
  dotsRow: { position: 'absolute', bottom: 12, left: 16, flexDirection: 'row', gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.45)' },
  dotActive: { width: 22, backgroundColor: '#fff' },
});