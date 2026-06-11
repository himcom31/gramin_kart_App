import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Modal, ScrollView, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import ProductCard from '../src/components/ProductCard';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

const SORT_OPTIONS = [
  { value: 'default',    label: 'Default' },
  { value: 'price-asc',  label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'rating',     label: 'Top Rated' },
  { value: 'newest',     label: 'Newest First' },
  { value: 'discount',   label: 'Biggest Discount' },
  { value: 'name-asc',   label: 'Name: A-Z' },
  { value: 'name-desc',  label: 'Name: Z-A' },
];

const RATING_OPTIONS = [
  { value: 4, label: '4★ & above' },
  { value: 3, label: '3★ & above' },
  { value: 2, label: '2★ & above' },
];

const DISCOUNT_OPTIONS = [
  { value: 10, label: '10% or more' },
  { value: 25, label: '25% or more' },
  { value: 50, label: '50% or more' },
];

export default function ProductsScreen() {
  const router = useRouter();
  const { categoryId, search } = useLocalSearchParams();

  const [products, setProducts]         = useState([]);
  const [categories, setCategories]     = useState([]);
  const [loading, setLoading]           = useState(true);
  const [searchQuery, setSearchQuery]   = useState(search || '');
  const [searchInput, setSearchInput]   = useState(search || '');
  const [selectedCats, setSelectedCats] = useState(categoryId ? [categoryId] : []);
  const [sortBy, setSortBy]             = useState('default');
  const [maxPrice, setMaxPrice]         = useState(1000);
  const [priceMax, setPriceMax]         = useState(1000);
  const [minRating, setMinRating]       = useState(null);
  const [minDiscount, setMinDiscount]   = useState(null);
  const [inStockOnly, setInStockOnly]   = useState(false);
  const [onSaleOnly, setOnSaleOnly]     = useState(false);
  const [filterOpen, setFilterOpen]     = useState(false);
  const [sortOpen, setSortOpen]         = useState(false);
  const [view, setView]                 = useState('grid');
  const [currentPage, setCurrentPage]   = useState(1);
  const [activeFilterTab, setActiveFilterTab] = useState('category');
  const PER_PAGE = 20;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const catRes = await fetch(`${API_URL}/api/Category/all`);
        const catData = await catRes.json();
        const cats = Array.isArray(catData) ? catData : catData.categories || [];
        setCategories(cats.filter(c => c.isActive !== false));

        let all = [], page = 1, totalPages = 1;
        do {
          const res = await fetch(`${API_URL}/api/Products/allFree?page=${page}&limit=100`);
          const data = await res.json();
          const batch = Array.isArray(data) ? data : data.products || data.data || [];
          all = [...all, ...batch];
          totalPages = data.totalPages || 1;
          page++;
        } while (page <= totalPages);
        setProducts(all);

        if (all.length > 0) {
          const prices = all.map(p => Number(p.price || p.buyingPrice || 0)).filter(Boolean);
          const pm = Math.ceil(Math.max(...prices));
          setPriceMax(pm);
          setMaxPrice(pm);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getProductCatId = (p) =>
    String(typeof p.category === 'object' ? p.category?.id ?? '' : p.category ?? '');

  const getProductPrice = (p) => Number(p.price || p.buyingPrice || 0);
  const getOldPrice     = (p) => Number(p.oldPrice || p.sellingPrice || 0);
  const getDiscount     = (p) => {
    const price = getProductPrice(p);
    const old   = getOldPrice(p);
    return (old && old > price) ? Math.round((1 - price / old) * 100) : 0;
  };
  const getCategoryName = (p) => {
    if (!p.category) return 'Other';
    if (typeof p.category === 'object') return p.category.name || 'Other';
    const cat = categories.find(c => String(c.id) === String(p.category));
    return cat ? cat.name : 'Other';
  };

  const isDefaultView = !searchQuery && selectedCats.length === 0
    && maxPrice >= priceMax && !minRating && !minDiscount && !inStockOnly && !onSaleOnly
    && sortBy === 'default';

  const filtered = products.filter(p => {
    const price    = getProductPrice(p);
    const catId    = getProductCatId(p);
    const rating   = p.rating || 4;
    const name     = (p.name || p.title || '').toLowerCase();
    const inStock  = (p.stockQuantity ?? 0) > 0;
    const discount = getDiscount(p);
    const hasOldP  = getOldPrice(p) > 0;

    if (searchQuery && !name.includes(searchQuery.toLowerCase())) return false;
    if (selectedCats.length && !selectedCats.includes(catId)) return false;
    if (price > maxPrice) return false;
    if (minRating && rating < minRating) return false;
    if (minDiscount && discount < minDiscount) return false;
    if (inStockOnly && !inStock) return false;
    if (onSaleOnly && !hasOldP) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const pa = getProductPrice(a), pb = getProductPrice(b);
    const da = getDiscount(a),     db = getDiscount(b);
    switch (sortBy) {
      case 'price-asc':  return pa - pb;
      case 'price-desc': return pb - pa;
      case 'rating':     return (b.rating || 4) - (a.rating || 4);
      case 'discount':   return db - da;
      case 'name-asc':   return (a.name || '').localeCompare(b.name || '');
      case 'name-desc':  return (b.name || '').localeCompare(a.name || '');
      default: return 0;
    }
  });

  const totalPages = Math.ceil(sorted.length / PER_PAGE);
  const paginated  = sorted.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  const catCounts = categories.reduce((acc, cat) => {
    acc[String(cat.id)] = products.filter(p => getProductCatId(p) === String(cat.id)).length;
    return acc;
  }, {});

  const defaultGroups = isDefaultView
    ? categories.filter(cat => (catCounts[String(cat.id)] || 0) > 0).map(cat => ({
        cat,
        products: products.filter(p => getProductCatId(p) === String(cat.id)).slice(0, 4),
        totalCount: catCounts[String(cat.id)] || 0,
      }))
    : [];

  const activeFiltersCount = selectedCats.length
    + (maxPrice < priceMax ? 1 : 0)
    + (minRating ? 1 : 0)
    + (minDiscount ? 1 : 0)
    + (inStockOnly ? 1 : 0)
    + (onSaleOnly ? 1 : 0);

  const clearAllFilters = () => {
    setSelectedCats([]); setMaxPrice(priceMax); setMinRating(null);
    setMinDiscount(null); setInStockOnly(false); setOnSaleOnly(false);
    setSortBy('default'); setSearchQuery(''); setSearchInput('');
    setCurrentPage(1);
  };

  const toggleCat = (id) => {
    const sid = String(id);
    setSelectedCats(s => s.includes(sid) ? s.filter(x => x !== sid) : [...s, sid]);
    setCurrentPage(1);
  };

  const renderPair = (list, index) => {
    const a = list[index * 2];
    const b = list[index * 2 + 1];
    return (
      <View style={s.productRow} key={index}>
        <View style={{ flex: 1 }}><ProductCard product={a} compact /></View>
        {b
          ? <View style={{ flex: 1 }}><ProductCard product={b} compact /></View>
          : <View style={{ flex: 1 }} />}
      </View>
    );
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#2d9e2d" size="large" />;

  return (
    <SafeAreaView style={s.container} edges={['top']}>

      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>
          {searchQuery ? `"${searchQuery}"` : 'All Products'}
        </Text>
        <TouchableOpacity
          style={[s.filterIconBtn, activeFiltersCount > 0 && s.filterIconBtnActive]}
          onPress={() => setFilterOpen(true)}
        >
          <Text style={[s.filterIcon, activeFiltersCount > 0 && { color: '#fff' }]}>⚙</Text>
          {activeFiltersCount > 0 && (
            <View style={s.filterBadge}>
              <Text style={s.filterBadgeText}>{activeFiltersCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Search bar ── */}
      <View style={s.searchRow}>
        <TextInput
          style={s.searchInput}
          placeholder="Search products..."
          value={searchInput}
          onChangeText={setSearchInput}
          onSubmitEditing={() => { setSearchQuery(searchInput.trim()); setCurrentPage(1); }}
          returnKeyType="search"
          placeholderTextColor="#aaa"
        />
        {searchInput ? (
          <TouchableOpacity onPress={() => { setSearchInput(''); setSearchQuery(''); setCurrentPage(1); }}>
            <Text style={{ color: '#aaa', fontSize: 16, paddingHorizontal: 8 }}>✕</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={s.searchBtn}
          onPress={() => { setSearchQuery(searchInput.trim()); setCurrentPage(1); }}
        >
          <Text style={s.searchBtnText}>Search</Text>
        </TouchableOpacity>
      </View>

      {/* ── Toolbar: sort + view toggle + count ── */}
      <View style={s.toolbar}>
        <Text style={s.countText}>
          {isDefaultView ? `${products.length} products` : `${sorted.length} found`}
        </Text>
        <View style={{ flex: 1 }} />

        {/* Sort button */}
        <TouchableOpacity style={s.sortBtn} onPress={() => setSortOpen(true)}>
          <Text style={s.sortBtnText}>
            {SORT_OPTIONS.find(o => o.value === sortBy)?.label || 'Sort'}
          </Text>
          <Text style={{ color: '#666', fontSize: 10 }}>▼</Text>
        </TouchableOpacity>

        {/* Grid/List toggle */}
        <View style={s.viewToggle}>
          <TouchableOpacity
            style={[s.viewBtn, view === 'grid' && s.viewBtnActive]}
            onPress={() => setView('grid')}
          >
            <Text style={[s.viewBtnText, view === 'grid' && { color: '#fff' }]}>⊞</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.viewBtn, view === 'list' && s.viewBtnActive]}
            onPress={() => setView('list')}
          >
            <Text style={[s.viewBtnText, view === 'list' && { color: '#fff' }]}>☰</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Active filter chips ── */}
      {(activeFiltersCount > 0 || searchQuery) ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.chipsRow}
          contentContainerStyle={{ gap: 6, paddingHorizontal: 12, paddingVertical: 6 }}
        >
          {searchQuery ? (
            <TouchableOpacity style={s.chip} onPress={() => { setSearchQuery(''); setSearchInput(''); }}>
              <Text style={s.chipText}>"{searchQuery}" ✕</Text>
            </TouchableOpacity>
          ) : null}
          {selectedCats.map(id => {
            const cat = categories.find(c => String(c.id) === id);
            return cat ? (
              <TouchableOpacity key={id} style={s.chip} onPress={() => toggleCat(id)}>
                <Text style={s.chipText}>{cat.name} ✕</Text>
              </TouchableOpacity>
            ) : null;
          })}
          {maxPrice < priceMax ? (
            <TouchableOpacity style={s.chip} onPress={() => setMaxPrice(priceMax)}>
              <Text style={s.chipText}>Under ₹{maxPrice} ✕</Text>
            </TouchableOpacity>
          ) : null}
          {minRating ? (
            <TouchableOpacity style={s.chip} onPress={() => setMinRating(null)}>
              <Text style={s.chipText}>{minRating}★+ ✕</Text>
            </TouchableOpacity>
          ) : null}
          {minDiscount ? (
            <TouchableOpacity style={s.chip} onPress={() => setMinDiscount(null)}>
              <Text style={s.chipText}>{minDiscount}%+ off ✕</Text>
            </TouchableOpacity>
          ) : null}
          {inStockOnly ? (
            <TouchableOpacity style={s.chip} onPress={() => setInStockOnly(false)}>
              <Text style={s.chipText}>In Stock ✕</Text>
            </TouchableOpacity>
          ) : null}
          {onSaleOnly ? (
            <TouchableOpacity style={s.chip} onPress={() => setOnSaleOnly(false)}>
              <Text style={s.chipText}>On Sale ✕</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={s.chipClear} onPress={clearAllFilters}>
            <Text style={s.chipClearText}>Clear all</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : null}

      {/* ── Products ── */}
      {isDefaultView ? (
        /* Default: grouped by category */
        <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 40 }}>
          {defaultGroups.length === 0 ? (
            <View style={s.empty}>
              <Text style={{ fontSize: 40, marginBottom: 10 }}>📦</Text>
              <Text style={s.emptyText}>No products yet</Text>
            </View>
          ) : defaultGroups.map(({ cat, products: catProds, totalCount }) => (
            <View key={cat.id} style={{ marginBottom: 28 }}>
              {/* Category header */}
              <View style={s.catHeader}>
                <View style={s.catHeaderLeft}>
                  <View style={s.catAccent} />
                  <Text style={s.catTitle}>{cat.name}</Text>
                  <View style={s.catCountBadge}>
                    <Text style={s.catCountBadgeText}>{totalCount}</Text>
                  </View>
                </View>
                {totalCount > 2 ? (
                  <TouchableOpacity
                    onPress={() => { setSelectedCats([String(cat.id)]); setCurrentPage(1); }}
                  >
                    <Text style={s.viewAllText}>View all →</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              {/* 2-column grid */}
              {Array.from({ length: Math.ceil(catProds.length / 2) }).map((_, i) => renderPair(catProds, i))}
            </View>
          ))}
        </ScrollView>
      ) : (
        /* Filtered: flat paginated list */
        <FlatList
          data={Array.from({ length: Math.ceil(paginated.length / 2) })}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
          renderItem={({ index }) => renderPair(paginated, index)}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={{ fontSize: 40, marginBottom: 10 }}>🔍</Text>
              <Text style={s.emptyText}>No products found</Text>
              <TouchableOpacity style={s.clearAllBtn} onPress={clearAllFilters}>
                <Text style={s.clearAllBtnText}>Clear All Filters</Text>
              </TouchableOpacity>
            </View>
          }
          ListFooterComponent={
            totalPages > 1 ? (
              <View style={s.pagination}>
                <TouchableOpacity
                  style={[s.pageBtn, currentPage === 1 && s.pageBtnDisabled]}
                  onPress={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <Text style={[s.pageBtnText, currentPage === 1 && { color: '#ccc' }]}>←</Text>
                </TouchableOpacity>

                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
                  const n = start + i;
                  if (n > totalPages) return null;
                  return (
                    <TouchableOpacity
                      key={n}
                      style={[s.pageBtn, currentPage === n && s.pageBtnActive]}
                      onPress={() => setCurrentPage(n)}
                    >
                      <Text style={[s.pageBtnText, currentPage === n && { color: '#fff' }]}>{n}</Text>
                    </TouchableOpacity>
                  );
                })}

                <TouchableOpacity
                  style={[s.pageBtn, currentPage === totalPages && s.pageBtnDisabled]}
                  onPress={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <Text style={[s.pageBtnText, currentPage === totalPages && { color: '#ccc' }]}>→</Text>
                </TouchableOpacity>

                <Text style={s.pageInfo}>
                  {(currentPage - 1) * PER_PAGE + 1}–{Math.min(currentPage * PER_PAGE, sorted.length)} of {sorted.length}
                </Text>
              </View>
            ) : null
          }
        />
      )}

      {/* ── Sort Modal ── */}
      <Modal visible={sortOpen} animationType="slide" transparent onRequestClose={() => setSortOpen(false)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setSortOpen(false)} />
        <View style={s.drawer}>
          <View style={s.drawerHandle} />
          <View style={s.drawerHeader}>
            <Text style={s.drawerTitle}>Sort by</Text>
            <TouchableOpacity onPress={() => setSortOpen(false)}>
              <Text style={{ fontSize: 20, color: '#666' }}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView>
            {SORT_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[s.drawerItem, sortBy === opt.value && s.drawerItemActive]}
                onPress={() => { setSortBy(opt.value); setSortOpen(false); setCurrentPage(1); }}
              >
                <Text style={[s.drawerItemText, sortBy === opt.value && s.drawerItemTextActive]}>
                  {opt.label}
                </Text>
                {sortBy === opt.value ? <Text style={{ color: '#2d9e2d' }}>✓</Text> : null}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* ── Filter Modal ── */}
      <Modal visible={filterOpen} animationType="slide" transparent onRequestClose={() => setFilterOpen(false)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setFilterOpen(false)} />
        <View style={[s.drawer, { maxHeight: '90%' }]}>
          <View style={s.drawerHandle} />

          {/* Filter header */}
          <View style={s.drawerHeader}>
            <Text style={s.drawerTitle}>
              Filters {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ''}
            </Text>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              {activeFiltersCount > 0 ? (
                <TouchableOpacity onPress={() => { clearAllFilters(); setFilterOpen(false); }}>
                  <Text style={{ fontSize: 12, color: '#e74c3c', fontWeight: '700' }}>Reset all</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity onPress={() => setFilterOpen(false)}>
                <Text style={{ fontSize: 20, color: '#666' }}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Filter tab pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 12 }}
          >
            {[
              { key: 'category', label: 'Category' },
              { key: 'price',    label: 'Price' },
              { key: 'rating',   label: 'Rating' },
              { key: 'discount', label: 'Discount' },
              { key: 'avail',    label: 'Availability' },
            ].map(tab => (
              <TouchableOpacity
                key={tab.key}
                style={[s.filterTab, activeFilterTab === tab.key && s.filterTabActive]}
                onPress={() => setActiveFilterTab(tab.key)}
              >
                <Text style={[s.filterTabText, activeFilterTab === tab.key && s.filterTabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ScrollView style={{ flex: 1 }}>

            {/* Category tab */}
            {activeFilterTab === 'category' ? (
              <View style={{ paddingHorizontal: 16, paddingBottom: 24 }}>
                {categories.map(cat => {
                  const sid = String(cat.id);
                  const checked = selectedCats.includes(sid);
                  const count = catCounts[sid] || 0;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[s.checkRow, checked && s.checkRowActive]}
                      onPress={() => toggleCat(cat.id)}
                    >
                      <View style={[s.checkbox, checked && s.checkboxChecked]}>
                        {checked ? <Text style={{ color: '#fff', fontSize: 10 }}>✓</Text> : null}
                      </View>
                      <Text style={[s.checkLabel, checked && s.checkLabelActive]}>{cat.name}</Text>
                      <View style={s.checkCount}>
                        <Text style={s.checkCountText}>{count}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : null}

            {/* Price tab */}
            {activeFilterTab === 'price' ? (
              <View style={{ padding: 16, paddingBottom: 24 }}>
                <Text style={s.filterSectionTitle}>Maximum Price</Text>
                <View style={s.priceDisplay}>
                  <Text style={s.priceMin}>₹0</Text>
                  <Text style={s.priceSelected}>Up to ₹{maxPrice}</Text>
                  <Text style={s.priceMax}>₹{priceMax}</Text>
                </View>
                {/* Price quick select buttons */}
                <View style={s.priceButtons}>
                  {[100, 200, 500, priceMax].map(val => (
                    <TouchableOpacity
                      key={val}
                      style={[s.priceBtn, maxPrice === val && s.priceBtnActive]}
                      onPress={() => { setMaxPrice(val); setCurrentPage(1); }}
                    >
                      <Text style={[s.priceBtnText, maxPrice === val && { color: '#fff' }]}>
                        {val === priceMax ? 'All' : `₹${val}`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={s.filterHint}>Tap a value or use custom input below</Text>
                <TextInput
                  style={s.priceInput}
                  keyboardType="numeric"
                  value={String(maxPrice)}
                  onChangeText={v => {
                    const n = parseInt(v);
                    if (!isNaN(n)) setMaxPrice(Math.min(n, priceMax));
                  }}
                  placeholder={`Max ₹${priceMax}`}
                  placeholderTextColor="#aaa"
                />
              </View>
            ) : null}

            {/* Rating tab */}
            {activeFilterTab === 'rating' ? (
              <View style={{ padding: 16, paddingBottom: 24 }}>
                <Text style={s.filterSectionTitle}>Minimum Rating</Text>
                {RATING_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[s.radioRow, minRating === opt.value && s.radioRowActive]}
                    onPress={() => { setMinRating(minRating === opt.value ? null : opt.value); setCurrentPage(1); }}
                  >
                    <View style={[s.radio, minRating === opt.value && s.radioChecked]}>
                      {minRating === opt.value ? <View style={s.radioDot} /> : null}
                    </View>
                    <Text style={s.checkLabel}>{opt.label}</Text>
                    <Text style={{ fontSize: 16 }}>
                      {'★'.repeat(opt.value)}{'☆'.repeat(5 - opt.value)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            {/* Discount tab */}
            {activeFilterTab === 'discount' ? (
              <View style={{ padding: 16, paddingBottom: 24 }}>
                <Text style={s.filterSectionTitle}>Minimum Discount</Text>
                {DISCOUNT_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[s.radioRow, minDiscount === opt.value && s.radioRowActive]}
                    onPress={() => { setMinDiscount(minDiscount === opt.value ? null : opt.value); setCurrentPage(1); }}
                  >
                    <View style={[s.radio, minDiscount === opt.value && s.radioChecked]}>
                      {minDiscount === opt.value ? <View style={s.radioDot} /> : null}
                    </View>
                    <Text style={s.checkLabel}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            {/* Availability tab */}
            {activeFilterTab === 'avail' ? (
              <View style={{ padding: 16, paddingBottom: 24 }}>
                <Text style={s.filterSectionTitle}>Availability</Text>
                <TouchableOpacity
                  style={[s.checkRow, inStockOnly && s.checkRowActive]}
                  onPress={() => { setInStockOnly(v => !v); setCurrentPage(1); }}
                >
                  <View style={[s.checkbox, inStockOnly && s.checkboxChecked]}>
                    {inStockOnly ? <Text style={{ color: '#fff', fontSize: 10 }}>✓</Text> : null}
                  </View>
                  <Text style={[s.checkLabel, inStockOnly && s.checkLabelActive]}>In Stock Only</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.checkRow, onSaleOnly && s.checkRowActive]}
                  onPress={() => { setOnSaleOnly(v => !v); setCurrentPage(1); }}
                >
                  <View style={[s.checkbox, onSaleOnly && s.checkboxChecked]}>
                    {onSaleOnly ? <Text style={{ color: '#fff', fontSize: 10 }}>✓</Text> : null}
                  </View>
                  <Text style={[s.checkLabel, onSaleOnly && s.checkLabelActive]}>On Sale</Text>
                </TouchableOpacity>
              </View>
            ) : null}

          </ScrollView>

          {/* Apply button */}
          <View style={{ padding: 16 }}>
            <TouchableOpacity style={s.applyBtn} onPress={() => setFilterOpen(false)}>
              <Text style={s.applyBtnText}>
                Show {isDefaultView ? products.length : sorted.length} Results
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#f8f8f8' },
  header:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#efefef' },
  backBtn:         { padding: 6, marginRight: 8 },
  backText:        { fontSize: 20, color: '#2d9e2d', fontWeight: '700' },
  headerTitle:     { flex: 1, fontSize: 16, fontWeight: '800', color: '#1a1a1a' },
  filterIconBtn:   { padding: 8, borderRadius: 8, backgroundColor: '#f5f5f5', position: 'relative' },
  filterIconBtnActive: { backgroundColor: '#2d9e2d' },
  filterIcon:      { fontSize: 16, color: '#333' },
  filterBadge:     { position: 'absolute', top: 2, right: 2, width: 16, height: 16, borderRadius: 8, backgroundColor: '#e74c3c', alignItems: 'center', justifyContent: 'center' },
  filterBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },

  searchRow:    { flexDirection: 'row', alignItems: 'center', margin: 10, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e0e0e0', paddingLeft: 12, overflow: 'hidden' },
  searchInput:  { flex: 1, paddingVertical: 10, fontSize: 13, color: '#333' },
  searchBtn:    { backgroundColor: '#2d9e2d', paddingHorizontal: 14, paddingVertical: 11 },
  searchBtnText:{ color: '#fff', fontWeight: '700', fontSize: 12 },

  toolbar:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  countText:    { fontSize: 12, color: '#888' },
  sortBtn:      { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  sortBtnText:  { fontSize: 12, fontWeight: '600', color: '#444', maxWidth: 120 },
  viewToggle:   { flexDirection: 'row', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, overflow: 'hidden' },
  viewBtn:      { paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#fff' },
  viewBtnActive:{ backgroundColor: '#2d9e2d' },
  viewBtnText:  { fontSize: 16, color: '#aaa' },

  chipsRow:     { maxHeight: 46 },

  chip:         { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e8f5e9', borderWidth: 1, borderColor: '#c8e6c9', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  chipText:     { fontSize: 11, fontWeight: '600', color: '#2d9e2d' },
  chipClear:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff3f3', borderWidth: 1, borderColor: '#fdd', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  chipClearText:{ fontSize: 11, fontWeight: '600', color: '#e74c3c' },

  productRow:   { flexDirection: 'row', gap: 10, marginBottom: 10 },

  catHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 8, borderBottomWidth: 2, borderBottomColor: '#f0f0f0' },
  catHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  catAccent:     { width: 4, height: 20, backgroundColor: '#2d9e2d', borderRadius: 2 },
  catTitle:      { fontSize: 15, fontWeight: '800', color: '#1a1a1a' },
  catCountBadge: { backgroundColor: '#f5f5f5', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  catCountBadgeText: { fontSize: 11, color: '#aaa' },
  viewAllText:   { fontSize: 12, fontWeight: '700', color: '#2d9e2d', backgroundColor: '#f0faf0', borderWidth: 1, borderColor: '#c8e6c9', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },

  pagination:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 6, paddingVertical: 16 },
  pageBtn:      { width: 36, height: 36, borderRadius: 8, borderWidth: 1, borderColor: '#e0e0e0', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  pageBtnActive:{ backgroundColor: '#2d9e2d', borderColor: '#2d9e2d' },
  pageBtnDisabled: { opacity: 0.4 },
  pageBtnText:  { fontSize: 13, fontWeight: '500', color: '#444' },
  pageInfo:     { fontSize: 11, color: '#aaa', marginLeft: 6 },

  empty:        { alignItems: 'center', paddingTop: 60 },
  emptyText:    { fontSize: 15, fontWeight: '600', color: '#888' },
  clearAllBtn:  { marginTop: 14, backgroundColor: '#2d9e2d', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
  clearAllBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  overlay:      { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)' },
  drawer:       { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%', paddingBottom: 20 },
  drawerHandle: { width: 40, height: 4, backgroundColor: '#e0e0e0', borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  drawerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#efefef' },
  drawerTitle:  { fontSize: 16, fontWeight: '800', color: '#1a1a1a' },
  drawerItem:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  drawerItemActive: { backgroundColor: '#f0faf0' },
  drawerItemText:   { fontSize: 14, fontWeight: '500', color: '#555' },
  drawerItemTextActive: { color: '#2d9e2d', fontWeight: '700' },

  filterTab:     { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: 'transparent' },
  filterTabActive: { backgroundColor: '#e8f5e9', borderColor: '#2d9e2d' },
  filterTabText:   { fontSize: 12, fontWeight: '600', color: '#666' },
  filterTabTextActive: { color: '#2d9e2d', fontWeight: '700' },

  filterSectionTitle: { fontSize: 13, fontWeight: '800', color: '#333', marginBottom: 12 },
  filterHint:     { fontSize: 11, color: '#aaa', marginBottom: 8, marginTop: 10 },

  checkRow:       { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 8, marginBottom: 4 },
  checkRowActive: { backgroundColor: '#f0faf0' },
  checkbox:       { width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: '#ddd', alignItems: 'center', justifyContent: 'center' },
  checkboxChecked:{ backgroundColor: '#2d9e2d', borderColor: '#2d9e2d' },
  checkLabel:     { flex: 1, fontSize: 14, color: '#444' },
  checkLabelActive: { color: '#2d9e2d', fontWeight: '600' },
  checkCount:     { backgroundColor: '#f5f5f5', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  checkCountText: { fontSize: 11, color: '#bbb', fontWeight: '700' },

  radioRow:       { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 8, marginBottom: 4 },
  radioRowActive: { backgroundColor: '#f0faf0' },
  radio:          { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#ddd', alignItems: 'center', justifyContent: 'center' },
  radioChecked:   { borderColor: '#2d9e2d' },
  radioDot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2d9e2d' },

  priceDisplay:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  priceMin:       { fontSize: 12, color: '#aaa' },
  priceSelected:  { fontSize: 14, fontWeight: '700', color: '#2d9e2d' },
  priceMax:       { fontSize: 12, color: '#aaa' },
  priceButtons:   { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 4 },
  priceBtn:       { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#e0e0e0' },
  priceBtnActive: { backgroundColor: '#2d9e2d', borderColor: '#2d9e2d' },
  priceBtnText:   { fontSize: 13, fontWeight: '600', color: '#555' },
  priceInput:     { borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#333', backgroundColor: '#fafafa' },

  applyBtn:       { backgroundColor: '#2d9e2d', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  applyBtnText:   { color: '#fff', fontWeight: '800', fontSize: 15 },
});