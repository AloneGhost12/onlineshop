'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { sellerAPI } from '@/lib/api';

const SellerAuthContext = createContext(null);

export function SellerAuthProvider({ children }) {
  const [seller, setSeller] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSeller = async () => {
      try {
        const token = localStorage.getItem('sellerToken');
        if (!token) {
          setLoading(false);
          return;
        }

        const response = await sellerAPI.getMe();
        setSeller(response.seller);
      } catch (error) {
        localStorage.removeItem('sellerToken');
        localStorage.removeItem('seller');
      } finally {
        setLoading(false);
      }
    };

    loadSeller();
  }, []);

  const loginSeller = useCallback(async (email, password) => {
    const response = await sellerAPI.login({ email, password });
    localStorage.setItem('sellerToken', response.token);
    setSeller(response.seller);
    return response;
  }, []);

  const registerSeller = useCallback(async (payload) => {
    const response = await sellerAPI.register(payload);

    if (response.token && response.seller) {
      localStorage.setItem('sellerToken', response.token);
      setSeller(response.seller);
    }

    return response;
  }, []);

  const applySeller = useCallback(async (payload) => {
    const response = await sellerAPI.apply(payload);
    return response;
  }, []);

  const logoutSeller = useCallback(async () => {
    try {
      await sellerAPI.logout();
    } catch (error) {
      // ignore logout failures
    }

    localStorage.removeItem('sellerToken');
    localStorage.removeItem('seller');
    setSeller(null);
  }, []);

  return (
    <SellerAuthContext.Provider
      value={{ seller, loading, loginSeller, registerSeller, applySeller, logoutSeller, isSeller: Boolean(seller) }}
    >
      {children}
    </SellerAuthContext.Provider>
  );
}

export function useSellerAuth() {
  const context = useContext(SellerAuthContext);
  if (!context) {
    throw new Error('useSellerAuth must be used within a SellerAuthProvider');
  }

  return context;
}