import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, FlatList, ActivityIndicator, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import ProductCard from '../src/components/ProductCard';
import CountdownTimer from '../src/components/CountdownTimer';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function FlashSalePage() {
  const router = useRouter();
  const [flashSale, setFlashSale] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const fsRes = await fetch(`${API_URL}/api/flash/all`);
        const fsData = await fsRes.json();
        const sales = fsData.sales || fsData.flashSales || fsData.data || [];
        const sale = sales.find(s => s.isActive) || sales[0];
        setFlashSale(sale);

        let all = [], page = 1, totalPages = 1;
        do {
          const res = await fetch(`${API_URL}/api/Products/allFree?page=${page}&limit=100`);
          const data = await res.json();
          const batch = Array.isArray(data) ? data : data.products || data.data || [];
          all = [...all, ...batch];
          totalPages = data.totalPages || 1;
          page++;
        } while (page <= totalPages);

        if (sale?.products?.length) {
          const flashIds = new Set(sale.products.map(id => typeof id === 'object' ? id.id : id));
          const matched = all.filter(p => flashIds.has(p.id));
          setProducts(matched.length > 0 ? matched : all);
        } else {
          setProducts(all);
        }

        const catRes = await fetch(`${API_URL}/api/Category/all`);
        const catData = await catRes.json();
        const cats = Array.isArray(catData) ? catData : catData.categories || [];
        setCategories(cats.filter(c => c.isActive));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getCategoryName = (product) => {
    if (!product.category) return 'Other';
    if (typeof product.category === 'object') return product.category.name || 'Other';
    const cat = categories.find(c => c.id === product.category);
    return cat ? cat.name : 'Other';
  };

  const filtered = products.filter(p => {
    const matchSearch = !searchQuery || (p.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = activeCategory === 'All' || getCategoryName(p) === activeCategory;
    return matchSearch && matchCat;
  });

  const categoryCounts = products.reduce((acc, p) => {
    const cat = getCategoryName(p);
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  const sidebarCats = ['All', ...Object.keys(categoryCounts).sort()];
  const pairs = filtered.filter((_, i) => i % 2 === 0);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#2d9e2d" size="large" />;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>

      {/* Hero */}
      <View style={styles.hero}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.heroRow}>
          <Text style={styles.flashBadge}>⚡ FLASH SALE</Text>
          {flashSale?.minDiscount ? (
            <Text style={styles.discountBadge}>Up to {flashSale.minDiscount}% OFF</Text>
          ) : null}
        </View>

        <Text style={styles.heroTitle}>{flashSale?.name || 'Flash Sale'}</Text>
        <Text style={styles.heroSub}>
          {products.length} deals · {Object.keys(categoryCounts).length} categories
        </Text>

        {flashSale?.endDate ? (
          <View style={{ marginTop: 12 }}>
            <Text style={styles.endsIn}>Sale ends in</Text>
            <CountdownTimer endDate={flashSale.endDate} endTime={flashSale.endTime} />
          </View>
        ) : null}
      </View>

      {/* Search bar */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#aaa"
        />
        <TouchableOpacity style={styles.filterBtn} onPress={() => setSidebarOpen(true)}>
          <Text style={styles.filterBtnText}>Filter</Text>
          {activeCategory !== 'All' && <View style={styles.filterDot} />}
        </TouchableOpacity>
      </View>

      {/* Result count */}
      <View style={styles.resultRow}>
        <Text style={styles.resultText}>
          <Text style={{ fontWeight: '800', color: '#1a1a1a' }}>{filtered.length}</Text>
          <Text> products</Text>
          {activeCategory !== 'All' ? <Text style={{ color: '#2d9e2d' }}> in {activeCategory}</Text> : null}
        </Text>
        {(activeCategory !== 'All' || searchQuery) ? (
          <TouchableOpacity onPress={() => { setActiveCategory('All'); setSearchQuery(''); }}>
            <Text style={styles.clearText}>x Clear</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Products */}
      <FlatList
        data={pairs}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={{ padding: 12, paddingBottom: 32 }}
        renderItem={({ index }) => {
          const a = filtered[index * 2];
          const b = filtered[index * 2 + 1];
          return (
            <View style={styles.productRow}>
              <View style={{ flex: 1 }}><ProductCard product={a} compact /></View>
              {b
                ? <View style={{ flex: 1 }}><ProductCard product={b} compact /></View>
                : <View style={{ flex: 1 }} />
              }
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 40, marginBottom: 10 }}>🔍</Text>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#888' }}>No products found</Text>
          </View>
        }
      />

      {/* Category Filter Modal */}
      <Modal
        visible={sidebarOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setSidebarOpen(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setSidebarOpen(false)}
        />
        <View style={styles.drawer}>
          <View style={styles.drawerHeader}>
            <Text style={styles.drawerTitle}>Filter by Category</Text>
            <TouchableOpacity onPress={() => setSidebarOpen(false)}>
              <Text style={{ fontSize: 20, color: '#666' }}>x</Text>
            </TouchableOpacity>
          </View>
          <ScrollView>
            {sidebarCats.map(cat => {
              const count = cat === 'All' ? products.length : (categoryCounts[cat] || 0);
              const isActive = activeCategory === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catItem, isActive && styles.catItemActive]}
                  onPress={() => { setActiveCategory(cat); setSidebarOpen(false); }}
                >
                  <Text style={[styles.catItemText, isActive && styles.catItemTextActive]}>{cat}</Text>
                  <View style={[styles.catCount, isActive && styles.catCountActive]}>
                    <Text style={[styles.catCountText, isActive && { color: '#fff' }]}>{count}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  hero: { backgroundColor: '#1a7a1a', padding: 16, paddingTop: 20 },
  backBtn: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, alignSelf: 'flex-start', marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  backText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  heroRow: { flexDirection: 'row', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  flashBadge: { backgroundColor: '#ffe600', color: '#111', fontWeight: '900', fontSize: 11, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 4 },
  discountBadge: { backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff', fontWeight: '700', fontSize: 11, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 4 },
  heroTitle: { fontSize: 26, fontWeight: '900', color: '#fff', marginBottom: 4 },
  heroSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  endsIn: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '600', marginBottom: 8 },
  searchRow: { flexDirection: 'row', padding: 12, gap: 10 },
  searchInput: { flex: 1, backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 13, borderWidth: 1, borderColor: '#e0e0e0', color: '#333' },
  filterBtn: { backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#e0e0e0', justifyContent: 'center', position: 'relative' },
  filterBtnText: { fontWeight: '700', fontSize: 13, color: '#333' },
  filterDot: { position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: '#2d9e2d' },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, marginBottom: 4 },
  resultText: { fontSize: 13, color: '#666' },
  clearText: { fontSize: 12, color: '#e74c3c', fontWeight: '700' },
  productRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  empty: { alignItems: 'center', paddingTop: 60 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)' },
  drawer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%', paddingBottom: 32 },
  drawerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#efefef' },
  drawerTitle: { fontSize: 16, fontWeight: '800', color: '#1a1a1a' },
  catItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f5f5f5', borderLeftWidth: 3, borderLeftColor: 'transparent' },
  catItemActive: { backgroundColor: '#e8f5e9', borderLeftColor: '#2d9e2d' },
  catItemText: { fontSize: 14, fontWeight: '500', color: '#555' },
  catItemTextActive: { color: '#2d9e2d', fontWeight: '700' },
  catCount: { backgroundColor: '#eee', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  catCountActive: { backgroundColor: '#2d9e2d' },
  catCountText: { fontSize: 11, fontWeight: '700', color: '#888' },
});