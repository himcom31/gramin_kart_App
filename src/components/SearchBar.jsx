// src/components/SearchBar.jsx
// Mirrors the web UserNavbar SearchBar exactly:
// - Debounced query (280ms)
// - Parallel fetch: products + categories
// - Dropdown with Categories section + Products section
// - Highlighted matching text
// - "See all results" footer row
// - Keyboard-aware (no arrow-key nav on mobile, but ESC/dismiss on backdrop tap)

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
  ScrollView,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

// ─── Debounce hook ─────────────────────────────────────────────────────────────
function useDebounce(value, delay = 280) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ─── Highlight matching text ───────────────────────────────────────────────────
const Highlight = ({ text = '', query = '' }) => {
  if (!query.trim()) return <Text>{text}</Text>;
  const lower = text.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx === -1) return <Text>{text}</Text>;
  return (
    <Text>
      <Text>{text.slice(0, idx)}</Text>
      <Text style={styles.hlMatch}>{text.slice(idx, idx + query.length)}</Text>
      <Text>{text.slice(idx + query.length)}</Text>
    </Text>
  );
};

// ─── Main SearchBar ────────────────────────────────────────────────────────────
const SearchBar = () => {
  const router = useRouter();
  const inputRef = useRef(null);

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState({ products: [], categories: [] });
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const debouncedQuery = useDebounce(query, 280);

  // ── Fetch suggestions ────────────────────────────────────────────────────────
  useEffect(() => {
    const q = debouncedQuery.trim();
    if (!q) {
      setSuggestions({ products: [], categories: [] });
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const fetchSuggestions = async () => {
      try {
        const [prodRes, catRes] = await Promise.all([
          fetch(`${API_URL}/api/Products/allFree?search=${encodeURIComponent(q)}&limit=5`),
          fetch(`${API_URL}/api/Category/all`),
        ]);
        if (cancelled) return;
        const prodData = await prodRes.json();
        const catData = await catRes.json();
        const products = (prodData.products || prodData.data || []).slice(0, 5);
        const allCats = Array.isArray(catData) ? catData : catData.categories || catData.data || [];
        const categories = allCats
          .filter(c => c.isActive !== false && c.name.toLowerCase().includes(q.toLowerCase()))
          .slice(0, 3);
        if (!cancelled) {
          setSuggestions({ products, categories });
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setSuggestions({ products: [], categories: [] });
          setLoading(false);
        }
      }
    };

    fetchSuggestions();
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  const hasResults = suggestions.categories.length > 0 || suggestions.products.length > 0;
  const showDrop = open && query.trim().length > 0 && (loading || hasResults);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleInputChange = (val) => {
    setQuery(val);
    if (val.trim()) setOpen(true);
    else { setOpen(false); setSuggestions({ products: [], categories: [] }); }
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions({ products: [], categories: [] });
    setOpen(false);
    inputRef.current?.focus();
  };

  const handleSearch = useCallback(() => {
    const q = query.trim();
    setOpen(false);
    Keyboard.dismiss();
    if (q) router.push(`/products?search=${encodeURIComponent(q)}`);
  }, [query, router]);

  const selectCategory = useCallback((cat) => {
    setQuery(cat.name);
    setOpen(false);
    Keyboard.dismiss();
    router.push(`/products?categories=${cat.id}`);
  }, [router]);

  const selectProduct = useCallback((prod) => {
    const name = prod.name || '';
    setQuery(name);
    setOpen(false);
    Keyboard.dismiss();
    router.push(`/products?search=${encodeURIComponent(name)}`);
  }, [router]);

  const dismissDrop = () => { setOpen(false); Keyboard.dismiss(); };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <View style={styles.wrapper}>
      {/* Input row */}
      <View style={styles.inputRow}>
        <View style={[styles.inputWrap, open && query.trim() && styles.inputWrapFocused]}>
          <View style={styles.searchIconLeft}>
            <SearchIcon />
          </View>

          <TextInput
            ref={inputRef}
            style={styles.input}
            value={query}
            onChangeText={handleInputChange}
            placeholder="Search products or categories…"
            placeholderTextColor="#9CA3AF"
            returnKeyType="search"
            onSubmitEditing={handleSearch}
            autoCorrect={false}
            autoCapitalize="none"
          />

          {query.length > 0 && (
            <TouchableOpacity
              onPress={handleClear}
              style={styles.clearBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <XIcon />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={handleSearch} activeOpacity={0.88}>
          <SearchIcon color="#fff" size={16} />
        </TouchableOpacity>
      </View>

      {/* Dropdown */}
      {showDrop && (
        <>
          <Pressable style={styles.backdrop} onPress={dismissDrop} />

          <View style={styles.dropdown}>
            {/* Loading */}
            {loading && (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color="#16A34A" />
                <Text style={styles.loadingText}>Searching…</Text>
              </View>
            )}

            {/* No results */}
            {!loading && !hasResults && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🔍</Text>
                <Text style={styles.noResultsTitle}>No results found</Text>
                <Text style={styles.noResultsSub}>No matches for "{query}"</Text>
              </View>
            )}

            {!loading && hasResults && (
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                style={{ maxHeight: 360 }}
              >
                {/* ── Categories ── */}
                {suggestions.categories.length > 0 && (
                  <>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionLabel}>CATEGORIES</Text>
                    </View>
                    {suggestions.categories.map((cat, index) => (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.suggestionItem,
                          index === suggestions.categories.length - 1 && styles.suggestionItemLast,
                        ]}
                        onPress={() => selectCategory(cat)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.thumbWrap, styles.thumbWrapCategory]}>
                          {cat.thumbnail
                            ? <Image source={{ uri: cat.thumbnail }} style={styles.thumb} />
                            : <GridIcon color="#16A34A" />
                          }
                        </View>
                        <View style={styles.itemText}>
                          <Text style={styles.itemName} numberOfLines={1}>
                            <Highlight text={cat.name} query={query} />
                          </Text>
                          <Text style={styles.itemSub}>Browse category</Text>
                        </View>
                        <View style={styles.chevronWrap}>
                          <ChevronIcon />
                        </View>
                      </TouchableOpacity>
                    ))}
                  </>
                )}

                {/* Divider */}
                {suggestions.categories.length > 0 && suggestions.products.length > 0 && (
                  <View style={styles.divider} />
                )}

                {/* ── Products ── */}
                {suggestions.products.length > 0 && (
                  <>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionLabel}>PRODUCTS</Text>
                    </View>
                    {suggestions.products.map((prod, index) => {
                      const price = Number(prod.sellingPrice || prod.buyingPrice || 0);
                      const image = prod.thumbnail || prod.additionalImages?.[0];
                      const cat = typeof prod.category === 'object' ? prod.category?.name : '';
                      return (
                        <TouchableOpacity
                          key={prod.id}
                          style={[
                            styles.suggestionItem,
                            index === suggestions.products.length - 1 && styles.suggestionItemLast,
                          ]}
                          onPress={() => selectProduct(prod)}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.thumbWrap, styles.thumbWrapProduct]}>
                            {image
                              ? <Image source={{ uri: image }} style={styles.thumb} />
                              : <BoxIcon color="#9CA3AF" />
                            }
                          </View>
                          <View style={styles.itemText}>
                            <Text style={styles.itemName} numberOfLines={1}>
                              <Highlight text={prod.name || ''} query={query} />
                            </Text>
                            {cat ? <Text style={styles.itemSub}>{cat}</Text> : null}
                          </View>
                          <View style={styles.priceBadge}>
                            <Text style={styles.price}>₹{price.toFixed(2)}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </>
                )}

                {/* Footer */}
                <View style={styles.dropFooter}>
                  <TouchableOpacity style={styles.seeAllBtn} onPress={handleSearch} activeOpacity={0.8}>
                    <SearchIcon color="#fff" size={12} />
                    <Text style={styles.seeAllText}>See all results for "{query}"</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </>
      )}
    </View>
  );
};

// ─── Icons ─────────────────────────────────────────────────────────────────────
const SearchIcon = ({ color = '#9CA3AF', size = 15 }) => (
  <Text style={{ color, fontSize: size, lineHeight: size + 2 }}>🔍</Text>
);

const XIcon = () => (
  <Text style={{ color: '#9CA3AF', fontSize: 12, lineHeight: 14, fontWeight: '700' }}>✕</Text>
);

const GridIcon = ({ color = '#9CA3AF' }) => (
  <Text style={{ color, fontSize: 13 }}>⊞</Text>
);

const BoxIcon = ({ color = '#9CA3AF' }) => (
  <Text style={{ color, fontSize: 13 }}>⬡</Text>
);

const ChevronIcon = () => (
  <Text style={{ color: '#D1D5DB', fontSize: 16, fontWeight: '300' }}>›</Text>
);

// ─── Design tokens ─────────────────────────────────────────────────────────────
// Primary:   #16A34A  (green-600)
// Surface:   #FFFFFF
// Border:    #E5E7EB  (gray-200)
// Text-1:    #111827  (gray-900)
// Text-2:    #6B7280  (gray-500)
// Text-3:    #9CA3AF  (gray-400)
// Accent bg: #F0FDF4  (green-50)
// ──────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    zIndex: 100,
  },

  // ── Input row ──
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    paddingLeft: 12,
    paddingRight: 6,
    height: 44,
  },
  inputWrapFocused: {
    borderColor: '#16A34A',
    borderRightWidth: 0,
  },
  searchIconLeft: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    height: 44,
    paddingVertical: 0,
    letterSpacing: 0.1,
  },
  clearBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
    marginRight: 4,
  },
  submitBtn: {
    backgroundColor: '#16A34A',
    height: 44,
    paddingHorizontal: 16,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    // Subtle inner shadow illusion via border
    borderWidth: 1.5,
    borderColor: '#15803D',
  },

  // ── Backdrop ──
  backdrop: {
    position: 'absolute',
    top: 48,
    left: -9999,
    right: -9999,
    bottom: -9999,
    zIndex: 98,
  },

  // ── Dropdown ──
  dropdown: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 24,
    elevation: 12,
    zIndex: 99,
    overflow: 'hidden',
  },

  // ── Loading / empty ──
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 13,
    color: '#9CA3AF',
    letterSpacing: 0.2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  emptyIcon: {
    fontSize: 24,
    marginBottom: 8,
    opacity: 0.4,
  },
  noResultsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  noResultsSub: {
    fontSize: 12,
    color: '#9CA3AF',
  },

  // ── Section header ──
  sectionHeader: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 6,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#9CA3AF',
  },

  // ── Suggestion item ──
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  suggestionItemLast: {
    // no extra style needed, just a hook for future use
  },

  // Thumbnails
  thumbWrap: {
    width: 36,
    height: 36,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  thumbWrapCategory: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  thumbWrapProduct: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  thumb: {
    width: 36,
    height: 36,
    borderRadius: 9,
  },

  // Text content
  itemText: {
    flex: 1,
    minWidth: 0,
  },
  itemName: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#111827',
    letterSpacing: 0.1,
  },
  itemSub: {
    fontSize: 11.5,
    color: '#6B7280',
    marginTop: 2,
  },

  // Price badge
  priceBadge: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexShrink: 0,
  },
  price: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#15803D',
  },

  // Chevron
  chevronWrap: {
    width: 20,
    alignItems: 'center',
    flexShrink: 0,
  },

  // ── Highlight ──
  hlMatch: {
    backgroundColor: 'rgba(22, 163, 74, 0.12)',
    color: '#15803D',
    fontWeight: '700',
  },

  // ── Divider ──
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 14,
    marginVertical: 4,
  },

  // ── Footer ──
  dropFooter: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: '#16A34A',
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
});

export default SearchBar;