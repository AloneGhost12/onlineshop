'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSellerAuth } from '@/context/SellerAuthContext';
import { useCart } from '@/context/CartContext';
import { sellerAPI } from '@/lib/api';
import {
  ShoppingCart, User, Search, Menu, X, LogOut, Package,
  LayoutDashboard, ChevronDown, Store
} from 'lucide-react';

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const { seller, isSeller } = useSellerAuth();
  const { cart } = useCart();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [sellerApplicationStatus, setSellerApplicationStatus] = useState('none');
  const canAccessSellerHubFromUserMenu = Boolean(
    isSeller
    && seller?.email
    && user?.email
    && String(seller.email).toLowerCase() === String(user.email).toLowerCase()
  );

  useEffect(() => {
    let mounted = true;

    const loadSellerApplicationStatus = async () => {
      if (!user) {
        setSellerApplicationStatus('none');
        return;
      }

      try {
        const response = await sellerAPI.getApplicationStatus();
        if (mounted) {
          setSellerApplicationStatus(response?.data?.status || 'none');
        }
      } catch (error) {
        if (mounted) {
          setSellerApplicationStatus('none');
        }
      }
    };

    loadSellerApplicationStatus();

    return () => {
      mounted = false;
    };
  }, [user]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/products?search=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group" id="nav-logo">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:shadow-indigo-500/40 transition-shadow">
              <Store className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              ShopVault
            </span>
          </Link>

          {/* Search Bar */}
          <form
            onSubmit={handleSearch}
            className="hidden md:flex flex-1 max-w-xl mx-8"
          >
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search products, brands, categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-100 rounded-xl border border-transparent focus:bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-sm"
                id="search-input"
              />
            </div>
          </form>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* Cart */}
            <Link
              href="/cart"
              className="relative p-2.5 rounded-xl hover:bg-slate-100 transition-colors"
              id="nav-cart"
            >
              <ShoppingCart className="w-5 h-5 text-slate-600" />
              {cart.itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs rounded-full flex items-center justify-center font-medium shadow-lg animate-scale-in">
                  {cart.itemCount > 9 ? '9+' : cart.itemCount}
                </span>
              )}
            </Link>

            {/* User Menu */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors"
                  id="nav-user-menu"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium shadow-sm">
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-slate-700 max-w-[100px] truncate">
                    {user.name}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {profileOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200/60 py-2 z-50 animate-slide-down">
                      <div className="px-4 py-3 border-b border-slate-100">
                        <p className="text-sm font-semibold text-slate-800">{user.name}</p>
                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                      </div>
                      <div className="py-1">
                        <Link href="/profile" onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                          <User className="w-4 h-4" /> My Profile
                        </Link>
                        <Link href="/settings" onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                          <LayoutDashboard className="w-4 h-4" /> Settings
                        </Link>
                        <Link href="/orders" onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                          <Package className="w-4 h-4" /> My Orders
                        </Link>
                        {isAdmin && (
                          <Link href="/admin" onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-indigo-600 hover:bg-indigo-50 transition-colors font-medium">
                            <LayoutDashboard className="w-4 h-4" /> Admin Panel
                          </Link>
                        )}
                        {!canAccessSellerHubFromUserMenu && sellerApplicationStatus === 'approved' && (
                          <Link href="/seller/login" onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-emerald-700 hover:bg-emerald-50 transition-colors font-medium">
                            <Store className="w-4 h-4" /> Switch to Seller Account
                          </Link>
                        )}
                        {!canAccessSellerHubFromUserMenu && sellerApplicationStatus !== 'approved' && (
                          <Link href="/seller/register" onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-emerald-700 hover:bg-emerald-50 transition-colors font-medium">
                            <Store className="w-4 h-4" /> Apply for Seller Approval
                          </Link>
                        )}
                        {canAccessSellerHubFromUserMenu && (
                          <Link href="/seller/dashboard" onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-emerald-600 hover:bg-emerald-50 transition-colors font-medium">
                            <Store className="w-4 h-4" /> Seller Hub
                          </Link>
                        )}
                      </div>
                      <div className="border-t border-slate-100 pt-1">
                        <button
                          onClick={() => { logout(); setProfileOpen(false); }}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 w-full transition-colors"
                        >
                          <LogOut className="w-4 h-4" /> Sign Out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link
                  href="/seller/register"
                  className="px-4 py-2.5 text-sm font-semibold text-emerald-700 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-all"
                >
                  Create Seller Account
                </Link>
                <Link
                  href="/auth/register"
                  className="px-4 py-2.5 text-sm font-semibold text-indigo-700 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-all"
                  id="nav-register"
                >
                  Sign Up
                </Link>
                <Link
                  href="/auth/login"
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl hover:from-indigo-600 hover:to-purple-700 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all"
                  id="nav-login"
                >
                  Sign In
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2.5 rounded-xl hover:bg-slate-100 transition-colors"
              id="nav-mobile-toggle"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white animate-slide-down">
          <div className="px-4 py-3">
            <form onSubmit={handleSearch}>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-100 rounded-xl outline-none text-sm"
                />
              </div>
            </form>
          </div>
          <div className="px-4 pb-4 space-y-1">
            <Link href="/products" onClick={() => setMobileOpen(false)}
              className="block px-4 py-2.5 text-sm rounded-xl hover:bg-slate-50 transition-colors">
              All Products
            </Link>
            <Link href="/cart" onClick={() => setMobileOpen(false)}
              className="block px-4 py-2.5 text-sm rounded-xl hover:bg-slate-50 transition-colors">
              Cart {cart.itemCount > 0 && `(${cart.itemCount})`}
            </Link>

            {user ? (
              <>
                <Link href="/profile" onClick={() => setMobileOpen(false)}
                  className="block px-4 py-2.5 text-sm rounded-xl hover:bg-slate-50 transition-colors">
                  My Profile
                </Link>
                <Link href="/settings" onClick={() => setMobileOpen(false)}
                  className="block px-4 py-2.5 text-sm rounded-xl hover:bg-slate-50 transition-colors">
                  Settings
                </Link>
                <Link href="/orders" onClick={() => setMobileOpen(false)}
                  className="block px-4 py-2.5 text-sm rounded-xl hover:bg-slate-50 transition-colors">
                  My Orders
                </Link>
                {isAdmin && (
                  <Link href="/admin" onClick={() => setMobileOpen(false)}
                    className="block px-4 py-2.5 text-sm rounded-xl text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors font-medium">
                    Admin Panel
                  </Link>
                )}
                {canAccessSellerHubFromUserMenu ? (
                  <Link href="/seller/dashboard" onClick={() => setMobileOpen(false)}
                    className="block px-4 py-2.5 text-sm rounded-xl text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors font-medium">
                    Seller Hub
                  </Link>
                ) : (
                  <Link href="/seller/register" onClick={() => setMobileOpen(false)}
                    className="block px-4 py-2.5 text-sm rounded-xl text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors font-medium">
                    Create Seller Account
                  </Link>
                )}
                <button
                  onClick={() => { logout(); setMobileOpen(false); }}
                  className="block w-full text-left px-4 py-2.5 text-sm rounded-xl text-red-600 hover:bg-red-50 transition-colors"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/register" onClick={() => setMobileOpen(false)}
                  className="block px-4 py-2.5 text-sm rounded-xl text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors font-medium">
                  Sign Up
                </Link>
                <Link href="/auth/login" onClick={() => setMobileOpen(false)}
                  className="block px-4 py-2.5 text-sm rounded-xl text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 transition-colors font-medium">
                  Sign In
                </Link>
                <Link href="/seller/register" onClick={() => setMobileOpen(false)}
                  className="block px-4 py-2.5 text-sm rounded-xl hover:bg-slate-50 transition-colors">
                  Create Seller Account
                </Link>
                <Link href="/seller/login" onClick={() => setMobileOpen(false)}
                  className="block px-4 py-2.5 text-sm rounded-xl hover:bg-slate-50 transition-colors">
                  Seller Login
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
