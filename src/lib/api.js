import axios from 'axios';

const RENDER_API_BASE = 'https://onlineshop-f0lb.onrender.com/api';

const isPrivateOrLocalHost = (hostname) => {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  );
};

const resolveRenderApiBase = (hostname) => {
  if (hostname === 'onlineshop-f0lb.onrender.com') {
    return RENDER_API_BASE;
  }

  return null;
};

const resolveVercelApiBase = (hostname) => {
  if (hostname.endsWith('.vercel.app')) {
    return RENDER_API_BASE;
  }

  return null;
};

const resolveApiBase = () => {
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (configuredUrl) {
    return configuredUrl;
  }

  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;

    // In local/LAN development, backend runs separately on port 5000.
    if (isPrivateOrLocalHost(hostname)) {
      return `${protocol}//${hostname}:5000/api`;
    }

    const renderApiBase = resolveRenderApiBase(hostname);
    if (renderApiBase) {
      return renderApiBase;
    }

    const vercelApiBase = resolveVercelApiBase(hostname);
    if (vercelApiBase) {
      return vercelApiBase;
    }

    return '/api';
  }

  return 'http://localhost:5000/api';
};

const API_BASE = resolveApiBase();

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

const sellerApi = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor — attach token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle errors
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.message || 'Something went wrong';
    const normalizedError = new Error(message);
    normalizedError.status = error.response?.status;
    normalizedError.details = error.response?.data;

    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Only redirect if not already on auth page
        if (!window.location.pathname.startsWith('/auth')) {
          window.location.href = '/auth/login';
        }
      }
    }
    return Promise.reject(normalizedError);
  }
);

sellerApi.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('sellerToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

sellerApi.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.message || 'Something went wrong';
    const normalizedError = new Error(message);
    normalizedError.status = error.response?.status;
    normalizedError.details = error.response?.data;

    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('sellerToken');
      localStorage.removeItem('seller');
      if (!window.location.pathname.startsWith('/seller')) {
        window.location.href = '/seller/login';
      }
    }

    return Promise.reject(normalizedError);
  }
);

// ─── Auth ──────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
  getMe: () => api.get('/auth/me'),
  getLoyaltySummary: () => api.get('/auth/loyalty'),
  updateProfile: (data) => api.put('/auth/profile', data),
  logout: () => api.post('/auth/logout'),
};

// ─── Products ──────────────────────────────────────
export const productAPI = {
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  getFeatured: (limit) => api.get('/products/featured', { params: { limit } }),
  getReviews: (id, params) => api.get(`/products/${id}/reviews`, { params }),
  getReviewEligibility: (id) => api.get(`/products/${id}/review-eligibility`),
  createReview: (id, data) => api.post(`/products/${id}/reviews`, data),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
};

// ─── Cart ──────────────────────────────────────────
export const cartAPI = {
  get: () => api.get('/cart'),
  add: (productId, quantity) => api.post('/cart', { productId, quantity }),
  update: (itemId, quantity) => api.put(`/cart/${itemId}`, { quantity }),
  remove: (itemId) => api.delete(`/cart/${itemId}`),
  clear: () => api.delete('/cart'),
  applyCoupon: (code) => api.post('/cart/apply-coupon', { code }),
};

// ─── Orders ────────────────────────────────────────
export const orderAPI = {
  create: (data) => api.post('/orders', data),
  getMyOrders: (params) => api.get('/orders', { params }),
  getById: (id) => api.get(`/orders/${id}`),
  cancel: (id, reason = '') => api.patch(`/orders/${id}/cancel`, { reason }),
};

export const checkoutAPI = {
  applyPromotions: () => api.post('/checkout/apply-promotions'),
};

export const mailboxAPI = {
  getAll: (params) => api.get('/mailbox', { params }),
  getUnreadCount: () => api.get('/mailbox/unread-count'),
  markRead: (id) => api.patch(`/mailbox/${id}/read`),
  markAllRead: () => api.patch('/mailbox/read-all'),
};

// ─── Categories ────────────────────────────────────
export const categoryAPI = {
  getAll: () => api.get('/categories'),
};

// ─── Admin ─────────────────────────────────────────
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getOrders: (params) => api.get('/admin/orders', { params }),
  updateOrder: (id, data) => api.put(`/admin/orders/${id}`, data),
  getUsers: (params) => api.get('/admin/users', { params }),
  getSellers: (params) => api.get('/admin/sellers', { params }),
  getFraudMonitor: (params) => api.get('/admin/fraud-monitor', { params }),
  getRbacConfig: () => api.get('/admin/rbac'),
  createAdmin: (data) => api.post('/admin/admins', data),
  updateUserRole: (id, data) => api.patch(`/admin/users/${id}/role`, data),
  getUserSessions: (id, params) => api.get(`/admin/users/${id}/sessions`, { params }),
  updateUserAccess: (id, data) => api.patch(`/admin/users/${id}/access`, data),
  updateSellerStatus: (id, data) => api.patch(`/admin/sellers/${id}/status`, data),
  markFraudLogSafe: (id, data) => api.patch(`/admin/fraud-logs/${id}/mark-safe`, data),
  createPromotion: (data) => api.post('/admin/promotions', data),
  getPromotions: (params) => api.get('/admin/promotions', { params }),
  updatePromotion: (id, data) => api.patch(`/admin/promotions/${id}`, data),
  deletePromotion: (id) => api.delete(`/admin/promotions/${id}`),
  getCategories: () => api.get('/admin/categories'),
  createCategory: (data) => api.post('/admin/categories', data),
  createCoupon: (data) => api.post('/admin/coupons/create', data),
  getCoupons: (params) => api.get('/admin/coupons', { params }),
  updateCoupon: (id, data) => api.patch(`/admin/coupons/${id}`, data),
  deleteCoupon: (id) => api.delete(`/admin/coupons/${id}`),
  assignCoupon: (data) => api.post('/admin/coupons/assign', data),
};

export const sellerAPI = {
  register: (data) => sellerApi.post('/seller/register', data),
  apply: (data) => api.post('/seller/apply', data),
  getApplicationStatus: () => api.get('/seller/application-status'),
  login: (data) => sellerApi.post('/seller/login', data),
  forgotPassword: (email) => sellerApi.post('/seller/forgot-password', { email }),
  resetPassword: (token, password) => sellerApi.post('/seller/reset-password', { token, password }),
  logout: () => sellerApi.post('/seller/logout'),
  getMe: () => sellerApi.get('/seller/me'),
  getDashboard: () => sellerApi.get('/seller/dashboard'),
  getProducts: () => sellerApi.get('/seller/products'),
  createProduct: (data) => sellerApi.post('/seller/products', data),
  updateProduct: (id, data) => sellerApi.patch(`/seller/products/${id}`, data),
  deleteProduct: (id) => sellerApi.delete(`/seller/products/${id}`),
  getOrders: () => sellerApi.get('/seller/orders'),
  updateOrderDeliveryStatus: (id, delivered) => sellerApi.patch(`/seller/orders/${id}/delivery-status`, { delivered }),
  getAnalytics: () => sellerApi.get('/seller/analytics'),
};

export default api;
