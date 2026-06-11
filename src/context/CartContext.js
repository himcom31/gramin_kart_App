import React, { createContext, useContext, useState, useEffect } from 'react';
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
    const unsubCart = EventEmitter.on('cart-updated', (data) => {
      const total = (data?.items || []).reduce((sum, i) => sum + (i.quantity || 0), 0);
      setCartCount(total);
    });
    const unsubWish = EventEmitter.on('wishlist-updated', (data) => {
      setWishlistCount((data?.products || []).length);
    });
    return () => { unsubCart(); unsubWish(); };
  }, []);

  return (
    <CartContext.Provider value={{ cartCount, wishlistCount }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);