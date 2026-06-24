// app/(tabs)/wishlist.jsx
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { EventEmitter } from '../../src/api/EventEmitter';
import { fetchWishlist } from '../../src/api/cartWishlist';
import ProductCard from '../../src/components/ProductCard';
import { useAuth } from '../../src/context/AuthContext';

// ─── Normalize wishlist API response ─────────────────────────────────────────
// Handles different response shapes from the backend
const normalizeWishlist = (data) =>
  data?.products ||
  data?.wishlist?.products ||
  data?.data?.products ||
  (Array.isArray(data) ? data : []);

// ─── Guest State Component ────────────────────────────────────────────────────
// Shown when user is not logged in
const GuestWishlist = ({ onLogin }) => (
  <View style={styles.center}>
    <Text style={{ fontSize: 48, marginBottom: 12 }}>❤️</Text>
    <Text style={styles.emptyTitle}>Login to view your wishlist</Text>
    <Text style={styles.emptySubText}>
      Save your favourite items and access them anytime after logging in.
    </Text>
    <TouchableOpacity style={styles.loginBtn} onPress={onLogin}>
      <Text style={styles.loginBtnText}>Login / Register</Text>
    </TouchableOpacity>
  </View>
);

// ─── Empty State Component ────────────────────────────────────────────────────
// Shown when wishlist has no items
const EmptyWishlist = ({ onBrowse }) => (
  <View style={styles.center}>
    <View style={styles.iconWrap}>
      <Text style={{ fontSize: 40 }}>❤️</Text>
    </View>
    <Text style={styles.emptyTitle}>Your wishlist is empty</Text>
    <Text style={styles.emptySubText}>
      Tap the heart icon on any product to save it here for later.
    </Text>
    <TouchableOpacity style={styles.loginBtn} onPress={onBrowse}>
      <Text style={styles.loginBtnText}>Browse Products →</Text>
    </TouchableOpacity>
  </View>
);

// ─── Main Wishlist Screen ─────────────────────────────────────────────────────
export default function WishlistScreen() {
  const { isLoggedIn } = useAuth();
  const router         = useRouter();

  const [products, setProducts] = useState([]);
  const [loading,  setLoading]  = useState(true);

  // ── Listen for wishlist updates emitted from other screens ──────────────────
  useEffect(() => {
    const handler = ({ products }) => {
      if (Array.isArray(products)) setProducts(products);
    };
    EventEmitter.on('wishlist-updated', handler);
    return () => EventEmitter.off('wishlist-updated', handler);
  }, []);

  // ── Fetch wishlist whenever this screen comes into focus ────────────────────
  useFocusEffect(useCallback(() => {
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchWishlist()
      .then(data => setProducts(normalizeWishlist(data)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isLoggedIn]));

  // ── Remove a product from local wishlist state ──────────────────────────────
  const handleUnwish = (id) => {
    setProducts(prev => prev.filter(p => (p.id || p._id) !== id));
  };

  // ── Pair products into rows of 2 for grid layout ────────────────────────────
  const pairs = products.filter((_, i) => i % 2 === 0);

  // ── Guest view ──────────────────────────────────────────────────────────────
  if (!isLoggedIn) return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" translucent={false} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Wishlist</Text>
      </View>
      <GuestWishlist onLogin={() => router.push('/login')} />
    </SafeAreaView>
  );

  // ── Loading spinner ─────────────────────────────────────────────────────────
  if (loading) return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" translucent={false} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Wishlist</Text>
      </View>
      <ActivityIndicator style={{ flex: 1 }} color="#16a34a" size="large" />
    </SafeAreaView>
  );

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (products.length === 0) return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" translucent={false} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Wishlist</Text>
      </View>
      <EmptyWishlist onBrowse={() => router.push('/products')} />
    </SafeAreaView>
  );

  // ── Wishlist grid ───────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" translucent={false} />

      {/* Header with item count badge */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Wishlist</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeTxt}>
            {products.length} item{products.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {/* Product grid — 2 columns */}
      <FlatList
        data={pairs}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={{ padding: 12, paddingBottom: 20 , paddingTop: 20}}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => {
          const a = item;                      // left card
          const b = products[index * 2 + 1];  // right card (may be undefined)
          return (
            <View style={styles.row}>
              {/* Left card */}
              <View style={{ flex: 1 }}>
                <ProductCard product={a} onUnwish={handleUnwish} />
              </View>

              {/* Right card or empty placeholder */}
              {b
                ? <View style={{ flex: 1 }}>
                    <ProductCard product={b} onUnwish={handleUnwish} />
                  </View>
                : <View style={{ flex: 1 }} />
              }
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Screen container
  container: {
    flex: 1,
    backgroundColor: '#f8faf8',
  },

  // Top header bar
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },

  // Item count badge next to title
  badge: {
    backgroundColor: '#dcfce7',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeTxt: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16a34a',
  },

  // Centered empty/guest state wrapper
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },

  // Icon circle for empty state
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },

  // Empty / guest state text
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  emptySubText: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
  },

  // Login / browse button
  loginBtn: {
    marginTop: 8,
    backgroundColor: '#16a34a',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
  },
  loginBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },

  // Grid row — 2 cards side by side
  row: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
});