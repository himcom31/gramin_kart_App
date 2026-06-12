// app/(tabs)/wishlist.jsx
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EventEmitter } from '../../src/api/EventEmitter';
import { fetchWishlist } from '../../src/api/cartWishlist';
import ProductCard from '../../src/components/ProductCard';
import { useAuth } from '../../src/context/AuthContext';

// ─── Normalize wishlist response ──────────────────────────────────────────────
const normalizeWishlist = (data) =>
  data?.products ||
  data?.wishlist?.products ||
  data?.data?.products ||
  (Array.isArray(data) ? data : []);

export default function WishlistScreen() {
  const { isLoggedIn } = useAuth();
  const router         = useRouter();
  const [products, setProducts] = useState([]);
  const [loading,  setLoading]  = useState(true);

  // ── Listen for wishlist updates from anywhere in the app ──────────────────────
  useEffect(() => {
    const handler = ({ products }) => {
      if (Array.isArray(products)) setProducts(products);
    };
    EventEmitter.on('wishlist-updated', handler);
    return () => EventEmitter.off('wishlist-updated', handler);
  }, []);

  // ── Load wishlist on screen focus ─────────────────────────────────────────────
  useFocusEffect(useCallback(() => {
    if (!isLoggedIn) { setLoading(false); return; }
    setLoading(true);
    fetchWishlist()
      .then(data => setProducts(normalizeWishlist(data)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isLoggedIn]));

  // ── Guest view ────────────────────────────────────────────────────────────────
  if (!isLoggedIn) return (
    <View style={styles.center}>
      <Text style={{ fontSize: 48, marginBottom: 12 }}>❤️</Text>
      <Text style={styles.emptyText}>Login to view wishlist</Text>
      <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/login')}>
        <Text style={styles.loginBtnText}>Login</Text>
      </TouchableOpacity>
    </View>
  );

  // ── Loading ───────────────────────────────────────────────────────────────────
  if (loading) return (
    <ActivityIndicator style={{ flex: 1 }} color="#2d9e2d" size="large" />
  );

  // ── Empty ─────────────────────────────────────────────────────────────────────
  if (products.length === 0) return (
    <View style={styles.center}>
      <Text style={{ fontSize: 48, marginBottom: 12 }}>❤️</Text>
      <Text style={styles.emptyText}>Your wishlist is empty</Text>
    </View>
  );

  // ── Pair up products into rows of 2 ──────────────────────────────────────────
  const pairs = products.filter((_, i) => i % 2 === 0);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={pairs}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={{ padding: 12 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => {
          const a = item;                        // products[index * 2]
          const b = products[index * 2 + 1];    // may be undefined
          return (
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <ProductCard
                  product={a}
                  onUnwish={(id) => setProducts(prev => prev.filter(p => (p.id || p._id) !== id))}
                />
              </View>
              {b
                ? <View style={{ flex: 1 }}>
                    <ProductCard
                      product={b}
                      onUnwish={(id) => setProducts(prev => prev.filter(p => (p.id || p._id) !== id))}
                    />
                  </View>
                : <View style={{ flex: 1 }} />}
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#f8f8f8' },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText:    { fontSize: 15, color: '#888', marginBottom: 20 },
  loginBtn:     { backgroundColor: '#2d9e2d', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 10 },
  loginBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  row:          { flexDirection: 'row', gap: 10, marginBottom: 10 },
});