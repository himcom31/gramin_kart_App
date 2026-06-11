// app/products/[slug].jsx
// Product Details Screen — Expo Router, slug-based routing
// Mirrors web ProductDetails.jsx feature-for-feature

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EventEmitter } from '../../src/api/EventEmitter';
import { Storage as store } from '../../src/api/storage';
import { useAuth } from '../../src/context/AuthContext';

const { width: SW } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL;
const getToken = () => store.getItem('userToken');

// ─── Brand tokens ─────────────────────────────────────────────────────────────
const C = {
  green:      '#16a34a',
  greenLight: '#f0fdf4',
  greenBorder:'#bbf7d0',
  greenDark:  '#15803d',
  text:       '#1a2332',
  textSub:    '#6b7280',
  textLight:  '#9ca3af',
  divider:    '#f3f4f6',
  dividerDash:'#e5e7eb',
  bg:         '#f4f6f4',
  white:      '#ffffff',
  red:        '#dc2626',
  redLight:   '#fef2f2',
  redBorder:  '#fecaca',
  orange:     '#d97706',
  orangeLight:'#fffbeb',
  orangeBorder:'#fde68a',
  badge:      '#fb641b',
};

// ─── API ──────────────────────────────────────────────────────────────────────
const authHeader = () => ({ Authorization: `Bearer ${getToken()}` });
const jsonHeader = () => ({ 'Content-Type': 'application/json', ...authHeader() });

const fetchProductBySlug = async (slug) => {
  const res  = await fetch(`${API_URL}/api/Products/allFree?limit=500`);
  const data = await res.json();
  const list = Array.isArray(data) ? data : data.products || data.data || [];
  return list.find(p => p.slug === slug || String(p.id) === String(slug)) || null;
};

const fetchRelated = async (categoryId, currentId) => {
  const res  = await fetch(`${API_URL}/api/Products/allFree?limit=100`);
  const data = await res.json();
  const list = Array.isArray(data) ? data : data.products || data.data || [];
  return list
    .filter(p => {
      const pCat = typeof p.category === 'object' ? p.category?.id : p.category;
      return pCat === categoryId && p.id !== currentId;
    })
    .slice(0, 8);
};

const fetchWishlistAPI = async () => {
  const res = await fetch(`${API_URL}/api/wishlist`, { headers: authHeader() });
  return res.json();
};

const addToCartAPI = async (productId, qty = 1) => {
  const res = await fetch(`${API_URL}/api/cart/add`, {
    method: 'POST',
    headers: jsonHeader(),
    body: JSON.stringify({ productId, quantity: qty }),
  });
  return res.json();
};

const fetchCartAPI = async () => {
  const res = await fetch(`${API_URL}/api/cart`, { headers: authHeader() });
  return res.json();
};

const toggleWishlistAPI = async (productId, isWished) => {
  if (isWished) {
    const res = await fetch(`${API_URL}/api/wishlist/remove/${productId}`, {
      method: 'DELETE', headers: authHeader(),
    });
    return res.json();
  }
  const res = await fetch(`${API_URL}/api/wishlist/add`, {
    method: 'POST',
    headers: jsonHeader(),
    body: JSON.stringify({ productId }),
  });
  return res.json();
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const normaliseProduct = (p) => {
  if (!p) return null;
  const price    = Number(p.sellingPrice ?? p.discountPrice ?? p.price ?? 0);
  const oldPrice = Number(p.buyingPrice  ?? p.mrp ?? p.oldPrice ?? 0);
  const discount = oldPrice > price && price > 0
    ? Math.round((1 - price / oldPrice) * 100) : null;
  const allImages = [p.thumbnail, ...(p.additionalImages || [])].filter(Boolean);
  const stock     = Number(p.stockQuantity ?? p.stock ?? 0);
  const catName   = typeof p.category === 'object' ? p.category?.name : p.category || '';
  const catId     = typeof p.category === 'object' ? p.category?.id   : p.category;
  const brandName = typeof p.brand    === 'object' ? p.brand?.name    : p.brand    || '';
  return {
    ...p, price, oldPrice, discount, allImages,
    stock, isOOS: stock === 0, isLow: stock > 0 && stock <= 10,
    catName, catId, brandName,
    minQty: p.minOrderQuantity ?? 1,
    navSlug: p.slug || p.id,
  };
};

// ─── Toast ────────────────────────────────────────────────────────────────────
const Toast = ({ message, type, onDone }) => {
  useEffect(() => {
    const t = setTimeout(onDone, 2500);
    return () => clearTimeout(t);
  }, [onDone]);
  const bg = type === 'success' ? C.green : type === 'error' ? C.red : '#1e40af';
  return (
    <View style={[ts.wrap, { backgroundColor: bg }]}>
      <Text style={ts.txt}>{message}</Text>
    </View>
  );
};
const ts = StyleSheet.create({
  wrap: {
    position: 'absolute', bottom: 32, alignSelf: 'center',
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12,
    shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 10,
    elevation: 10, zIndex: 9999,
  },
  txt: { color: C.white, fontSize: 13, fontWeight: '700' },
});

// ─── Star Rating ──────────────────────────────────────────────────────────────
const StarRating = ({ rating = 0, count = 0 }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Text key={i} style={{ fontSize: 13, color: i <= Math.round(rating) ? '#f59e0b' : '#d1d5db' }}>★</Text>
      ))}
    </View>
    {count > 0 && <Text style={{ fontSize: 12, color: C.textSub }}>({count} reviews)</Text>}
  </View>
);

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const SkeletonBlock = ({ h, w = '100%', mb = 0, radius = 8 }) => (
  <View style={{ height: h, width: w, backgroundColor: '#efefef', borderRadius: radius, marginBottom: mb }} />
);
const Skeleton = () => (
  <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
    <SkeletonBlock h={320} radius={14} mb={10} />
    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
      {[0,1,2,3].map(i => <SkeletonBlock key={i} h={64} w={(SW - 64) / 4} radius={8} />)}
    </View>
    <SkeletonBlock h={22} w="60%" mb={8} />
    <SkeletonBlock h={14} w="35%" mb={12} />
    <SkeletonBlock h={36} w="45%" mb={10} />
    <SkeletonBlock h={14} mb={8} />
    <SkeletonBlock h={14} mb={8} />
    <SkeletonBlock h={14} w="80%" mb={16} />
    <SkeletonBlock h={50} radius={12} />
  </ScrollView>
);

// ─── Image Lightbox Modal ─────────────────────────────────────────────────────
const Lightbox = ({ images, activeIdx, onClose }) => {
  const [idx, setIdx] = useState(activeIdx);
  const prev = () => setIdx(i => (i - 1 + images.length) % images.length);
  const next = () => setIdx(i => (i + 1) % images.length);

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <View style={lb.overlay}>
        {/* Close */}
        <TouchableOpacity onPress={onClose} style={lb.closeBtn}>
          <Text style={{ color: C.white, fontSize: 20, fontWeight: '700' }}>✕</Text>
        </TouchableOpacity>

        {/* Image */}
        <View style={lb.imgWrap}>
          <Image source={{ uri: images[idx] }} style={lb.img} resizeMode="contain" />
        </View>

        {/* Prev / Next */}
        {images.length > 1 && (
          <>
            <TouchableOpacity onPress={prev} style={[lb.navBtn, { left: 12 }]}>
              <Text style={lb.navTxt}>‹</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={next} style={[lb.navBtn, { right: 12 }]}>
              <Text style={lb.navTxt}>›</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Dots */}
        {images.length > 1 && (
          <View style={lb.dots}>
            {images.map((_, i) => (
              <TouchableOpacity key={i} onPress={() => setIdx(i)}
                style={[lb.dot, { width: i === idx ? 20 : 8, backgroundColor: i === idx ? C.white : 'rgba(255,255,255,0.4)' }]} />
            ))}
          </View>
        )}
      </View>
    </Modal>
  );
};
const lb = StyleSheet.create({
  overlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  closeBtn: { position: 'absolute', top: 48, right: 16, zIndex: 10,
              backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20,
              width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  imgWrap:  { width: SW - 32, height: SW - 32 },
  img:      { width: '100%', height: '100%' },
  navBtn:   { position: 'absolute', top: '50%', backgroundColor: 'rgba(255,255,255,0.15)',
              borderRadius: 22, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  navTxt:   { color: C.white, fontSize: 26, fontWeight: '700', lineHeight: 30 },
  dots:     { position: 'absolute', bottom: 40, flexDirection: 'row', gap: 5, alignItems: 'center' },
  dot:      { height: 8, borderRadius: 4 },
});

// ─── Related Product Card ─────────────────────────────────────────────────────
const RelatedCard = ({ item, onPress, onAddToCart }) => {
  const price    = Number(item.sellingPrice ?? item.price ?? 0);
  const oldPrice = Number(item.buyingPrice  ?? item.mrp  ?? 0);
  const discount = oldPrice > price ? Math.round((1 - price / oldPrice) * 100) : null;
  const img      = item.thumbnail || item.additionalImages?.[0];
  const catName  = typeof item.category === 'object' ? item.category?.name : item.category || '';

  return (
    <TouchableOpacity onPress={onPress} style={rc.card} activeOpacity={0.88}>
      {discount && (
        <View style={rc.discBadge}>
          <Text style={rc.discTxt}>{discount}% OFF</Text>
        </View>
      )}
      <View style={rc.imgWrap}>
        {img
          ? <Image source={{ uri: img }} style={rc.img} resizeMode="cover" />
          : <Text style={{ fontSize: 28 }}>📦</Text>}
      </View>
      <View style={rc.info}>
        {!!catName && <Text style={rc.cat} numberOfLines={1}>{catName}</Text>}
        <Text style={rc.name} numberOfLines={2}>{item.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap', marginTop: 3 }}>
          <Text style={rc.price}>₹{price.toFixed(2)}</Text>
          {oldPrice > price && <Text style={rc.oldPrice}>₹{oldPrice.toFixed(2)}</Text>}
        </View>
        <TouchableOpacity onPress={onAddToCart} style={rc.addBtn}>
          <Text style={rc.addBtnTxt}>🛒 Add to Cart</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};
const rc = StyleSheet.create({
  card:      { width: (SW - 36) / 2, backgroundColor: C.white, borderRadius: 14,
               overflow: 'hidden', borderWidth: 1, borderColor: '#e8f5e9',
               shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  discBadge: { position: 'absolute', top: 7, left: 7, zIndex: 2,
               backgroundColor: C.red, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  discTxt:   { color: C.white, fontSize: 9, fontWeight: '800' },
  imgWrap:   { width: '100%', aspectRatio: 1, backgroundColor: '#f9fafb',
               alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  img:       { width: '100%', height: '100%' },
  info:      { padding: 10, paddingTop: 8 },
  cat:       { fontSize: 9, fontWeight: '700', color: C.green, textTransform: 'uppercase',
               letterSpacing: 0.4, marginBottom: 3 },
  name:      { fontSize: 12, fontWeight: '700', color: C.text, lineHeight: 16, marginBottom: 2 },
  price:     { fontSize: 13, fontWeight: '800', color: C.green },
  oldPrice:  { fontSize: 11, color: C.textLight, textDecorationLine: 'line-through' },
  addBtn:    { marginTop: 7, width: '100%', paddingVertical: 7, borderRadius: 7,
               borderWidth: 1.5, borderColor: C.green, alignItems: 'center', justifyContent: 'center' },
  addBtnTxt: { fontSize: 11, fontWeight: '700', color: C.green },
});

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────
export default function ProductDetailsScreen() {
  const { slug }  = useLocalSearchParams();
  const router    = useRouter();
  const insets    = useSafeAreaInsets();
  const { isLoggedIn } = useAuth();

  const [product,     setProduct]     = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [related,     setRelated]     = useState([]);

  const [activeImg,   setActiveImg]   = useState(0);
  const [lightboxIdx, setLightboxIdx] = useState(null);
  const [qty,         setQty]         = useState(1);

  const [wished,      setWished]      = useState(false);
  const [cartLoading, setCartLoading] = useState(false);
  const [wishLoading, setWishLoading] = useState(false);
  const [toast,       setToast]       = useState(null);

  const imgScrollRef = useRef(null);

  // ── Load product ─────────────────────────────────────────────────────────────
  const loadProduct = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const found = await fetchProductBySlug(slug);
      if (!found) { setError('Product not found.'); return; }
      const norm = normaliseProduct(found);
      setProduct(norm);
      setQty(norm.minQty);

      // load related
      if (norm.catId) {
        fetchRelated(norm.catId, norm.id)
          .then(setRelated)
          .catch(() => {});
      }
    } catch {
      setError('Failed to load product. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { loadProduct(); }, [loadProduct]);

  // ── Check wishlist ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!product || !isLoggedIn) return;
    fetchWishlistAPI()
      .then(data => {
        const ids = (data?.products || []).map(p => p.id || p);
        setWished(ids.includes(product.id));
      })
      .catch(() => {});
  }, [product, isLoggedIn]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const showToast = (message, type = 'success') => setToast({ message, type });

  const handleAddToCart = async (pid = product?.id, qty_ = qty) => {
    if (!isLoggedIn) { router.push('/login'); return; }
    if (!pid || cartLoading) return;
    setCartLoading(true);
    try {
      await addToCartAPI(pid, qty_);
      const cart = await fetchCartAPI();
      EventEmitter.emit('cart-updated', { items: cart?.items || [] });
      showToast('Added to cart!', 'success');
    } catch {
      showToast('Failed to add to cart', 'error');
    } finally {
      setCartLoading(false);
    }
  };

  const handleBuyNow = async () => {
    if (!isLoggedIn) { router.push('/login'); return; }
    if (!product || product.isOOS) return;
    setCartLoading(true);
    try {
      await addToCartAPI(product.id, qty);
      const cart = await fetchCartAPI();
      EventEmitter.emit('cart-updated', { items: cart?.items || [] });
      router.push('/checkout');
    } catch {
      showToast('Failed — please try again', 'error');
      setCartLoading(false);
    }
  };

  const handleWishlist = async () => {
    if (!isLoggedIn) { router.push('/login'); return; }
    if (wishLoading) return;
    setWishLoading(true);
    try {
      const res = await toggleWishlistAPI(product.id, wished);
      const nowWished = !wished;
      setWished(nowWished);
      EventEmitter.emit('wishlist-updated', { products: res?.products || [] });
      showToast(nowWished ? 'Added to wishlist!' : 'Removed from wishlist', 'success');
    } catch {
      showToast('Failed to update wishlist', 'error');
    } finally {
      setWishLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({ message: `Check out ${product.name} on GraminKart` });
    } catch {}
  };

  const handleRelatedAddToCart = async (relItem) => {
    if (!isLoggedIn) { router.push('/login'); return; }
    try {
      await addToCartAPI(relItem.id, 1);
      const cart = await fetchCartAPI();
      EventEmitter.emit('cart-updated', { items: cart?.items || [] });
      showToast(`${relItem.name} added to cart!`, 'success');
    } catch {
      showToast('Failed to add to cart', 'error');
    }
  };

  // ── Loading / Error states ────────────────────────────────────────────────────
  if (loading) return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="dark-content" />
      <View style={[hd.bar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={hd.backBtn}>
          <Text style={hd.backTxt}>←</Text>
        </TouchableOpacity>
        <Text style={hd.title}>Product Details</Text>
      </View>
      <Skeleton />
    </View>
  );

  if (error || !product) return (
    <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Text style={{ fontSize: 44, marginBottom: 12 }}>📦</Text>
      <Text style={{ fontSize: 16, fontWeight: '700', color: C.textSub, marginBottom: 20, textAlign: 'center' }}>
        {error || 'Product not found.'}
      </Text>
      <TouchableOpacity onPress={() => router.back()} style={err.btn}>
        <Text style={err.btnTxt}>← Go Back</Text>
      </TouchableOpacity>
    </View>
  );

  const { price, oldPrice, discount, allImages, stock, isOOS, isLow,
          catName, brandName, minQty } = product;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="dark-content" backgroundColor={C.white} />

      {/* ── Header ── */}
      <View style={[hd.bar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={hd.backBtn}>
          <Text style={hd.backTxt}>←</Text>
        </TouchableOpacity>
        <Text style={hd.title} numberOfLines={1}>{product.name}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={handleShare} style={hd.iconBtn}>
            <Text style={{ fontSize: 15 }}>↗</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleWishlist} disabled={wishLoading} style={hd.iconBtn}>
            {wishLoading
              ? <ActivityIndicator size="small" color={C.red} />
              : <Text style={{ fontSize: 16, color: wished ? C.red : C.textLight }}>
                  {wished ? '♥' : '♡'}
                </Text>}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>

        {/* ── Image Gallery ── */}
        <View style={ig.wrap}>
          {/* Main image */}
          <TouchableOpacity
            activeOpacity={0.95}
            onPress={() => allImages.length > 0 && setLightboxIdx(activeImg)}
            style={ig.mainWrap}>
            {allImages.length > 0
              ? <Image source={{ uri: allImages[activeImg] }} style={ig.mainImg} resizeMode="cover" />
              : <Text style={{ fontSize: 48 }}>📦</Text>}
            {discount && (
              <View style={ig.discBadge}>
                <Text style={ig.discTxt}>{discount}% OFF</Text>
              </View>
            )}
            <View style={ig.zoomHint}>
              <Text style={{ color: C.white, fontSize: 12 }}>🔍</Text>
            </View>
          </TouchableOpacity>

          {/* Thumbnails */}
          {allImages.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 14, gap: 8, paddingVertical: 4 }}>
              {allImages.map((img, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => setActiveImg(i)}
                  style={[ig.thumb, activeImg === i && ig.thumbActive]}>
                  <Image source={{ uri: img }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* ── Product Info Card ── */}
        <View style={pi.card}>

          {/* Brand + Category row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            {!!brandName && (
              <Text style={pi.brand}>{brandName.toUpperCase()}</Text>
            )}
            {!!catName && (
              <View style={pi.catBadge}>
                <Text style={pi.catTxt}>{catName.toUpperCase()}</Text>
              </View>
            )}
          </View>

          {/* Product name */}
          <Text style={pi.name}>{product.name}</Text>

          {/* Short description */}
          {!!product.shortDescription && (
            <Text style={pi.shortDesc}>{product.shortDescription}</Text>
          )}

          {/* Rating */}
          {(product.averageRating || product.reviewCount) ? (
            <View style={{ marginBottom: 12 }}>
              <StarRating rating={product.averageRating || 0} count={product.reviewCount || 0} />
            </View>
          ) : null}

          <View style={pi.divider} />

          {/* Price */}
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
            <Text style={pi.price}>₹{price.toFixed(2)}</Text>
            {oldPrice > price && (
              <Text style={pi.oldPrice}>₹{oldPrice.toFixed(2)}</Text>
            )}
            {discount && (
              <View style={pi.saveBadge}>
                <Text style={pi.saveTxt}>Save {discount}%</Text>
              </View>
            )}
          </View>

          {/* Stock badge */}
          <View style={{ marginBottom: 14 }}>
            {isOOS ? (
              <View style={[pi.stockBadge, { backgroundColor: C.redLight, borderColor: C.redBorder }]}>
                <Text style={[pi.stockTxt, { color: C.red }]}>❌ Out of Stock</Text>
              </View>
            ) : isLow ? (
              <View style={[pi.stockBadge, { backgroundColor: C.orangeLight, borderColor: C.orangeBorder }]}>
                <Text style={[pi.stockTxt, { color: C.orange }]}>⚠️ Only {stock} left!</Text>
              </View>
            ) : (
              <View style={[pi.stockBadge, { backgroundColor: C.greenLight, borderColor: C.greenBorder }]}>
                <Text style={[pi.stockTxt, { color: C.green }]}>✓ In Stock ({stock} available)</Text>
              </View>
            )}
          </View>

          {/* Unit + SKU */}
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            {!!product.unit && (
              <View style={pi.metaBadge}>
                <Text style={pi.metaTxt}>🏷 {product.unit}</Text>
              </View>
            )}
            {!!product.sku && (
              <View style={pi.metaBadge}>
                <Text style={pi.metaTxt}>SKU: {product.sku}</Text>
              </View>
            )}
          </View>

          <View style={pi.divider} />

          {/* Quantity selector */}
          {!isOOS && (
            <View style={{ marginBottom: 16 }}>
              <Text style={pi.sectionLabel}>QUANTITY</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <View style={pi.qtyGroup}>
                  <TouchableOpacity
                    style={pi.qtyBtn}
                    onPress={() => setQty(q => Math.max(minQty, q - 1))}>
                    <Text style={pi.qtyBtnTxt}>−</Text>
                  </TouchableOpacity>
                  <Text style={pi.qtyVal}>{qty}</Text>
                  <TouchableOpacity
                    style={pi.qtyBtn}
                    onPress={() => setQty(q => Math.min(stock, q + 1))}>
                    <Text style={pi.qtyBtnTxt}>+</Text>
                  </TouchableOpacity>
                </View>
                <Text style={{ fontSize: 12, color: C.textSub }}>
                  Total: <Text style={{ color: C.green, fontWeight: '800' }}>
                    ₹{(price * qty).toFixed(2)}
                  </Text>
                </Text>
              </View>
              {minQty > 1 && (
                <Text style={{ fontSize: 11, color: C.textLight, marginTop: 5 }}>
                  Min. order: {minQty}
                </Text>
              )}
            </View>
          )}

          {/* Attributes / Specifications */}
          {product.attributes?.length > 0 && (
            <>
              <View style={pi.divider} />
              <Text style={[pi.sectionLabel, { marginBottom: 10 }]}>SPECIFICATIONS</Text>
              {product.attributes.map((attr, i) => (
                <View key={i} style={[pi.attrRow,
                  i < product.attributes.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.divider }]}>
                  <Text style={pi.attrKey}>{attr.key}</Text>
                  <Text style={pi.attrVal}>{attr.value}</Text>
                </View>
              ))}
            </>
          )}
        </View>

        {/* ── Description card ── */}
        {!!product.description && (
          <View style={[pi.card, { marginTop: 0 }]}>
            <Text style={pi.sectionTitle}>About This Product</Text>
            <Text style={pi.descTxt}>{product.description}</Text>
          </View>
        )}

        {/* ── Related Products ── */}
        {related.length > 0 && (
          <View style={{ paddingHorizontal: 14, paddingTop: 8 }}>
            <Text style={pi.sectionTitle}>Related Products</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {related.map(rel => (
                <RelatedCard
                  key={rel.id}
                  item={rel}
                  onPress={() => router.push(`/product/${rel.slug || rel.id}`)}
                  onAddToCart={() => handleRelatedAddToCart(rel)}
                />
              ))}
            </View>
          </View>
        )}

      </ScrollView>

      {/* ── Sticky CTA Footer ── */}
      <View style={[ft.bar, { paddingBottom: insets.bottom + 10 }]}>
        <TouchableOpacity
          onPress={() => handleAddToCart()}
          disabled={isOOS || cartLoading}
          style={[ft.cartBtn, (isOOS || cartLoading) && { opacity: 0.6 }]}>
          {cartLoading
            ? <ActivityIndicator size="small" color={C.green} />
            : <Text style={ft.cartBtnTxt}>🛒 Add to Cart</Text>}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleBuyNow}
          disabled={isOOS || cartLoading}
          style={[ft.buyBtn, (isOOS || cartLoading) && { opacity: 0.6 }]}>
          <Text style={ft.buyBtnTxt}>{isOOS ? 'Unavailable' : 'Buy Now'}</Text>
        </TouchableOpacity>
      </View>

      {/* Lightbox */}
      {lightboxIdx !== null && (
        <Lightbox images={allImages} activeIdx={lightboxIdx} onClose={() => setLightboxIdx(null)} />
      )}

      {/* Toast */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const hd = StyleSheet.create({
  bar:    { flexDirection: 'row', alignItems: 'center', gap: 10,
            paddingHorizontal: 14, paddingBottom: 12,
            backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.divider },
  backBtn:{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backTxt:{ fontSize: 22, color: C.green, fontWeight: '700' },
  title:  { flex: 1, fontSize: 15, fontWeight: '800', color: C.text },
  iconBtn:{ width: 36, height: 36, borderRadius: 18, borderWidth: 1.5,
            borderColor: C.dividerDash, alignItems: 'center', justifyContent: 'center',
            backgroundColor: C.white },
});

const ig = StyleSheet.create({
  wrap:        { backgroundColor: C.white, marginBottom: 8 },
  mainWrap:    { width: SW, height: SW * 0.88, backgroundColor: '#f9fafb',
                 alignItems: 'center', justifyContent: 'center', position: 'relative' },
  mainImg:     { width: '100%', height: '100%' },
  discBadge:   { position: 'absolute', top: 14, left: 14, zIndex: 2,
                 backgroundColor: C.red, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  discTxt:     { color: C.white, fontSize: 11, fontWeight: '800' },
  zoomHint:    { position: 'absolute', bottom: 14, right: 14, backgroundColor: 'rgba(0,0,0,0.38)',
                 borderRadius: 8, padding: 7 },
  thumb:       { width: 64, height: 64, borderRadius: 10, overflow: 'hidden',
                 borderWidth: 2, borderColor: 'transparent', backgroundColor: '#f9fafb' },
  thumbActive: { borderColor: C.green },
});

const pi = StyleSheet.create({
  card:         { backgroundColor: C.white, padding: 16, marginBottom: 8 },
  brand:        { fontSize: 10, fontWeight: '700', color: C.textLight, letterSpacing: 0.6 },
  catBadge:     { backgroundColor: C.greenLight, borderWidth: 1, borderColor: C.greenBorder,
                  borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  catTxt:       { fontSize: 10, fontWeight: '700', color: C.green, letterSpacing: 0.4 },
  name:         { fontSize: 22, fontWeight: '900', color: C.text, lineHeight: 28, marginBottom: 7 },
  shortDesc:    { fontSize: 13, color: C.textSub, lineHeight: 20, marginBottom: 12 },
  divider:      { height: 1, backgroundColor: C.divider, marginVertical: 14, borderStyle: 'dashed' },
  price:        { fontSize: 32, fontWeight: '900', color: C.green },
  oldPrice:     { fontSize: 16, color: C.textLight, textDecorationLine: 'line-through', fontWeight: '500' },
  saveBadge:    { backgroundColor: C.redLight, borderWidth: 1, borderColor: C.redBorder,
                  borderRadius: 5, paddingHorizontal: 8, paddingVertical: 2 },
  saveTxt:      { fontSize: 11, fontWeight: '800', color: C.red },
  stockBadge:   { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 6,
                  paddingHorizontal: 10, paddingVertical: 4 },
  stockTxt:     { fontSize: 12, fontWeight: '700' },
  metaBadge:    { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: C.dividerDash,
                  borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  metaTxt:      { fontSize: 12, color: C.textSub },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: C.textSub,
                  textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: C.text, marginBottom: 12 },
  qtyGroup:     { flexDirection: 'row', alignItems: 'center',
                  borderWidth: 2, borderColor: C.dividerDash, borderRadius: 10, overflow: 'hidden' },
  qtyBtn:       { width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: '#f9fafb' },
  qtyBtnTxt:    { fontSize: 20, fontWeight: '700', color: C.text, lineHeight: 24 },
  qtyVal:       { minWidth: 48, textAlign: 'center', fontSize: 15, fontWeight: '800',
                  color: C.text, borderLeftWidth: 1, borderRightWidth: 1,
                  borderColor: C.dividerDash, paddingVertical: 8 },
  attrRow:      { flexDirection: 'row', paddingVertical: 8, gap: 10 },
  attrKey:      { fontSize: 12, fontWeight: '600', color: C.textSub, minWidth: 110, flexShrink: 0 },
  attrVal:      { fontSize: 13, fontWeight: '700', color: C.text, flex: 1 },
  descTxt:      { fontSize: 13, color: '#374151', lineHeight: 22 },
});

const ft = StyleSheet.create({
  bar:       { position: 'absolute', bottom: 0, left: 0, right: 0,
               backgroundColor: C.white, paddingHorizontal: 14, paddingTop: 12,
               flexDirection: 'row', gap: 10,
               borderTopWidth: 1, borderTopColor: C.divider,
               shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 8, elevation: 10 },
  cartBtn:   { flex: 1, paddingVertical: 14, borderRadius: 12,
               borderWidth: 2, borderColor: C.green, backgroundColor: C.white,
               alignItems: 'center', justifyContent: 'center', minHeight: 50 },
  cartBtnTxt:{ fontSize: 14, fontWeight: '800', color: C.green },
  buyBtn:    { flex: 1, paddingVertical: 14, borderRadius: 12,
               backgroundColor: C.green, alignItems: 'center', justifyContent: 'center',
               minHeight: 50, shadowColor: C.green, shadowOpacity: 0.35, shadowRadius: 8, elevation: 4 },
  buyBtnTxt: { fontSize: 14, fontWeight: '800', color: C.white },
});

const err = StyleSheet.create({
  btn:    { paddingHorizontal: 24, paddingVertical: 12, backgroundColor: C.green, borderRadius: 10 },
  btnTxt: { color: C.white, fontSize: 14, fontWeight: '700' },
});