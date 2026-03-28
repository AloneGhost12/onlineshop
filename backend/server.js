const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');
const logger = require('./utils/logger');

// Route imports
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');
const sellerRoutes = require('./routes/seller');
const promotionRoutes = require('./routes/promotionRoutes');
const fraudRoutes = require('./routes/fraudRoutes');
const mailboxRoutes = require('./routes/mailbox');
const User = require('./models/User');

const app = express();

const ensureBootstrapAdmin = async () => {
  const isProduction = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
  const autoBootstrapDefault = isProduction ? 'false' : 'true';
  if (String(process.env.AUTO_BOOTSTRAP_ADMIN || autoBootstrapDefault).toLowerCase() === 'false') {
    return;
  }

  const adminEmail = String(process.env.BOOTSTRAP_ADMIN_EMAIL || 'admin@shopvault.com').trim().toLowerCase();
  const adminPassword = String(process.env.BOOTSTRAP_ADMIN_PASSWORD || 'admin123');

  const existing = await User.findOne({ email: adminEmail }).select('+password');
  if (!existing) {
    await User.create({
      name: 'Admin User',
      email: adminEmail,
      password: adminPassword,
      role: 'admin',
    });
    logger.warn(`Bootstrap admin created: ${adminEmail}`);
    return;
  }

  let shouldSave = false;
  if (existing.role !== 'admin') {
    existing.role = 'admin';
    shouldSave = true;
  }

  if (existing.isBlocked || existing.isBanned || existing.requiresVerification || existing.isFraudFlagged) {
    existing.isBlocked = false;
    existing.isBanned = false;
    existing.requiresVerification = false;
    existing.isFraudFlagged = false;
    existing.banReason = '';
    shouldSave = true;
  }

  if (String(process.env.RESET_BOOTSTRAP_ADMIN_PASSWORD || 'false').toLowerCase() === 'true') {
    existing.password = adminPassword;
    shouldSave = true;
  }

  if (shouldSave) {
    await existing.save();
    logger.warn(`Bootstrap admin refreshed: ${adminEmail}`);
  }
};

const defaultAllowedOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];
const allowedOrigins = [
  ...defaultAllowedOrigins,
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
  ...(process.env.FRONTEND_URLS
    ? process.env.FRONTEND_URLS.split(',').map((origin) => origin.trim()).filter(Boolean)
    : []),
];

const devLanOriginPattern =
  /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?$/;
const vercelOriginPattern = /^https:\/\/[a-z0-9-]+\.vercel\.app$/i;

const corsOptions = {
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    if (process.env.NODE_ENV !== 'production' && devLanOriginPattern.test(origin)) {
      return callback(null, true);
    }

    if (vercelOriginPattern.test(origin)) {
      return callback(null, true);
    }

    // Log but don't block - let response succeed with CORS headers if possible
    console.warn(`CORS request from origin: ${origin}`);
    return callback(null, true);
  },
};

// ─── Security Middleware ───────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(cors(corsOptions));
app.use(apiLimiter);

// ─── Body Parsing ──────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Logging ───────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ─── Health Check ──────────────────────────────────
app.get('/api/health', (req, res) => {
  const dbState = require('mongoose').connection.readyState;
  const dbStateMap = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  
  res.status(dbState === 1 ? 200 : 503).json({
    success: dbState === 1,
    message: dbState === 1 ? 'ShopVault API is running' : 'Service partially unavailable',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    database: dbStateMap[dbState] || 'unknown',
  });
});

// ─── API Routes ────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/seller', sellerRoutes);
app.use('/api/mailbox', mailboxRoutes);
app.use('/api', promotionRoutes);
app.use('/api/admin/fraud', fraudRoutes);

// Public categories route
const Category = require('./models/Category');
app.get('/api/categories', async (req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true }).sort('name').lean();
    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
});

// ─── 404 Handler ───────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// ─── Error Handler ─────────────────────────────────
app.use(errorHandler);

// ─── Start Server ──────────────────────────────────
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    await ensureBootstrapAdmin();
    app.listen(PORT, () => {
      logger.success(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
      logger.info(`API: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    logger.error('Failed to start server', error.message);
    process.exit(1);
  }
};

startServer();

module.exports = app;
