'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '@/lib/api';
import { hasAdminAccess, hasPermission } from '@/lib/rbac';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setLoading(false);
          return;
        }
        const data = await authAPI.getMe();
        setUser(data.user);
      } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const login = useCallback(async (email, password) => {
    // Clear any stale seller session when switching primary user account.
    localStorage.removeItem('sellerToken');
    localStorage.removeItem('seller');

    const data = await authAPI.login({ email, password });
    localStorage.setItem('token', data.token);
    setUser(data.user);
    return data;
  }, []);

  const register = useCallback(async (name, email, password) => {
    // User registration should start with a clean seller session.
    localStorage.removeItem('sellerToken');
    localStorage.removeItem('seller');

    const data = await authAPI.register({ name, email, password });
    localStorage.setItem('token', data.token);
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch (e) {
      // Ignore
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('sellerToken');
    localStorage.removeItem('seller');
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (data) => {
    const res = await authAPI.updateProfile(data);
    setUser(res.user);
    return res;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        updateProfile,
        isAdmin: hasAdminAccess(user),
        hasAdminAccess: hasAdminAccess(user),
        hasPermission: (permission) => hasPermission(user, permission),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
