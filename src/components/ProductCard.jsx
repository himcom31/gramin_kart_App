// src/components/ProductCard.jsx
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { EventEmitter } from "../api/EventEmitter";
import { Storage as store } from "../api/storage";

const { width: SCREEN_W } = Dimensions.get("window");
const isMobile = SCREEN_W < 600;
const API_URL = process.env.EXPO_PUBLIC_API_URL;

const getToken = () => store.getItem("userToken");

// ─── API helpers ──────────────────────────────────────────────────────────────
const addToCart = async (productId) => {
  const token = await getToken();
  const res = await fetch(`${API_URL}/api/cart/add`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ productId, quantity: 1 }),
  });
  return res.json();
};

const fetchCart = async () => {
  const token = await getToken();
  const res = await fetch(`${API_URL}/api/cart`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
};

const toggleWishlist = async (productId, isWished) => {
  const token = await getToken();
  if (isWished) {
    return fetch(`${API_URL}/api/wishlist/remove/${productId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json());
  }
  return fetch(`${API_URL}/api/wishlist/add`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ productId }),
  }).then(r => r.json());
};

const fetchWishlist = async () => {
  const token = await getToken();
  return fetch(`${API_URL}/api/wishlist`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then(r => r.json());
};

// ─── Field Normaliser ─────────────────────────────────────────────────────────
const normalise = (product) => {
  if (!product) return {};
  const displayPrice = Number(product.sellingPrice ?? product.discountPrice ?? product.price ?? 0);
  const rawStrike    = Number(product.mrp ?? product.oldPrice ?? product.buyingPrice ?? 0);
  const strikePrice  = rawStrike > displayPrice ? rawStrike : null;
  const discountPct  = strikePrice && displayPrice > 0
    ? Math.round((1 - displayPrice / strikePrice) * 100) : null;
  const image    = product.thumbnail || product.image || product.images?.[0] || null;
  const name     = product.name || product.title || "Product";
  const category = typeof product.category === "object"
    ? product.category?.name || "" : product.category || product.categoryName || "";
  const stock        = Number(product.stockQuantity ?? product.stock ?? product.quantity ?? 0);
  const isOutOfStock = stock === 0;
  const isLowStock   = stock > 0 && stock <= 10;
  const unit    = product.unit || product.weight || product.unitLabel || "";
  const navSlug = product.slug || product.id || product._id || product.productId || null;
  const rating  = Number(product.rating || product.averageRating || 4);

  return { displayPrice, strikePrice, discountPct, image, name, category,
           stock, isOutOfStock, isLowStock, unit, navSlug, rating };
};

// ─── Star Rating ──────────────────────────────────────────────────────────────
const StarRating = ({ rating = 4 }) => (
  <View style={{ flexDirection: "row", gap: 2 }}>
    {[1, 2, 3, 4, 5].map(i => (
      <Text key={i} style={{ fontSize: 10, color: i <= Math.round(rating) ? "#f39c12" : "#ddd" }}>★</Text>
    ))}
  </View>
);

// ─── ProductCard ──────────────────────────────────────────────────────────────
const ProductCard = ({ product, onUnwish }) => {
  const router = useRouter();
  const [wished,      setWished]      = useState(false);
  const [added,       setAdded]       = useState(false);
  const [cartLoading, setCartLoading] = useState(false);

  const { displayPrice, strikePrice, discountPct, image, name, category,
          stock, isOutOfStock, isLowStock, unit, navSlug, rating } = normalise(product);

  // ── Load wishlist state on mount ─────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) return;
      fetchWishlist()
        .then(data => {
          const ids = (data.products || []).map(p => p.id || p);
          setWished(ids.includes(product.id));
        })
        .catch(() => {});
    })();
  }, [product.id]);

  // ── Add to cart ──────────────────────────────────────────────────────────
  const handleAddToCart = async () => {
    const token = await getToken();
    if (!token) { router.push("/login"); return; }
    if (cartLoading) return;
    setCartLoading(true);
    try {
      await addToCart(product.id);
      setAdded(true);
      setTimeout(() => setAdded(false), 1800);
      const cart = await fetchCart();
      EventEmitter.emit("cart-updated", { items: cart?.items || [] });
    } catch {}
    finally { setCartLoading(false); }
  };

  // ── Toggle wishlist ──────────────────────────────────────────────────────
  const handleWishlist = async () => {
    const token = await getToken();
    if (!token) { router.push("/login"); return; }
    try {
      const res = await toggleWishlist(product.id, wished);
      const nowWished = !wished;
      setWished(nowWished);
      if (!nowWished && typeof onUnwish === "function") onUnwish(product.id);
      EventEmitter.emit("wishlist-updated", { products: res?.products || [] });
    } catch {}
  };

  const imgHeight = isMobile ? 120 : 170;

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={() => navSlug && router.push(`/product/${navSlug}`)}
      style={styles.card}
    >
      <View style={[styles.imgWrap, { height: imgHeight }]}>
        {image
          ? <Image source={{ uri: image }} style={styles.img} resizeMode="cover" />
          : <Text style={{ fontSize: 36 }}>🛒</Text>}
        {discountPct && discountPct > 0 && (
          <View style={styles.discBadge}>
            <Text style={styles.discText}>{discountPct}% off</Text>
          </View>
        )}
        <TouchableOpacity onPress={handleWishlist} style={styles.wishBtn}>
          <Text style={{ fontSize: 14, color: wished ? "#e74c3c" : "#bbb" }}>
            {wished ? "♥" : "♡"}
          </Text>
        </TouchableOpacity>
      </View>

      {!!category && <Text style={styles.cat}>{category}</Text>}
      <Text numberOfLines={2} style={[styles.name, { fontSize: isMobile ? 11 : 12 }]}>{name}</Text>
      <StarRating rating={rating} />
      <Text style={[styles.stock, { color: isOutOfStock ? "#e74c3c" : isLowStock ? "#e67e22" : "#aaa" }]}>
        {isOutOfStock ? "❌ Out of Stock" : isLowStock ? `⚠️ Only ${stock} left` : `✅ In Stock: ${stock}`}
      </Text>

      <View style={styles.priceRow}>
        <Text style={[styles.price, { fontSize: isMobile ? 13 : 14 }]}>₹{displayPrice.toFixed(2)}</Text>
        {strikePrice && <Text style={styles.strike}>₹{strikePrice.toFixed(2)}</Text>}
        {!!unit && <Text style={styles.unit}>{unit}</Text>}
      </View>

      <TouchableOpacity
        onPress={handleAddToCart}
        disabled={isOutOfStock || cartLoading}
        style={[
          styles.cartBtn,
          { backgroundColor: isOutOfStock ? "#ccc" : added ? "#218c21" : "#2d9e2d",
            opacity: cartLoading ? 0.7 : 1 }
        ]}
      >
        <Text style={styles.cartBtnTxt}>
          {isOutOfStock ? "Out of Stock" : cartLoading ? "Adding..." : added ? "✓ Added!" : "🛒 Add To Cart"}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff", borderRadius: 10,
    padding: isMobile ? 8 : 10, borderWidth: 1, borderColor: "#efefef",
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 5,
    shadowOffset: { width: 0, height: 1 }, elevation: 2, flex: 1,
  },
  imgWrap: {
    width: "100%", backgroundColor: "#f5f5f5", borderRadius: 7,
    overflow: "hidden", alignItems: "center", justifyContent: "center",
    marginBottom: 8, position: "relative",
  },
  img:       { width: "100%", height: "100%" },
  discBadge: { position: "absolute", top: 6, left: 6, backgroundColor: "#ff6b35",
               borderRadius: 3, paddingHorizontal: 6, paddingVertical: 2 },
  discText:  { color: "#fff", fontSize: 9, fontWeight: "800" },
  wishBtn:   { position: "absolute", top: 6, right: 6, backgroundColor: "#fff",
               borderRadius: 13, width: 26, height: 26, alignItems: "center",
               justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.13,
               shadowRadius: 4, elevation: 2 },
  cat:       { fontSize: 10, color: "#2d9e2d", fontWeight: "600", marginBottom: 2 },
  name:      { fontWeight: "700", color: "#1a1a1a", marginBottom: 4, lineHeight: 17 },
  stock:     { fontSize: 10, marginBottom: 6 },
  priceRow:  { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 8, flexWrap: "wrap" },
  price:     { fontWeight: "800", color: "#2d9e2d" },
  strike:    { fontSize: 11, color: "#ccc", textDecorationLine: "line-through" },
  unit:      { marginLeft: "auto", fontSize: 10, color: "#999" },
  cartBtn:   { width: "100%", paddingVertical: 7, borderRadius: 6,
               alignItems: "center", justifyContent: "center", marginTop: "auto" },
  cartBtnTxt:{ color: "#fff", fontSize: 11, fontWeight: "700" },
});

export default ProductCard;