import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';

import { useRouter } from 'expo-router';
import { fetchWishlist } from '../../src/api/cartWishlist';
import { useAuth } from '../../src/context/AuthContext';
import ProductCard from '../../src/components/ProductCard';

export default function WishlistScreen() {
  const { isLoggedIn } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    if (!isLoggedIn) { setLoading(false); return; }
    setLoading(true);
    fetchWishlist().then(data => setProducts(data.products || [])).catch(() => {}).finally(() => setLoading(false));
  }, [isLoggedIn]));

  if (!isLoggedIn) return (
    <View style={styles.center}>
      <Text style={{ fontSize: 48, marginBottom: 12 }}>❤️</Text>
      <Text style={styles.emptyText}>Login to view wishlist</Text>
      <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/login')}>
        <Text style={styles.loginBtnText}>Login</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#2d9e2d" size="large" />;

  if (products.length === 0) return (
    <View style={styles.center}>
      <Text style={{ fontSize: 48, marginBottom: 12 }}>❤️</Text>
      <Text style={styles.emptyText}>Your wishlist is empty</Text>
    </View>
  );

  const pairs = products.filter((_, i) => i % 2 === 0);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={pairs}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ index }) => {
          const a = products[index * 2];
          const b = products[index * 2 + 1];
          return (
            <View style={styles.row}>
              <View style={{ flex: 1 }}><ProductCard product={a} compact /></View>
              {b ? <View style={{ flex: 1 }}><ProductCard product={b} compact /></View> : <View style={{ flex: 1 }} />}
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { fontSize: 15, color: '#888', marginBottom: 20 },
  loginBtn: { backgroundColor: '#2d9e2d', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 10 },
  loginBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  row: { flexDirection: 'row', gap: 10, marginBottom: 10 },
});