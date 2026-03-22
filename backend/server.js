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

const app = express();

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

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
};

// ─── Security Middleware ───────────────────────────
app.use(helmet());
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
  res.json({
    success: true,
    message: 'ShopVault API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// ─── API Routes ────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/seller', sellerRoutes);
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
