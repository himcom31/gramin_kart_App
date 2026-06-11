// src/app/blog/index.jsx  (or wherever your Expo Router tab/screen lives)
// Converted from the web BlogPage — all features preserved:
//  - Fetch blogs + categories in parallel
//  - Filter by category, search, tag
//  - Blog list with cards (thumbnail + date badge + excerpt + category + READ MORE)
//  - Blog detail with hero image, meta, prev/next nav, tags
//  - Mobile sidebar as bottom-sheet drawer (categories, search, latest posts, tags)
//  - Latest posts in sidebar
//  - Loading spinner, error banner, empty state

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Modal,
  Animated,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import RenderHtml from 'react-native-render-html';

const { width: SCREEN_W } = Dimensions.get('window');
const API_BASE = process.env.EXPO_PUBLIC_API_URL;
const BLOG_API = `${API_BASE}/api/blog`;
const CAT_API  = `${API_BASE}/api/Category/all`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d) {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
    });
  } catch { return d; }
}

function getCategoryName(blog, categories) {
  if (!blog.category) return '';
  if (typeof blog.category === 'object') return blog.category.name || '';
  const found = categories.find(c => c.id === blog.category);
  return found ? found.name : '';
}

function getCategoryId(blog) {
  if (!blog.category) return null;
  if (typeof blog.category === 'object') return blog.category.id;
  return blog.category;
}

function stripHtml(str) {
  return (str || '').replace(/<[^>]+>/g, '');
}

// ─── Thumbnail ────────────────────────────────────────────────────────────────

function Thumbnail({ src, style }) {
  const [error, setError] = useState(false);
  if (!src || error) {
    return (
      <View style={[style, styles.thumbFallback]}>
        <Text style={styles.thumbFallbackText}>No Image</Text>
      </View>
    );
  }
  return (
    <Image
      source={{ uri: src }}
      style={style}
      resizeMode="cover"
      onError={() => setError(true)}
    />
  );
}

// ─── Blog Card ────────────────────────────────────────────────────────────────

function BlogCard({ blog, categories, onOpenBlog }) {
  const cat     = getCategoryName(blog, categories);
  const excerpt = stripHtml(blog.description);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onOpenBlog(blog.id)}
      activeOpacity={0.82}
    >
      {/* Image + date badge */}
      <View style={styles.cardImgWrap}>
        <Thumbnail src={blog.thumbnail} style={styles.cardImg} />
        <View style={styles.dateBadge}>
          <Text style={styles.dateBadgeText}>{formatDate(blog.createdAt)}</Text>
        </View>
      </View>

      {/* Body */}
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>{blog.title}</Text>
        <Text style={styles.cardExcerpt} numberOfLines={3}>
          {excerpt.slice(0, 140)}{excerpt.length > 140 ? '…' : ''}
        </Text>
        <View style={styles.cardFooter}>
          {cat ? <Text style={styles.catLabel}>{cat}</Text> : <View />}
          <Text style={styles.readMore}>READ MORE →</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Blog Detail ──────────────────────────────────────────────────────────────

function BlogDetail({ blog, blogs, categories, onBack, onOpenBlog }) {
  const insets = useSafeAreaInsets();
  const idx  = blogs.findIndex(b => b.id === blog.id);
  const prev = idx > 0 ? blogs[idx - 1] : null;
  const next = idx < blogs.length - 1 ? blogs[idx + 1] : null;
  const author =
    typeof blog.author === 'object' ? blog.author?.name : blog.author || 'Admin';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#F2F6F2' }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Back */}
      <TouchableOpacity style={styles.backBtn} onPress={onBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={styles.backBtnText}>← Back to Blog</Text>
      </TouchableOpacity>

      {/* Hero */}
      <View style={styles.detailHero}>
        <Thumbnail src={blog.thumbnail} style={styles.detailHeroImg} />
      </View>

      {/* Content card */}
      <View style={styles.detailCard}>
        {/* Meta */}
        <View style={styles.detailMeta}>
          <Text style={styles.metaText}>By <Text style={styles.metaAuthor}>{author}</Text></Text>
          <Text style={styles.metaDot}>•</Text>
          <Text style={styles.metaText}>{formatDate(blog.createdAt)}</Text>
          {getCategoryName(blog, categories) ? (
            <>
              <Text style={styles.metaDot}>•</Text>
              <Text style={styles.metaText}>{getCategoryName(blog, categories)}</Text>
            </>
          ) : null}
        </View>

        {/* Title */}
        <Text style={styles.detailTitle}>{blog.title}</Text>

        {/* Body HTML */}
        <RenderHtml
          contentWidth={SCREEN_W - 64}
          source={{ html: blog.description || '' }}
          tagsStyles={{
            p:      { fontSize: 14, lineHeight: 25, color: '#444', marginBottom: 12 },
            h1:     { fontSize: 20, fontWeight: '700', color: '#1A2E1A', marginBottom: 10 },
            h2:     { fontSize: 17, fontWeight: '700', color: '#1A2E1A', marginBottom: 8 },
            strong: { fontWeight: '700', color: '#1A2E1A' },
            a:      { color: '#16A34A' },
            li:     { fontSize: 14, lineHeight: 22, color: '#444' },
          }}
        />

        {/* Tags */}
        {(blog.tags || []).length > 0 && (
          <View style={styles.tagsRow}>
            {blog.tags.map(t => (
              <View key={t} style={styles.tagPill}>
                <Text style={styles.tagPillText}>{t}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Prev / Next */}
      <View style={styles.navRow}>
        <TouchableOpacity
          style={[styles.navPost, !prev && styles.navPostDisabled]}
          onPress={() => prev && onOpenBlog(prev.id)}
          disabled={!prev}
          activeOpacity={0.75}
        >
          <Text style={styles.navDir}>← Previous</Text>
          <Text style={styles.navTitle} numberOfLines={2}>{prev ? prev.title : '—'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navPost, styles.navPostRight, !next && styles.navPostDisabled]}
          onPress={() => next && onOpenBlog(next.id)}
          disabled={!next}
          activeOpacity={0.75}
        >
          <Text style={[styles.navDir, { textAlign: 'right' }]}>Next →</Text>
          <Text style={[styles.navTitle, { textAlign: 'right' }]} numberOfLines={2}>
            {next ? next.title : '—'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ─── Sidebar / Drawer ─────────────────────────────────────────────────────────

function SidebarContent({
  categories, blogs, filteredCat, search, tags,
  onFilterCat, onSearch, onFilterTag, onOpenBlog, onClose,
}) {
  const latest = blogs.slice(0, 5);

  return (
    <ScrollView
      style={styles.sidebarScroll}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Categories */}
      <View style={styles.sideCard}>
        <Text style={styles.sideTitle}>Categories</Text>
        <TouchableOpacity
          style={[styles.catItem, filteredCat === null && styles.catItemActive]}
          onPress={() => { onFilterCat(null); onClose(); }}
        >
          <Text style={[styles.catItemText, filteredCat === null && styles.catItemTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        {categories.map(c => (
          <TouchableOpacity
            key={c.id}
            style={[styles.catItem, filteredCat === c.id && styles.catItemActive]}
            onPress={() => { onFilterCat(c.id); onClose(); }}
          >
            <Text style={[styles.catItemText, filteredCat === c.id && styles.catItemTextActive]}>
              {c.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search */}
      <View style={styles.sideCard}>
        <Text style={styles.sideTitle}>Search</Text>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search…"
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={onSearch}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View style={styles.searchIconBtn}>
            <Text style={{ fontSize: 15 }}>🔍</Text>
          </View>
        </View>
      </View>

      {/* Latest Posts */}
      <View style={styles.sideCard}>
        <Text style={styles.sideTitle}>Latest Posts</Text>
        {latest.map(b => (
          <TouchableOpacity
            key={b.id}
            style={styles.latestItem}
            onPress={() => { onOpenBlog(b.id); onClose(); }}
            activeOpacity={0.75}
          >
            <Thumbnail src={b.thumbnail} style={styles.latestThumb} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.latestTitle} numberOfLines={2}>{b.title}</Text>
              <Text style={styles.latestDate}>{formatDate(b.createdAt)}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tags */}
      {tags.length > 0 && (
        <View style={styles.sideCard}>
          <Text style={styles.sideTitle}>Tags</Text>
          <View style={styles.tagsRow}>
            {tags.map(t => (
              <TouchableOpacity
                key={t}
                style={styles.tagPill}
                onPress={() => { onFilterTag(t); onClose(); }}
                activeOpacity={0.75}
              >
                <Text style={styles.tagPillText}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function SidebarDrawer({ visible, onClose, ...props }) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : 300,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Pressable style={styles.drawerBackdrop} onPress={onClose} />

      {/* Drawer panel */}
      <Animated.View
        style={[
          styles.drawerPanel,
          { paddingTop: insets.top, transform: [{ translateX: slideAnim }] },
        ]}
      >
        {/* Header */}
        <View style={styles.drawerHeader}>
          <Text style={styles.drawerHeaderTitle}>Filters & Info</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.drawerCloseIcon}>✕</Text>
          </TouchableOpacity>
        </View>

        <SidebarContent onClose={onClose} {...props} />
      </Animated.View>
    </Modal>
  );
}

// ─── Main BlogPage ─────────────────────────────────────────────────────────────

export default function BlogPage() {
  const insets = useSafeAreaInsets();

  const [blogs, setBlogs]           = useState([]);
  const [categories, setCategories] = useState([]);
  const [tags, setTags]             = useState([]);
  const [selectedBlog, setSelectedBlog] = useState(null);
  const [search, setSearch]         = useState('');
  const [filteredCat, setFilteredCat] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [blogsRes, catsRes] = await Promise.all([
          fetch(`${BLOG_API}/all`),
          fetch(CAT_API),
        ]);
        if (!blogsRes.ok) throw new Error(`Blog API error: ${blogsRes.status}`);
        if (!catsRes.ok)  throw new Error(`Category API error: ${catsRes.status}`);
        const blogsData = await blogsRes.json();
        const catsData  = await catsRes.json();
        const fetchedBlogs = blogsData.blogs || [];
        const fetchedCats  = catsData.categories || catsData || [];
        const tagSet = new Set();
        fetchedBlogs.forEach(b => (b.tags || []).forEach(t => tagSet.add(t)));
        setBlogs(fetchedBlogs);
        setCategories(fetchedCats);
        setTags([...tagSet]);
        setError(null);
      } catch (e) {
        setError(e.message || 'Failed to load blog data.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredBlogs = blogs.filter(b => {
    if (b.isActive === false) return false;
    if (filteredCat && getCategoryId(b) !== filteredCat) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        b.title.toLowerCase().includes(q) ||
        stripHtml(b.description).toLowerCase().includes(q) ||
        (b.tags || []).some(t => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleOpenBlog  = useCallback((id) => {
    const blog = blogs.find(b => b.id === id);
    if (blog) setSelectedBlog(blog);
  }, [blogs]);

  const handleBack      = useCallback(() => setSelectedBlog(null), []);

  const handleFilterCat = useCallback((id) => {
    setFilteredCat(id);
    setSelectedBlog(null);
  }, []);

  const handleFilterTag = useCallback((tag) => {
    setSearch(tag);
    setSelectedBlog(null);
  }, []);

  const sidebarProps = {
    categories,
    blogs,
    filteredCat,
    search,
    tags,
    onFilterCat:  handleFilterCat,
    onSearch:     setSearch,
    onFilterTag:  handleFilterTag,
    onOpenBlog:   handleOpenBlog,
    onClose:      () => setSidebarOpen(false),
  };

  // ── Loading ──
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#16A34A" />
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  return (
    <View style={[styles.page, { paddingTop: insets.top }]}>

      {/* Top bar */}
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Blog</Text>
        <TouchableOpacity
          style={styles.filterBtn}
          onPress={() => setSidebarOpen(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.filterBtnIcon}>☰</Text>
          <Text style={styles.filterBtnText}>Filters</Text>
        </TouchableOpacity>
      </View>

      {/* Error */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>⚠ {error}</Text>
        </View>
      )}

      {/* Content */}
      {selectedBlog ? (
        <BlogDetail
          blog={selectedBlog}
          blogs={blogs}
          categories={categories}
          onBack={handleBack}
          onOpenBlog={handleOpenBlog}
        />
      ) : (
        <FlatList
          data={filteredBlogs}
          keyExtractor={b => String(b.id)}
          renderItem={({ item }) => (
            <BlogCard
              blog={item}
              categories={categories}
              onOpenBlog={handleOpenBlog}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No blogs found.</Text>
            </View>
          }
        />
      )}

      {/* Sidebar drawer */}
      <SidebarDrawer visible={sidebarOpen} {...sidebarProps} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({

  page: {
    flex: 1,
    backgroundColor: '#F2F6F2',
  },

  // ── Top bar ──
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 3,
  },
  topBarTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A2E1A',
    letterSpacing: 0.2,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  filterBtnIcon: {
    fontSize: 15,
    color: '#1A2E1A',
  },
  filterBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A2E1A',
  },

  // ── Loading / Error / Empty ──
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#F2F6F2',
  },
  loadingText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  errorBanner: {
    margin: 12,
    padding: 12,
    backgroundColor: '#FFF0F0',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  errorText: {
    fontSize: 13,
    color: '#DC2626',
  },
  emptyState: {
    paddingVertical: 80,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
  },

  // ── List ──
  listContent: {
    padding: 14,
    gap: 14,
    paddingBottom: 40,
  },

  // ── Blog Card ──
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  cardImgWrap: {
    width: '100%',
    height: 190,
    position: 'relative',
  },
  cardImg: {
    width: '100%',
    height: '100%',
  },
  dateBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#16A34A',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dateBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  cardBody: {
    padding: 18,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A2E1A',
    lineHeight: 24,
    marginBottom: 8,
  },
  cardExcerpt: {
    fontSize: 13.5,
    color: '#555',
    lineHeight: 21,
    marginBottom: 14,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  catLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  readMore: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1A2E1A',
    letterSpacing: 0.4,
  },

  // ── Thumbnail fallback ──
  thumbFallback: {
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbFallbackText: {
    fontSize: 11,
    color: '#9CA3AF',
  },

  // ── Blog Detail ──
  backBtn: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtnText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  detailHero: {
    marginHorizontal: 14,
    height: 220,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
    marginBottom: 14,
  },
  detailHeroImg: {
    width: '100%',
    height: '100%',
  },
  detailCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 14,
    borderRadius: 14,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 14,
  },
  detailMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  metaText: {
    fontSize: 12.5,
    color: '#9CA3AF',
  },
  metaAuthor: {
    color: '#1A2E1A',
    fontWeight: '600',
  },
  metaDot: {
    color: '#D1D5DB',
    fontSize: 12,
  },
  detailTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A2E1A',
    lineHeight: 30,
    marginBottom: 16,
  },

  // ── Tags ──
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  tagPill: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  tagPillText: {
    fontSize: 12,
    color: '#15803D',
    fontWeight: '500',
  },

  // ── Prev / Next nav ──
  navRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 14,
    marginBottom: 14,
  },
  navPost: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  navPostRight: {
    alignItems: 'flex-end',
  },
  navPostDisabled: {
    opacity: 0.35,
  },
  navDir: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 5,
    fontWeight: '500',
  },
  navTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A2E1A',
    lineHeight: 18,
  },

  // ── Drawer ──
  drawerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  drawerPanel: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: '82%',
    maxWidth: 320,
    backgroundColor: '#F2F6F2',
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 16,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  drawerHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A2E1A',
  },
  drawerCloseIcon: {
    fontSize: 16,
    color: '#9CA3AF',
    padding: 4,
  },
  sidebarScroll: {
    flex: 1,
  },

  // ── Sidebar cards ──
  sideCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  sideTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A2E1A',
    marginBottom: 12,
  },
  catItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  catItemActive: {
    // no bg change; rely on text weight
  },
  catItemText: {
    fontSize: 14,
    color: '#6B7280',
  },
  catItemTextActive: {
    color: '#1A2E1A',
    fontWeight: '700',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 42,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 9,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#1A2E1A',
    backgroundColor: '#FAFAFA',
  },
  searchIconBtn: {
    width: 42,
    height: 42,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  latestItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  latestThumb: {
    width: 56,
    height: 46,
    borderRadius: 8,
    flexShrink: 0,
  },
  latestTitle: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#1A2E1A',
    lineHeight: 18,
    marginBottom: 3,
  },
  latestDate: {
    fontSize: 11,
    color: '#9CA3AF',
  },
});