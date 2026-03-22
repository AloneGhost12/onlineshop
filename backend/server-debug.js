const express = require('express');
console.log('1: express loaded');
const cors = require('cors');
console.log('2: cors loaded');
const helmet = require('helmet');
console.log('3: helmet loaded');
const morgan = require('morgan');
console.log('4: morgan loaded');
const cookieParser = require('cookie-parser');
console.log('5: cookieParser loaded');
const dotenv = require('dotenv');
console.log('6: dotenv loaded');

dotenv.config();
console.log('7: dotenv configured');

const connectDB = require('./config/db');
console.log('8: connectDB loaded');
const errorHandler = require('./middleware/errorHandler');
console.log('9: errorHandler loaded');
const { apiLimiter } = require('./middleware/rateLimiter');
console.log('10: apiLimiter loaded');
const logger = require('./utils/logger');
console.log('11: logger loaded');

const authRoutes = require('./routes/auth');
console.log('12: authRoutes loaded');
const productRoutes = require('./routes/products');
console.log('13: productRoutes loaded');
const cartRoutes = require('./routes/cart');
console.log('14: cartRoutes loaded');
const orderRoutes = require('./routes/orders');
console.log('15: orderRoutes loaded');
const adminRoutes = require('./routes/admin');
console.log('16: adminRoutes loaded');

const app = express();
console.log('17: app created');

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

app.use(helmet());
console.log('18: helmet initialized');
app.use(cors(corsOptions));
console.log('19: cors initialized');
app.use(apiLimiter);
console.log('20: apiLimiter initialized');

app.use(express.json({ limit: '10mb' }));
console.log('21: json initialized');
app.use(express.urlencoded({ extended: true }));
console.log('22: urlencoded initialized');
app.use(cookieParser());
console.log('23: cookieParser initialized');

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
  console.log('24: morgan initialized');
}

app.get('/api/health', (req, res) => {
  res.json({ success: true });
});
console.log('25: health route initialized');

app.use('/api/auth', authRoutes);
console.log('26: auth routes initialized');
app.use('/api/products', productRoutes);
console.log('27: product routes initialized');
app.use('/api/cart', cartRoutes);
console.log('28: cart routes initialized');
app.use('/api/orders', orderRoutes);
console.log('29: order routes initialized');
app.use('/api/admin', adminRoutes);
console.log('30: admin routes initialized');

const Category = require('./models/Category');
console.log('31: Category model loaded');
app.get('/api/categories', async (req, res, next) => {
  res.json({ success: true });
});
console.log('32: categories route initialized');

app.use('*', (req, res) => {
  res.status(404).json({ success: false });
});
console.log('33: 404 handler initialized');

app.use(errorHandler);
console.log('34: error handler initialized');

console.log('Initialization complete');
process.exit(0);
