'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { cartAPI } from '@/lib/api';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [cart, setCart] = useState({
    items: [],
    totalPrice: 0,
    itemCount: 0,
    discountAmount: 0,
    finalPrice: 0,
    coupon: null,
  });
  const [loading, setLoading] = useState(false);

  // Fetch cart when user changes
  const fetchCart = useCallback(async () => {
    if (!user) {
      setCart({
        items: [],
        totalPrice: 0,
        itemCount: 0,
        discountAmount: 0,
        finalPrice: 0,
        coupon: null,
      });
      return;
    }
    try {
      setLoading(true);
      const data = await cartAPI.get();
      setCart(data.data);
    } catch (error) {
      console.error('Failed to fetch cart:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const addToCart = useCallback(async (productId, quantity = 1) => {
    if (!user) {
      toast.error('Please log in to add items to cart');
      return;
    }
    try {
      await cartAPI.add(productId, quantity);
      await fetchCart();
      toast.success('Added to cart!', {
        icon: '🛒',
        style: {
          borderRadius: '12px',
          background: '#1e293b',
          color: '#f8fafc',
        },
      });
    } catch (error) {
      toast.error(error.message || 'Failed to add to cart');
    }
  }, [user, fetchCart]);

  const updateQuantity = useCallback(async (itemId, quantity) => {
    try {
      await cartAPI.update(itemId, quantity);
      await fetchCart();
    } catch (error) {
      toast.error(error.message || 'Failed to update quantity');
    }
  }, [fetchCart]);

  const removeItem = useCallback(async (itemId) => {
    try {
      await cartAPI.remove(itemId);
      await fetchCart();
      toast.success('Item removed', {
        style: {
          borderRadius: '12px',
          background: '#1e293b',
          color: '#f8fafc',
        },
      });
    } catch (error) {
      toast.error(error.message || 'Failed to remove item');
    }
  }, [fetchCart]);

  const clearCart = useCallback(async () => {
    try {
      await cartAPI.clear();
      setCart({
        items: [],
        totalPrice: 0,
        itemCount: 0,
        discountAmount: 0,
        finalPrice: 0,
        coupon: null,
      });
    } catch (error) {
      toast.error('Failed to clear cart');
    }
  }, []);

  const applyCoupon = useCallback(async (code) => {
    try {
      const result = await cartAPI.applyCoupon(code);
      await fetchCart();
      toast.success('Coupon applied successfully');
      return result;
    } catch (error) {
      toast.error(error.message || 'Failed to apply coupon');
      throw error;
    }
  }, [fetchCart]);

  return (
    <CartContext.Provider
      value={{ cart, loading, addToCart, updateQuantity, removeItem, clearCart, fetchCart, applyCoupon }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
