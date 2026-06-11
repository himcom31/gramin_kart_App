import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Modal, ScrollView,
  Dimensions, StatusBar, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import ProductCard from '../../src/components/ProductCard';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const { width: SCREEN_W } = Dimensions.get('window');

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const SORT_OPTIONS = [
  { value: 'default',    label: 'Default' },
  { value: 'price-asc',  label: 'Price: Low → High' },
  { value: 'price-desc', label: 'Price: High → Low' },
  { value: 'rating',     label: 'Top Rated' },
  { value: 'newest',     label: 'Newest First' },
  { value: 'discount',   label: 'Biggest Discount' },
  { value: 'name-asc',   label: 'Name: A–Z' },
  { value: 'name-desc',  label: 'Name: Z–A' },
];

const RATING_OPTIONS = [
  { value: 4, label: '4★ & above' },
  { value: 3, label: '3★ & above' },
  { value: 2, label: '2★ & above' },
];

const DISCOUNT_OPTIONS = [
  { value: 10,  label: '10% or more' },
  { value: 25,  label: '25% or more' },
  { value: 50,  label: '50% or more' },
  { value: 70,  label: '70% or more' },
];

const PER_PAGE = 20;

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS  (aligned with working web code)
// ─────────────────────────────────────────────────────────────────────────────

/** Selling / display price  ← what the customer pays */
const getDisplayPrice = (p) => Number(p.sellingPrice || p.price || 0);

/** Buying / strike-through price  ← original / MRP */
const getStrikePrice  = (p) => Number(p.buyingPrice  || p.oldPrice  || 0);

/** Category ID, always a string */
const getCatId = (p) =>
  String(p.category_id ?? p.category?.id ?? p.category ?? '');

/** Discount % (0 if none) */
const getDiscount = (p) => {
  const sell = getDisplayPrice(p);
  const buy  = getStrikePrice(p);
  return buy > sell && buy > 0 ? Math.round((1 - sell / buy) * 100) : 0;
};

// ─────────────────────────────────────────────────────────────────────────────
// SKELETON CARD
// ─────────────────────────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <View style={s.skeletonCard}>
    <View style={s.skeletonImg} />
    <View style={{ padding: 10, gap: 6 }}>
      <View style={[s.skeletonLine, { width: '40%', height: 8 }]} />
      <View style={[s.skeletonLine, { width: '90%', height: 12 }]} />
      <View style={[s.skeletonLine, { width: '60%', height: 8 }]} />
      <View style={[s.skeletonLine, { width: '100%', height: 30, borderRadius: 8, marginTop: 4 }]} />
    </View>
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export default function ProductsScreen() {
  const router = useRouter();
  const { categoryId, search } = useLocalSearchParams();

  // ── data ──
  const [products,   setProducts]   = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading,    setLoading]    = useState(true);

  // ── search ──
  const [searchQuery, setSearchQuery] = useState(search || '');
  const [searchInput, setSearchInput] = useState(search || '');

  // ── filters ──
  const [selectedCats, setSelectedCats] = useState(categoryId ? [String(categoryId)] : []);
  const [sortBy,       setSortBy]       = useState('default');
  const [maxPrice,     setMaxPrice]     = useState(9999);
  const [priceMax,     setPriceMax]     = useState(9999);
  const [minRating,    setMinRating]    = useState(null);
  const [minDiscount,  setMinDiscount]  = useState(null);
  const [inStockOnly,  setInStockOnly]  = useState(false);
  const [onSaleOnly,   setOnSaleOnly]   = useState(false);

  // ── UI ──
  const [filterOpen,      setFilterOpen]      = useState(false);
  const [sortOpen,        setSortOpen]        = useState(false);
  const [view,            setView]            = useState('grid'); // 'grid' | 'list'
  const [currentPage,     setCurrentPage]     = useState(1);
  const [activeFilterTab, setActiveFilterTab] = useState('category');

  // ─────────────────────────────────────────────────────────────────────────
  // FETCH
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        // categories
        const catRes  = await fetch(`${API_URL}/api/Category/all`);
        const catData = await catRes.json();
        const cats = (Array.isArray(catData) ? catData : catData.categories || [])
          .filter(c => c.isActive !== false);
        if (!cancelled) setCategories(cats);

        // products (paginated)
        let all = [], page = 1, totalPages = 1;
        do {
          const res   = await fetch(`${API_URL}/api/Products/allFree?page=${page}&limit=100`);
          const data  = await res.json();
          const batch = Array.isArray(data) ? data : data.products || data.data || [];
          all       = [...all, ...batch];
          totalPages = data.totalPages || 1;
          page++;
        } while (page <= totalPages);

        if (!cancelled) {
          setProducts(all);
          if (all.length > 0) {
            // use display price for the price range ceiling
            const prices = all.map(p => getDisplayPrice(p)).filter(Boolean);
            const pm = prices.length ? Math.ceil(Math.max(...prices)) : 9999;
            setPriceMax(pm);
            setMaxPrice(pm);
          }
        }
      } catch (e) {
        console.error('ProductsScreen fetch error:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // DERIVED STATE
  // ─────────────────────────────────────────────────────────────────────────

  /** Count products per category */
  const catCounts = categories.reduce((acc, cat) => {
    acc[String(cat.id)] = products.filter(p => getCatId(p) === String(cat.id)).length;
    return acc;
  }, {});

  const isDefaultView =
    !searchQuery && selectedCats.length === 0
    && maxPrice >= priceMax
    && !minRating && !minDiscount
    && !inStockOnly && !onSaleOnly
    && sortBy === 'default';

  // Filter
  const filtered = products.filter(p => {
    const price    = getDisplayPrice(p);
    const buy      = getStrikePrice(p);
    const catId    = getCatId(p);
    const rating   = Number(p.rating || 4);
    const name     = (p.name || p.title || '').toLowerCase();
    const inStock  = (p.stockQuantity ?? 0) > 0;
    const discount = getDiscount(p);

    if (searchQuery && !name.includes(searchQuery.toLowerCase())) return false;
    if (selectedCats.length && !selectedCats.includes(catId))       return false;
    if (price > maxPrice)                                            return false;
    if (minRating   && rating    < minRating)                        return false;
    if (minDiscount && discount  < minDiscount)                      return false;
    if (inStockOnly && !inStock)                                     return false;
    if (onSaleOnly  && !buy)                                         return false;
    return true;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    const pa = getDisplayPrice(a), pb = getDisplayPrice(b);
    const da = getDiscount(a),     db = getDiscount(b);
    switch (sortBy) {
      case 'price-asc':  return pa - pb;
      case 'price-desc': return pb - pa;
      case 'rating':     return (b.rating || 4) - (a.rating || 4);
      case 'discount':   return db - da;
      case 'name-asc':   return (a.name || '').localeCompare(b.name || '');
      case 'name-desc':  return (b.name || '').localeCompare(a.name || '');
      default:           return 0;
    }
  });

  // Paginate
  const totalPages = Math.ceil(sorted.length / PER_PAGE);
  const paginated  = sorted.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  // Default grouped view
  const defaultGroups = isDefaultView
    ? categories
        .filter(cat => (catCounts[String(cat.id)] || 0) > 0)
        .map(cat => ({
          cat,
          products: products
            .filter(p => getCatId(p) === String(cat.id))
            .slice(0, 4),
          totalCount: catCounts[String(cat.id)] || 0,
        }))
    : [];

  // Active filter count (for badge)
  const activeFiltersCount =
    selectedCats.length
    + (maxPrice < priceMax ? 1 : 0)
    + (minRating  ? 1 : 0)
    + (minDiscount ? 1 : 0)
    + (inStockOnly ? 1 : 0)
    + (onSaleOnly  ? 1 : 0);

  // ─────────────────────────────────────────────────────────────────────────
  // ACTIONS
  // ─────────────────────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  /** Renders a row of 2 cards (grid) or 1 card (list) */
  const renderProductRow = (list, rowIndex) => {
    if (view === 'list') {
      const item = list[rowIndex];
      if (!item) return null;
      return (
        <View key={rowIndex} style={{ marginBottom: 10 }}>
          <ProductCard product={item} compact view="list" />
        </View>
      );
    }
    // grid: 2 per row
    const a = list[rowIndex * 2];
    const b = list[rowIndex * 2 + 1];
    if (!a) return null;
    return (
      <View style={s.productRow} key={rowIndex}>
        <View style={{ flex: 1 }}>
          <ProductCard product={a} compact />
        </View>
        {b
          ? <View style={{ flex: 1 }}><ProductCard product={b} compact /></View>
          : <View style={{ flex: 1 }} />
        }
      </View>
    );
  };

  const rowCount = view === 'list'
    ? paginated.length
    : Math.ceil(paginated.length / 2);

  const gridRowCount = view === 'list'
    ? (isDefaultView ? 0 : paginated.length)
    : Math.ceil((isDefaultView ? 0 : paginated.length) / 2);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── HEADER ── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>

        <Text style={s.headerTitle} numberOfLines={1}>
          {searchQuery ? `"${searchQuery}"` : 'All Products'}
        </Text>

        {/* Active filter count badge */}
        <TouchableOpacity
          style={[s.filterIconBtn, activeFiltersCount > 0 && s.filterIconBtnActive]}
          onPress={() => setFilterOpen(true)}
        >
          <Text style={[s.filterIconText, activeFiltersCount > 0 && { color: '#fff' }]}>⚙</Text>
          {activeFiltersCount > 0 && (
            <View style={s.filterBadge}>
              <Text style={s.filterBadgeText}>{activeFiltersCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ── SEARCH BAR ── */}
      <View style={s.searchRow}>
        <TextInput
          style={s.searchInput}
          placeholder="Search products…"
          value={searchInput}
          onChangeText={setSearchInput}
          onSubmitEditing={() => { setSearchQuery(searchInput.trim()); setCurrentPage(1); }}
          returnKeyType="search"
          placeholderTextColor="#bbb"
        />
        {searchInput ? (
          <TouchableOpacity
            onPress={() => { setSearchInput(''); setSearchQuery(''); setCurrentPage(1); }}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          >
            <Text style={{ color: '#bbb', fontSize: 15, paddingHorizontal: 6 }}>✕</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={s.searchBtn}
          onPress={() => { setSearchQuery(searchInput.trim()); setCurrentPage(1); }}
        >
          <Text style={s.searchBtnText}>Search</Text>
        </TouchableOpacity>
      </View>

      {/* ── TOOLBAR ── */}
      <View style={s.toolbar}>
        {/* Count */}
        <Text style={s.countText}>
          {loading
            ? 'Loading…'
            : isDefaultView
              ? `${products.length} products`
              : `${sorted.length} found`}
        </Text>

        <View style={{ flex: 1 }} />

        {/* Sort button */}
        <TouchableOpacity style={s.sortBtn} onPress={() => setSortOpen(true)}>
          <Text style={s.sortBtnText} numberOfLines={1}>
            {SORT_OPTIONS.find(o => o.value === sortBy)?.label || 'Sort'}
          </Text>
          <Text style={{ color: '#999', fontSize: 9 }}>▼</Text>
        </TouchableOpacity>

        {/* Grid / List toggle */}
        <View style={s.viewToggle}>
          <TouchableOpacity
            style={[s.viewBtn, view === 'grid' && s.viewBtnActive]}
            onPress={() => setView('grid')}
          >
            <Text style={[s.viewBtnIcon, view === 'grid' && { color: '#fff' }]}>⊞</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.viewBtn, view === 'list' && s.viewBtnActive]}
            onPress={() => setView('list')}
          >
            <Text style={[s.viewBtnIcon, view === 'list' && { color: '#fff' }]}>☰</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── ACTIVE FILTER CHIPS ── */}
      {(activeFiltersCount > 0 || searchQuery) ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.chipsRow}
          contentContainerStyle={{ gap: 6, paddingHorizontal: 12, paddingVertical: 7 }}
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

      {/* ── PRODUCT CONTENT ── */}
      {loading ? (
        /* Skeleton loader */
        <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 40 }}>
          {Array.from({ length: 3 }).map((_, ri) => (
            <View style={s.productRow} key={ri}>
              <View style={{ flex: 1 }}><SkeletonCard /></View>
              <View style={{ flex: 1 }}><SkeletonCard /></View>
            </View>
          ))}
        </ScrollView>
      ) : isDefaultView ? (
        /* ── DEFAULT VIEW: grouped by category ── */
        <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 40 }}>
          {defaultGroups.length === 0 ? (
            <View style={s.emptyBox}>
              <Text style={s.emptyEmoji}>📦</Text>
              <Text style={s.emptyTitle}>No products yet</Text>
              <Text style={s.emptySubtitle}>Check back soon!</Text>
            </View>
          ) : defaultGroups.map(({ cat, products: catProds, totalCount }) => (
            <View key={cat.id} style={{ marginBottom: 28 }}>
              {/* Category header */}
              <View style={s.catHeader}>
                <View style={s.catHeaderLeft}>
                  <View style={s.catAccent} />
                  <Text style={s.catTitle}>{cat.name}</Text>
                  <View style={s.catBadge}>
                    <Text style={s.catBadgeText}>{totalCount}</Text>
                  </View>
                </View>
                {totalCount > 2 ? (
                  <TouchableOpacity
                    style={s.viewAllBtn}
                    onPress={() => { setSelectedCats([String(cat.id)]); setCurrentPage(1); }}
                  >
                    <Text style={s.viewAllBtnText}>View all →</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Products grid */}
              {view === 'list'
                ? catProds.map((p, i) => (
                    <View key={i} style={{ marginBottom: 10 }}>
                      <ProductCard product={p} compact view="list" />
                    </View>
                  ))
                : Array.from({ length: Math.ceil(catProds.length / 2) }).map((_, i) => (
                    <View style={s.productRow} key={i}>
                      <View style={{ flex: 1 }}>
                        <ProductCard product={catProds[i * 2]} compact />
                      </View>
                      {catProds[i * 2 + 1]
                        ? <View style={{ flex: 1 }}><ProductCard product={catProds[i * 2 + 1]} compact /></View>
                        : <View style={{ flex: 1 }} />
                      }
                    </View>
                  ))
              }
            </View>
          ))}
        </ScrollView>
      ) : (
        /* ── FILTERED VIEW: flat paginated list ── */
        <FlatList
          data={Array.from({ length: view === 'list' ? paginated.length : Math.ceil(paginated.length / 2) })}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
          renderItem={({ index }) => renderProductRow(paginated, index)}
          ListEmptyComponent={
            <View style={s.emptyBox}>
              <Text style={s.emptyEmoji}>🔍</Text>
              <Text style={s.emptyTitle}>No products found</Text>
              <Text style={s.emptySubtitle}>Try adjusting your filters</Text>
              <TouchableOpacity style={s.clearBtn} onPress={clearAllFilters}>
                <Text style={s.clearBtnText}>Clear All Filters</Text>
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

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SORT MODAL                                                          */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <Modal
        visible={sortOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setSortOpen(false)}
      >
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setSortOpen(false)} />
        <View style={s.drawer}>
          <View style={s.drawerHandle} />
          <View style={s.drawerHeader}>
            <Text style={s.drawerTitle}>Sort by</Text>
            <TouchableOpacity onPress={() => setSortOpen(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={s.drawerClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView>
            {SORT_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[s.sortItem, sortBy === opt.value && s.sortItemActive]}
                onPress={() => { setSortBy(opt.value); setSortOpen(false); setCurrentPage(1); }}
              >
                <Text style={[s.sortItemText, sortBy === opt.value && s.sortItemTextActive]}>
                  {opt.label}
                </Text>
                {sortBy === opt.value && (
                  <Text style={{ color: '#2d9e2d', fontSize: 16 }}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* FILTER MODAL                                                        */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <Modal
        visible={filterOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setFilterOpen(false)}
      >
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setFilterOpen(false)} />
        <View style={[s.drawer, { maxHeight: '92%' }]}>
          <View style={s.drawerHandle} />

          {/* Header */}
          <View style={s.drawerHeader}>
            <Text style={s.drawerTitle}>
              Filters {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ''}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {activeFiltersCount > 0 && (
                <TouchableOpacity onPress={() => { clearAllFilters(); setFilterOpen(false); }}>
                  <Text style={s.resetText}>Reset all</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => setFilterOpen(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={s.drawerClose}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Tab pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 14, gap: 8, paddingBottom: 12, paddingTop: 4 }}
          >
            {[
              { key: 'category', label: '📦 Category' },
              { key: 'price',    label: '₹ Price' },
              { key: 'rating',   label: '★ Rating' },
              { key: 'discount', label: '% Discount' },
              { key: 'avail',    label: '✅ Availability' },
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

            {/* ── Category tab ── */}
            {activeFilterTab === 'category' && (
              <View style={s.tabContent}>
                <Text style={s.tabSectionTitle}>Select Categories</Text>
                {categories.map(cat => {
                  const sid     = String(cat.id);
                  const checked = selectedCats.includes(sid);
                  const count   = catCounts[sid] || 0;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[s.checkRow, checked && s.checkRowActive]}
                      onPress={() => toggleCat(cat.id)}
                    >
                      <View style={[s.checkbox, checked && s.checkboxChecked]}>
                        {checked && <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>✓</Text>}
                      </View>
                      <Text style={[s.checkLabel, checked && s.checkLabelActive]} numberOfLines={1}>
                        {cat.name}
                      </Text>
                      <View style={s.countBadge}>
                        <Text style={s.countBadgeText}>{count}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* ── Price tab ── */}
            {activeFilterTab === 'price' && (
              <View style={s.tabContent}>
                <Text style={s.tabSectionTitle}>Maximum Price</Text>
                <View style={s.priceDisplay}>
                  <Text style={s.priceEdge}>₹0</Text>
                  <Text style={s.priceSelected}>Up to ₹{maxPrice}</Text>
                  <Text style={s.priceEdge}>₹{priceMax}</Text>
                </View>
                {/* Quick price buttons */}
                <View style={s.priceBtnRow}>
                  {[100, 200, 500, priceMax].map(val => (
                    <TouchableOpacity
                      key={val}
                      style={[s.priceQuickBtn, maxPrice === val && s.priceQuickBtnActive]}
                      onPress={() => { setMaxPrice(val); setCurrentPage(1); }}
                    >
                      <Text style={[s.priceQuickBtnText, maxPrice === val && { color: '#fff' }]}>
                        {val === priceMax ? 'All' : `₹${val}`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={s.filterHint}>Or enter a custom amount</Text>
                <TextInput
                  style={s.priceInput}
                  keyboardType="numeric"
                  value={String(maxPrice)}
                  onChangeText={v => {
                    const n = parseInt(v);
                    if (!isNaN(n)) setMaxPrice(Math.min(n, priceMax));
                  }}
                  placeholder={`Max ₹${priceMax}`}
                  placeholderTextColor="#bbb"
                />
              </View>
            )}

            {/* ── Rating tab ── */}
            {activeFilterTab === 'rating' && (
              <View style={s.tabContent}>
                <Text style={s.tabSectionTitle}>Minimum Rating</Text>
                {RATING_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[s.radioRow, minRating === opt.value && s.radioRowActive]}
                    onPress={() => { setMinRating(minRating === opt.value ? null : opt.value); setCurrentPage(1); }}
                  >
                    <View style={[s.radio, minRating === opt.value && s.radioChecked]}>
                      {minRating === opt.value && <View style={s.radioDot} />}
                    </View>
                    <Text style={[s.checkLabel, minRating === opt.value && s.checkLabelActive]}>
                      {opt.label}
                    </Text>
                    <Text style={{ fontSize: 14, letterSpacing: 1 }}>
                      {'★'.repeat(opt.value)}{'☆'.repeat(5 - opt.value)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* ── Discount tab ── */}
            {activeFilterTab === 'discount' && (
              <View style={s.tabContent}>
                <Text style={s.tabSectionTitle}>Minimum Discount</Text>
                {DISCOUNT_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[s.radioRow, minDiscount === opt.value && s.radioRowActive]}
                    onPress={() => { setMinDiscount(minDiscount === opt.value ? null : opt.value); setCurrentPage(1); }}
                  >
                    <View style={[s.radio, minDiscount === opt.value && s.radioChecked]}>
                      {minDiscount === opt.value && <View style={s.radioDot} />}
                    </View>
                    <Text style={[s.checkLabel, minDiscount === opt.value && s.checkLabelActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* ── Availability tab ── */}
            {activeFilterTab === 'avail' && (
              <View style={s.tabContent}>
                <Text style={s.tabSectionTitle}>Availability</Text>
                {[
                  { label: 'In Stock Only', value: inStockOnly, toggle: () => { setInStockOnly(v => !v); setCurrentPage(1); } },
                  { label: 'On Sale',       value: onSaleOnly,  toggle: () => { setOnSaleOnly(v => !v);  setCurrentPage(1); } },
                ].map(item => (
                  <TouchableOpacity
                    key={item.label}
                    style={[s.checkRow, item.value && s.checkRowActive]}
                    onPress={item.toggle}
                  >
                    <View style={[s.checkbox, item.value && s.checkboxChecked]}>
                      {item.value && <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>✓</Text>}
                    </View>
                    <Text style={[s.checkLabel, item.value && s.checkLabelActive]}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

          </ScrollView>

          {/* Apply button */}
          <View style={{ padding: 14 }}>
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

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const GREEN  = '#2d9e2d';
const GREEN2 = '#218c21';
const RED    = '#e74c3c';

const s = StyleSheet.create({

  // ── Layout
  container: { flex: 1, backgroundColor: '#f5f6f8' },

  // ── Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#efefef',
    // subtle elevation
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4 }, android: { elevation: 3 } }),
  },
  backBtn:      { padding: 4, marginRight: 8 },
  backText:     { fontSize: 22, color: GREEN, fontWeight: '700' },
  headerTitle:  { flex: 1, fontSize: 16, fontWeight: '800', color: '#1a1a1a', letterSpacing: -0.3 },
  filterIconBtn:     { padding: 8, borderRadius: 10, backgroundColor: '#f0f0f0', position: 'relative' },
  filterIconBtnActive: { backgroundColor: GREEN },
  filterIconText:    { fontSize: 17, color: '#555' },
  filterBadge:       { position: 'absolute', top: 2, right: 2, width: 17, height: 17, borderRadius: 9, backgroundColor: RED, alignItems: 'center', justifyContent: 'center' },
  filterBadgeText:   { color: '#fff', fontSize: 9, fontWeight: '800' },

  // ── Search
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 12, marginVertical: 10,
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1.5, borderColor: '#e8e8e8',
    paddingLeft: 14, overflow: 'hidden',
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 }, android: { elevation: 2 } }),
  },
  searchInput:  { flex: 1, paddingVertical: 11, fontSize: 14, color: '#333', fontWeight: '500' },
  searchBtn:    { backgroundColor: GREEN, paddingHorizontal: 16, paddingVertical: 12 },
  searchBtnText:{ color: '#fff', fontWeight: '800', fontSize: 13 },

  // ── Toolbar
  toolbar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 7, gap: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  countText:  { fontSize: 12, color: '#999', fontWeight: '600' },
  sortBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#f5f5f5', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 7,
    borderWidth: 1, borderColor: '#eee',
  },
  sortBtnText:  { fontSize: 12, fontWeight: '700', color: '#555', maxWidth: 110 },
  viewToggle: { flexDirection: 'row', borderRadius: 8, overflow: 'hidden', borderWidth: 1.5, borderColor: '#e8e8e8' },
  viewBtn:        { paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#fff' },
  viewBtnActive:  { backgroundColor: GREEN },
  viewBtnIcon:    { fontSize: 15, color: '#bbb' },

  // ── Chips
  chipsRow: { maxHeight: 48, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#e8f5e9', borderWidth: 1, borderColor: '#c8e6c9',
    borderRadius: 20, paddingHorizontal: 11, paddingVertical: 5,
  },
  chipText:    { fontSize: 12, fontWeight: '700', color: GREEN },
  chipClear: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff3f3', borderWidth: 1, borderColor: '#fdd',
    borderRadius: 20, paddingHorizontal: 11, paddingVertical: 5,
  },
  chipClearText: { fontSize: 12, fontWeight: '700', color: RED },

  // ── Product rows
  productRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },

  // ── Skeleton
  skeletonCard: { borderRadius: 12, overflow: 'hidden', backgroundColor: '#fff', flex: 1, borderWidth: 1, borderColor: '#f0f0f0' },
  skeletonImg:  { width: '100%', height: 150, backgroundColor: '#efefef' },
  skeletonLine: { backgroundColor: '#efefef', borderRadius: 4 },

  // ── Category header
  catHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 8, borderBottomWidth: 2, borderBottomColor: '#f0f0f0' },
  catHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  catAccent:     { width: 4, height: 20, backgroundColor: GREEN, borderRadius: 2 },
  catTitle:      { fontSize: 15, fontWeight: '800', color: '#1a1a1a', letterSpacing: -0.2 },
  catBadge:      { backgroundColor: '#f0f0f0', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  catBadgeText:  { fontSize: 11, color: '#aaa', fontWeight: '700' },
  viewAllBtn:    { backgroundColor: '#f0faf0', borderWidth: 1, borderColor: '#c8e6c9', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  viewAllBtnText:{ fontSize: 12, fontWeight: '700', color: GREEN },

  // ── Empty
  emptyBox:     { alignItems: 'center', paddingTop: 64, paddingBottom: 32 },
  emptyEmoji:   { fontSize: 48, marginBottom: 10 },
  emptyTitle:   { fontSize: 16, fontWeight: '800', color: '#333', marginBottom: 4 },
  emptySubtitle:{ fontSize: 13, color: '#aaa', marginBottom: 18 },
  clearBtn:     { backgroundColor: GREEN, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 11 },
  clearBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },

  // ── Pagination
  pagination:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 6, paddingVertical: 20 },
  pageBtn:          { width: 36, height: 36, borderRadius: 9, borderWidth: 1.5, borderColor: '#e0e0e0', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  pageBtnActive:    { backgroundColor: GREEN, borderColor: GREEN },
  pageBtnDisabled:  { opacity: 0.35 },
  pageBtnText:      { fontSize: 13, fontWeight: '600', color: '#555' },
  pageInfo:         { fontSize: 11, color: '#aaa', marginLeft: 4 },

  // ── Modals (shared)
  overlay:      { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)' },
  drawer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22,
    maxHeight: '80%', paddingBottom: 20,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 12 }, android: { elevation: 16 } }),
  },
  drawerHandle: { width: 40, height: 4, backgroundColor: '#e0e0e0', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  drawerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  drawerTitle:  { fontSize: 17, fontWeight: '800', color: '#1a1a1a' },
  drawerClose:  { fontSize: 18, color: '#999', fontWeight: '600' },

  // ── Sort modal items
  sortItem:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f8f8f8' },
  sortItemActive:   { backgroundColor: '#f0faf0' },
  sortItemText:     { fontSize: 15, color: '#555', fontWeight: '500' },
  sortItemTextActive: { color: GREEN, fontWeight: '700' },

  // ── Filter modal
  resetText: { fontSize: 12, color: RED, fontWeight: '700' },

  filterTab:          { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f5f5f5', borderWidth: 1.5, borderColor: 'transparent' },
  filterTabActive:    { backgroundColor: '#e8f5e9', borderColor: GREEN },
  filterTabText:      { fontSize: 12, fontWeight: '600', color: '#777' },
  filterTabTextActive:{ color: GREEN, fontWeight: '800' },

  tabContent:       { paddingHorizontal: 16, paddingBottom: 24, paddingTop: 6 },
  tabSectionTitle:  { fontSize: 13, fontWeight: '800', color: '#444', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },

  // checkboxes
  checkRow:          { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 10, marginBottom: 2 },
  checkRowActive:    { backgroundColor: '#f0faf0' },
  checkbox:          { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#ddd', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  checkboxChecked:   { backgroundColor: GREEN, borderColor: GREEN },
  checkLabel:        { flex: 1, fontSize: 14, color: '#555', fontWeight: '500' },
  checkLabelActive:  { color: GREEN, fontWeight: '700' },
  countBadge:        { backgroundColor: '#f0f0f0', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  countBadgeText:    { fontSize: 11, color: '#bbb', fontWeight: '700' },

  // radio buttons
  radioRow:          { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 10, marginBottom: 2 },
  radioRowActive:    { backgroundColor: '#f0faf0' },
  radio:             { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#ddd', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  radioChecked:      { borderColor: GREEN },
  radioDot:          { width: 10, height: 10, borderRadius: 5, backgroundColor: GREEN },

  // price filter
  priceDisplay:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  priceEdge:         { fontSize: 12, color: '#bbb' },
  priceSelected:     { fontSize: 15, fontWeight: '800', color: GREEN },
  priceBtnRow:       { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 6 },
  priceQuickBtn:     { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 9, backgroundColor: '#f5f5f5', borderWidth: 1.5, borderColor: '#eee' },
  priceQuickBtnActive: { backgroundColor: GREEN, borderColor: GREEN },
  priceQuickBtnText: { fontSize: 13, fontWeight: '700', color: '#666' },
  filterHint:        { fontSize: 11, color: '#bbb', marginBottom: 8, marginTop: 6 },
  priceInput: {
    borderWidth: 1.5, borderColor: '#e0e0e0', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 15, color: '#333', backgroundColor: '#fafafa', fontWeight: '600',
  },

  // apply button
  applyBtn:     { backgroundColor: GREEN, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 2 },
  applyBtnText: { color: '#fff', fontWeight: '900', fontSize: 16, letterSpacing: 0.3 },
});