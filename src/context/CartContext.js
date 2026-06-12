import { createContext, useContext, useEffect, useState } from 'react';
import { fetchCart, fetchWishlist } from '../api/cartWishlist';
import { EventEmitter } from '../api/EventEmitter';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const { isLoggedIn } = useAuth();
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);

  useEffect(() => {
    if (!isLoggedIn) { setCartCount(0); setWishlistCount(0); return; }
    fetchCart().then(data => {
      const total = (data?.items || []).reduce((sum, i) => sum + (i.quantity || 0), 0);
      setCartCount(total);
    }).catch(() => {});
    fetchWishlist().then(data => {
      setWishlistCount((data?.products || []).length);
    }).catch(() => {});
  }, [isLoggedIn]);

  useEffect(() => {
  const cartHandler = (data) => {
    const total = (data?.items || []).reduce((sum, i) => sum + (i.quantity || 0), 0);
    setCartCount(total);
  };
  const wishHandler = (data) => {
    setWishlistCount((data?.products || []).length);
  };

  EventEmitter.on('cart-updated', cartHandler);
  EventEmitter.on('wishlist-updated', wishHandler);

  return () => {
    EventEmitter.off('cart-updated', cartHandler);
    EventEmitter.off('wishlist-updated', wishHandler);
  };
}, []);

  return (
    <CartContext.Provider value={{ cartCount, wishlistCount }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);