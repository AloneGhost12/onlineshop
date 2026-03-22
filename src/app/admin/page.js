'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { adminAPI, productAPI } from '@/lib/api';
import ImageUpload from '@/components/product/ImageUpload';
import CouponManager from '@/components/admin/CouponManager';
import UserManagement from '@/components/admin/UserManagement';
import AdminManagement from '@/components/admin/AdminManagement';
import SellerManagement from '@/components/admin/SellerManagement';
import DebugDashboard from '@/components/admin/DebugDashboard';
import { useTheme } from '@/context/ThemeContext';
import {
  LayoutDashboard, Package, Users, ShoppingBag, DollarSign,
  Plus, Edit, Trash2, Loader2,
  BarChart3, Eye, Megaphone, TicketPercent, ShieldAlert, ShieldCheck, UserCheck, Ban, Activity, Store, Bug, Settings, Moon, Sun
} from 'lucide-react';
import toast from 'react-hot-toast';

const FALLBACK_PRODUCT_IMAGE = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200';

const normalizeImageUrl = (imageUrl) => {
  if (typeof imageUrl !== 'string' || !imageUrl.trim()) {
    return FALLBACK_PRODUCT_IMAGE;
  }

  const value = imageUrl.trim();
  if (value.includes('photo-1507473885765-e6ed057ab6fe')) {
    return FALLBACK_PRODUCT_IMAGE;
  }

  return value;
};

export default function AdminPage() {
  const { user, isAdmin, hasPermission, hasAdminAccess } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboard, setDashboard] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Product form
  const [showProductForm, setShowProductForm] = useState(false);
  const [productForm, setProductForm] = useState({
    title: '', description: '', price: '', comparePrice: '', stock: '', category: '', brand: '', featured: false, commissionPercentage: '',
    images: [{ url: '', alt: '' }],
  });
  const [categories, setCategories] = useState([]);
  const [editingId, setEditingId] = useState(null);

  const canViewAnalytics = hasPermission('VIEW_ANALYTICS');
  const canManageProducts = hasPermission('MANAGE_PRODUCTS');
  const canManageOrders = hasPermission('MANAGE_ORDERS');
  const canManageUsers = hasPermission('MANAGE_USERS');
  const canManageCoupons = hasPermission('MANAGE_COUPONS');
  const canManageAdmins = hasPermission('MANAGE_ADMINS');

  const tabs = useMemo(
    () => [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, visible: canViewAnalytics },
      { id: 'products', label: 'Products', icon: Package, visible: canManageProducts },
      { id: 'orders', label: 'Orders', icon: ShoppingBag, visible: canManageOrders },
      { id: 'users', label: 'Users', icon: Users, visible: canManageUsers },
      { id: 'sellers', label: 'Sellers', icon: Store, visible: canManageUsers },
      { id: 'coupons', label: 'Coupons', icon: TicketPercent, visible: canManageCoupons },
      { id: 'admins', label: 'Admins', icon: ShieldCheck, visible: canManageAdmins },
      { id: 'settings', label: 'Settings', icon: Settings, visible: true },
      { id: 'debug', label: 'Debug', icon: Bug, visible: isAdmin },
    ].filter((tab) => tab.visible),
    [canManageAdmins, canManageCoupons, canManageOrders, canManageProducts, canManageUsers, canViewAnalytics, isAdmin]
  );

  const firstTabId = tabs[0]?.id || null;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'dashboard' && canViewAnalytics) {
        const data = await adminAPI.getDashboard();
        setDashboard(data.data);
      } else if (activeTab === 'products' && canManageProducts) {
        const [prodData, catData] = await Promise.all([
          productAPI.getAll({ limit: 50 }),
          adminAPI.getCategories(),
        ]);
        setProducts(prodData.data || []);
        setCategories(catData.data || []);
      } else if (activeTab === 'orders' && canManageOrders) {
        const data = await adminAPI.getOrders({ limit: 50 });
        setOrders(data.data || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, canManageOrders, canManageProducts, canViewAnalytics]);

  useEffect(() => {
    if (firstTabId && !tabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(firstTabId);
      return;
    }

    loadData();
  }, [activeTab, firstTabId, loadData, tabs]);

  const handleSaveProduct = async () => {
    try {
      const data = {
        ...productForm,
        price: Number(productForm.price),
        comparePrice: Number(productForm.comparePrice) || 0,
        stock: Number(productForm.stock),
        commissionPercentage: Number(productForm.commissionPercentage) || 0,
        images: productForm.images.filter(img => img.url),
      };

      if (editingId) {
        await productAPI.update(editingId, data);
        toast.success('Product updated!');
      } else {
        await productAPI.create(data);
        toast.success('Product created!');
      }
      setShowProductForm(false);
      setEditingId(null);
      setProductForm({ title: '', description: '', price: '', comparePrice: '', stock: '', category: '', brand: '', featured: false, commissionPercentage: '', images: [{ url: '', alt: '' }] });
      loadData();
    } catch (error) {
      toast.error(error.message || 'Failed to save product');
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await productAPI.delete(id);
      toast.success('Product deleted');
      loadData();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const handleEditProduct = (product) => {
    setProductForm({
      title: product.title,
      description: product.description,
      price: product.price,
      comparePrice: product.comparePrice || '',
      stock: product.stock,
      category: product.category?._id || product.category,
      brand: product.brand || '',
      featured: product.featured || false,
      commissionPercentage: product.commissionPercentage || '',
      images: product.images?.length ? product.images : [{ url: '', alt: '' }],
    });
    setEditingId(product._id);
    setShowProductForm(true);
  };

  const handleUpdateOrderStatus = async (orderId, status) => {
    try {
      await adminAPI.updateOrder(orderId, { status });
      toast.success('Order status updated');
      loadData();
    } catch (error) {
      toast.error('Failed to update order');
    }
  };

  if (!user || !isAdmin || !hasAdminAccess) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold text-slate-800 mb-2">Access Denied</h2>
        <p className="text-slate-500">Admin access required</p>
        <Link href="/auth/login" className="text-indigo-600 font-semibold mt-4 inline-block hover:underline">Sign In as Admin</Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-indigo-600" /> Admin Panel
          </h1>
          <p className="text-slate-500 text-sm mt-1">Manage your store with role-based access and permission-aware controls</p>
        </div>
        <div className="flex w-full flex-wrap items-stretch gap-3 lg:w-auto lg:justify-end">
          {canManageCoupons && (
            <Link
              href="/admin/promotions"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700 shadow-sm transition-colors hover:bg-amber-100"
            >
              <Megaphone className="h-4 w-4" /> Promotions
            </Link>
          )}
          {canManageUsers && (
            <Link
              href="/admin/fraud-monitor"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 shadow-sm transition-colors hover:bg-rose-100"
            >
              <ShieldAlert className="h-4 w-4" /> Fraud Monitor
            </Link>
          )}
          <div className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm sm:text-right">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Signed in as</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{user.role}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-8 flex gap-2 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
      ) : (
        <>
          {/* ─── Dashboard Tab ─── */}
          {activeTab === 'dashboard' && dashboard && (
            <div className="space-y-8 animate-fade-in">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-8">
                {[
                  { label: 'Total Users', value: dashboard.stats.totalUsers, icon: Users, tone: 'bg-sky-50 text-sky-700' },
                  { label: 'Total Sellers', value: dashboard.stats.totalSellers, icon: Store, tone: 'bg-teal-50 text-teal-700' },
                  { label: 'Active Users', value: dashboard.stats.activeUsers, icon: Activity, tone: 'bg-emerald-50 text-emerald-700' },
                  { label: 'Blocked Users', value: dashboard.stats.blockedUsers, icon: Ban, tone: 'bg-amber-50 text-amber-700' },
                  { label: 'Suspended Sellers', value: dashboard.stats.suspendedSellers, icon: ShieldCheck, tone: 'bg-rose-50 text-rose-700' },
                  { label: 'Coupon Usage', value: dashboard.stats.couponUsage, icon: TicketPercent, tone: 'bg-rose-50 text-rose-700' },
                  { label: 'Orders Today', value: dashboard.stats.todayOrders, icon: ShoppingBag, tone: 'bg-indigo-50 text-indigo-700' },
                  { label: 'Revenue Today', value: `₹${dashboard.stats.revenueToday?.toLocaleString('en-IN')}`, icon: DollarSign, tone: 'bg-green-50 text-green-700' },
                ].map((stat, i) => (
                  <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200/60 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.tone}`}>
                        <stat.icon className="w-5 h-5" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                    <p className="text-sm text-slate-500 mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-6 xl:grid-cols-[1.8fr,1fr]">
                <div className="bg-white rounded-2xl border border-slate-200/60 p-6">
                  <h3 className="font-bold text-slate-900 mb-5 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-indigo-600" /> Revenue Trend
                  </h3>
                  <div className="flex items-end gap-3 h-64">
                    {(dashboard.dailyRevenue || []).slice(-10).map((entry) => {
                      const maxRevenue = Math.max(...(dashboard.dailyRevenue || []).map((item) => item.revenue || 0), 1);
                      const height = Math.max(12, Math.round((entry.revenue / maxRevenue) * 100));
                      return (
                        <div key={entry._id} className="flex flex-1 flex-col items-center gap-2">
                          <div className="w-full rounded-t-2xl bg-gradient-to-t from-indigo-600 to-sky-400" style={{ height: `${height}%` }} />
                          <div className="text-center text-[11px] text-slate-500">
                            <div>{entry._id.slice(5)}</div>
                            <div className="font-semibold text-slate-700">₹{Math.round(entry.revenue)}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-white rounded-2xl border border-slate-200/60 p-6">
                    <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <UserCheck className="w-5 h-5 text-indigo-600" /> Role Distribution
                    </h3>
                    <div className="space-y-3">
                      {(dashboard.roleDistribution || []).map((entry, index) => {
                        const maxCount = Math.max(...(dashboard.roleDistribution || []).map((item) => item.count || 0), 1);
                        return (
                          <div key={`${entry.role}-${index}`}>
                            <div className="mb-1 flex items-center justify-between text-sm text-slate-600">
                              <span>{entry.role}</span>
                              <span className="font-semibold text-slate-900">{entry.count}</span>
                            </div>
                            <div className="h-2 rounded-full bg-slate-100">
                              <div className="h-2 rounded-full bg-slate-900" style={{ width: `${Math.max(8, (entry.count / maxCount) * 100)}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200/60 p-6">
                    <h3 className="font-bold text-slate-900 mb-3">Coupon Analytics</h3>
                    <p className="text-3xl font-bold text-slate-900">{dashboard.couponAnalytics?.totalUses || 0}</p>
                    <p className="text-sm text-slate-500 mt-1">Total coupon redemptions</p>
                    <p className="mt-4 text-sm text-slate-700">Active coupons: <span className="font-semibold">{dashboard.couponAnalytics?.activeCoupons || 0}</span></p>
                    <p className="text-sm text-slate-700">All-time revenue: <span className="font-semibold">₹{dashboard.stats.totalRevenue?.toLocaleString('en-IN')}</span></p>
                  </div>
                </div>
              </div>

              {/* Recent Orders */}
              <div className="bg-white rounded-2xl border border-slate-200/60 p-4 sm:p-6">
                <h3 className="font-bold text-slate-900 mb-4">Recent Orders</h3>
                <div className="space-y-3">
                  {dashboard.recentOrders?.slice(0, 5).map((order) => (
                    <div key={order._id} className="flex flex-col gap-2 py-3 border-b border-slate-50 last:border-0 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{order.orderNumber}</p>
                        <p className="text-xs text-slate-500">{order.user?.name || 'Unknown'} • {new Date(order.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="text-sm font-bold">₹{order.totalPrice?.toLocaleString('en-IN')}</p>
                        <span className={`text-xs font-medium capitalize px-2 py-0.5 rounded-full ${
                          order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                          order.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                          'bg-indigo-100 text-indigo-700'
                        }`}>{order.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Products */}
              {dashboard.topProducts?.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200/60 p-6">
                  <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-indigo-600" /> Top Selling Products
                  </h3>
                  <div className="space-y-3">
                    {dashboard.topProducts.map((prod, i) => (
                      <div key={prod._id} className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <span className="text-sm font-bold text-slate-400 w-6">#{i + 1}</span>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-800">{prod.title}</p>
                        </div>
                        <p className="text-sm text-slate-500">{prod.totalSold} sold</p>
                        <p className="text-sm font-bold text-green-600">₹{prod.totalRevenue?.toLocaleString('en-IN')}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── Products Tab ─── */}
          {activeTab === 'products' && (
            <div className="animate-fade-in">
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">{products.length} products</p>
                <button
                  onClick={() => { setShowProductForm(true); setEditingId(null); setProductForm({ title: '', description: '', price: '', comparePrice: '', stock: '', category: '', brand: '', featured: false, commissionPercentage: '', images: [{ url: '', alt: '' }] }); }}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/25"
                >
                  <Plus className="w-4 h-4" /> Add Product
                </button>
              </div>

              {/* Product Form Modal */}
              {showProductForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                  <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto animate-scale-in">
                    <h2 className="text-lg font-bold mb-4">{editingId ? 'Edit Product' : 'Add New Product'}</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label className="text-sm font-medium text-slate-700 mb-1 block">Title</label>
                        <input value={productForm.title} onChange={(e) => setProductForm({ ...productForm, title: e.target.value })}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100" />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-sm font-medium text-slate-700 mb-1 block">Description</label>
                        <textarea rows={3} value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100 resize-none" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-1 block">Price (₹)</label>
                        <input type="number" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-1 block">Compare Price (₹)</label>
                        <input type="number" value={productForm.comparePrice} onChange={(e) => setProductForm({ ...productForm, comparePrice: e.target.value })}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-1 block">Stock</label>
                        <input type="number" value={productForm.stock} onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-1 block">Commission (%)</label>
                        <input type="number" value={productForm.commissionPercentage} onChange={(e) => setProductForm({ ...productForm, commissionPercentage: e.target.value })}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-1 block">Category</label>
                        <select value={productForm.category} onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100">
                          <option value="">Select category</option>
                          {categories.map((cat) => <option key={cat._id} value={cat._id}>{cat.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-1 block">Brand</label>
                        <input value={productForm.brand} onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100" />
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={productForm.featured} onChange={(e) => setProductForm({ ...productForm, featured: e.target.checked })} className="accent-indigo-600" />
                        <label className="text-sm font-medium text-slate-700">Featured Product</label>
                      </div>
                      <div className="sm:col-span-2">
                        <ImageUpload
                          images={productForm.images}
                          onChange={(images) => setProductForm({ ...productForm, images })}
                          maxImages={5}
                        />
                      </div>
                    </div>
                    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                      <button onClick={() => setShowProductForm(false)} className="w-full sm:w-auto px-6 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors">Cancel</button>
                      <button onClick={handleSaveProduct} className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors">
                        {editingId ? 'Update Product' : 'Create Product'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Products Table */}
              <div className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="text-left py-3 px-4 font-semibold text-slate-600">Product</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-600">Price</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-600">Stock</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-600">Rating</th>
                        <th className="text-right py-3 px-4 font-semibold text-slate-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((prod) => (
                        <tr key={prod._id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <Image
                                src={normalizeImageUrl(prod.images?.[0]?.url)}
                                alt={prod.title}
                                width={40}
                                height={40}
                                className="w-10 h-10 rounded-lg object-cover"
                              />
                              <div>
                                <p className="font-medium text-slate-800 max-w-[200px] truncate">{prod.title}</p>
                                <p className="text-xs text-slate-400">{prod.category?.name}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-medium">₹{prod.price?.toLocaleString('en-IN')}</td>
                          <td className="py-3 px-4">
                            <span className={`font-medium ${prod.stock <= 5 ? 'text-red-500' : 'text-green-600'}`}>{prod.stock}</span>
                          </td>
                          <td className="py-3 px-4 text-slate-600">{prod.rating} ⭐</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => handleEditProduct(prod)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                                <Edit className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDeleteProduct(prod._id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ─── Orders Tab ─── */}
          {activeTab === 'orders' && (
            <div className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden animate-fade-in">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="text-left py-3 px-4 font-semibold text-slate-600">Order</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-600">Customer</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-600">Total</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-600">Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-600">Date</th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order._id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-medium text-slate-800">{order.orderNumber}</td>
                        <td className="py-3 px-4 text-slate-600">{order.user?.name || 'N/A'}</td>
                        <td className="py-3 px-4 font-medium">₹{order.totalPrice?.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-4">
                          <select
                            value={order.status}
                            onChange={(e) => handleUpdateOrderStatus(order._id, e.target.value)}
                            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 bg-white outline-none cursor-pointer"
                          >
                            {['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 px-4 text-slate-500">{new Date(order.createdAt).toLocaleDateString()}</td>
                        <td className="py-3 px-4 text-right">
                          <Link href={`/orders/${order._id}`} className="p-2 text-slate-400 hover:text-indigo-600 inline-flex">
                            <Eye className="w-4 h-4" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ─── Users Tab ─── */}
          {activeTab === 'users' && <UserManagement />}

          {/* ─── Sellers Tab ─── */}
          {activeTab === 'sellers' && <SellerManagement />}

          {/* ─── Coupons Tab ─── */}
          {activeTab === 'coupons' && <CouponManager />}

          {/* ─── Admins Tab ─── */}
          {activeTab === 'admins' && <AdminManagement />}

          {/* ─── Debug Tab ─── */}
          {activeTab === 'debug' && <DebugDashboard />}

          {/* ─── Settings Tab ─── */}
          {activeTab === 'settings' && (
            <div className="animate-fade-in rounded-2xl border border-slate-200/60 bg-white p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Appearance</p>
              <h3 className="mt-1 text-xl font-bold text-slate-900">Dark mode</h3>
              <p className="mt-1 text-sm text-slate-500">Control theme preference for the admin workspace.</p>
              <button
                type="button"
                onClick={toggleTheme}
                className={`mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                  isDarkMode
                    ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                    : 'bg-slate-900 text-white hover:bg-slate-700'
                }`}
              >
                {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                {isDarkMode ? 'Switch to Light' : 'Switch to Dark'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
