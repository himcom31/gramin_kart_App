// app/(tabs)/index.jsx
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Image,
  RefreshControl,
  ScrollView, StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FeatureCategories from '../../src/components/FeatureCategories';
import HeroBanner from '../../src/components/HeroBanner';
import InfoMenu from '../../src/components/InfoMenu';
import ProductCard from '../../src/components/ProductCard';
import PromoBanners from '../../src/components/PromoBanners';
import SearchBar from '../../src/components/SearchBar';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function HomeScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [catLoading, setCatLoading] = useState(true);
  const [prodLoading, setProdLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [flashSale, setFlashSale] = useState(null);

  const loadData = async () => {
    try {
      const catRes = await fetch(`${API_URL}/api/Category/all`);
      const catData = await catRes.json();
      setCategories(Array.isArray(catData) ? catData : catData.categories || []);
      setCatLoading(false);

      let all = [], page = 1, totalPages = 1;
      do {
        const res = await fetch(`${API_URL}/api/Products/allFree?page=${page}&limit=50`);
        const data = await res.json();
        const batch = Array.isArray(data) ? data : data.products || data.data || [];
        all = [...all, ...batch];
        totalPages = data.totalPages || 1;
        page++;
      } while (page <= totalPages);
      setProducts(all);

      const fsRes = await fetch(`${API_URL}/api/flash/all`);
      const fsData = await fsRes.json();
      const sales = fsData.sales || fsData.flashSales || fsData.data || [];
      const activeSale = sales.find(s => s.isActive) || sales[0];
      setFlashSale(activeSale);
    } catch (e) {
      console.error(e);
    } finally {
      setProdLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const renderPair = (list, index) => {
    const a = list[index * 2];
    const b = list[index * 2 + 1];
    return (
      <View style={styles.productRow} key={index}>
        <View style={styles.productCol}><ProductCard product={a} compact /></View>
        {b
          ? <View style={styles.productCol}><ProductCard product={b} compact /></View>
          : <View style={styles.productCol} />
        }
      </View>
    );
  };

  const popularProducts = products.slice(0, 8);
  const justForYou = products.slice(0, 12);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>

      {/* ── Sticky top bar ── */}
      <View style={styles.topBar}>
        {/* Logo */}
          <Image
            source={require('../../assets/UserLogo.png')}
            style={styles.logoImg}
            resizeMode="contain"
          />
          <View style={styles.logoText}>
            <Text style={styles.logoGramin}>Gramin</Text>
            <Text style={styles.logoKart}>Kart</Text>
          </View>
        

        {/* Search — takes remaining space */}
        <View style={styles.searchWrap}>
          <SearchBar />
        </View>

        {/* ── Info menu (single grid icon → slide-in panel) ── */}
        <InfoMenu />
      </View>

      {/* ── Scrollable content ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2d9e2d" />
        }
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <HeroBanner />

        {/* Flash Sale Banner */}
        {flashSale && (
          <TouchableOpacity
            style={styles.flashBanner}
            onPress={() => router.push('/flash-sale')}
            activeOpacity={0.9}
          >
            {(flashSale.thumbnail || flashSale.image) ? (
              <Image
                source={{ uri: flashSale.thumbnail || flashSale.image }}
                style={styles.flashBgImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.flashBgFallback} />
            )}
            <View style={styles.flashOverlay} />
            <View style={styles.flashCircle1} />
            <View style={styles.flashCircle2} />

            <View style={styles.flashTopRow}>
              {flashSale.minDiscount ? (
                <View style={styles.discountCircle}>
                  <Text style={styles.discountPct}>{flashSale.minDiscount}%</Text>
                  <Text style={styles.discountOff}>OFF</Text>
                </View>
              ) : null}
              <View style={{ flex: 1 }} />
              <View style={styles.tapExplore}>
                <Text style={styles.tapExploreText}>TAP TO EXPLORE →</Text>
              </View>
            </View>

            <View style={styles.flashBottom}>
              <View style={styles.flashTagRow}>
                <Text style={styles.flashTag}>⚡ FLASH SALE</Text>
                {flashSale.minDiscount ? (
                  <Text style={styles.flashSaveTag}>save {flashSale.minDiscount}%</Text>
                ) : null}
              </View>
              <Text style={styles.flashTitle}>{flashSale.name || 'Flash Sale'}</Text>
              {flashSale.endDate ? (
                <Text style={styles.flashEnds}>
                  Ends: {new Date(flashSale.endDate).toLocaleDateString()}
                  {flashSale.endTime ? ` at ${flashSale.endTime}` : ''}
                </Text>
              ) : null}
              <TouchableOpacity style={styles.orderBtn} onPress={() => router.push('/flash-sale')}>
                <Text style={styles.orderBtnText}>ORDER NOW ⚡</Text>
              </TouchableOpacity>
              <Text style={styles.flashWebsite}>www.graminkart.com</Text>
            </View>
          </TouchableOpacity>
        )}

        <FeatureCategories categories={categories} loading={catLoading} />

        {/* Popular Products */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Popular Products</Text>
          </View>
          {prodLoading
            ? <View style={styles.productRow}>
                {[1, 2].map(i => (
                  <View
                    key={i}
                    style={[styles.productCol, { height: 220, backgroundColor: '#f0f0f0', borderRadius: 10 }]}
                  />
                ))}
              </View>
            : [...Array(Math.ceil(popularProducts.length / 2))].map((_, i) => renderPair(popularProducts, i))
          }
        </View>

        {/* Stats Bar */}
        <View style={styles.statsBar}>
          {[
            { emoji: '👥', stat: '90%', label: 'Positive Feedback' },
            { emoji: '🕐', stat: '24/7', label: 'Online Support' },
            { emoji: '🔒', stat: '48+', label: 'Secure Payments' },
          ].map((item, i) => (
            <View key={i} style={[styles.statItem, i < 2 && styles.statBorder]}>
              <Text style={styles.statEmoji}>{item.emoji}</Text>
              <Text style={styles.statValue}>{item.stat}</Text>
              <Text style={styles.statLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        <PromoBanners />

        {/* Just For You */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Just For You</Text>
          {[...Array(Math.ceil(justForYou.length / 2))].map((_, i) => renderPair(justForYou, i))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },

  // ── Top bar ──────────────────────────────────────────────────────────────────
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 50,
    gap: 10,
  },
  logoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 0,
  },
  logoImg:   { width: 30, height: 30 },
  logoText:  { justifyContent: 'center' },
  logoGramin: { color: '#2d9e2d', fontWeight: '900', fontSize: 11, lineHeight: 14 },
  logoKart:   { color: '#f97316', fontWeight: '900', fontSize: 11, lineHeight: 14 },

  // SearchBar gets all remaining horizontal space
  searchWrap: { flex: 1, minWidth: 0 },

  // ── Scroll content ───────────────────────────────────────────────────────────
  scroll: { padding: 12 },
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle:  { fontSize: 16, fontWeight: '800', color: '#1a1a1a' },
  productRow:    { flexDirection: 'row', gap: 10, marginBottom: 10 },
  productCol:    { flex: 1 },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: '#f9fdf9',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e8f5e9',
    marginBottom: 24,
    overflow: 'hidden',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  statBorder:  { borderRightWidth: 1, borderRightColor: '#e8f5e9' },
  statEmoji:   { fontSize: 20, marginBottom: 4 },
  statValue:   { fontSize: 15, fontWeight: '800', color: '#2d9e2d' },
  statLabel:   { fontSize: 9, color: '#666', textAlign: 'center' },

  // ── Flash Sale ───────────────────────────────────────────────────────────────
  flashBanner: {
    borderRadius: 14,
    marginBottom: 20,
    overflow: 'hidden',
    position: 'relative',
    minHeight: 220,
    justifyContent: 'space-between',
  },
  flashBgImage: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    width: '100%', height: '100%',
  },
  flashBgFallback: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#1a5c1a',
  },
  flashOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  flashCircle1: {
    position: 'absolute', top: -30, right: -30,
    width: 130, height: 130, borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  flashCircle2: {
    position: 'absolute', bottom: -20, left: 120,
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  flashTopRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    padding: 14, zIndex: 2,
  },
  tapExplore: {
    backgroundColor: 'rgba(255,230,0,0.18)',
    borderWidth: 1, borderColor: 'rgba(255,230,0,0.4)',
    borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5,
  },
  tapExploreText: { color: '#ffe600', fontWeight: '700', fontSize: 11 },
  flashBottom: { padding: 14, zIndex: 2 },
  flashTagRow: {
    flexDirection: 'row', gap: 8, marginBottom: 6,
    alignItems: 'center', flexWrap: 'wrap',
  },
  flashTag: {
    backgroundColor: '#ffe600', color: '#111', fontWeight: '900',
    fontSize: 10, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4,
  },
  flashSaveTag: {
    backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff', fontWeight: '700',
    fontSize: 10, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4,
  },
  flashTitle: {
    color: '#fff', fontSize: 24, fontWeight: '900', marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  flashEnds: { color: 'rgba(255,255,255,0.8)', fontSize: 11, marginBottom: 14 },
  discountCircle: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#2d9e2d', borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },
  discountPct: { color: '#fff', fontWeight: '900', fontSize: 16, lineHeight: 18 },
  discountOff: { color: 'rgba(255,255,255,0.9)', fontWeight: '700', fontSize: 9 },
  orderBtn: {
    backgroundColor: '#ffe600', borderRadius: 10,
    paddingVertical: 13, alignItems: 'center', marginBottom: 8,
  },
  orderBtnText: { color: '#111', fontWeight: '900', fontSize: 14 },
  flashWebsite: { color: 'rgba(255,255,255,0.4)', fontSize: 10, textAlign: 'center' },
});