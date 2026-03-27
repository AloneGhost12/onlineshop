const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const swaggerUi = require('swagger-ui-express');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');
const logger = require('./utils/logger');
const openApiSpec = require('./docs/openapi');

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
const Category = require('./models/Category');
const Product = require('./models/Product');

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

// ─── API Documentation ────────────────────────────
app.use(
  '/api/docs',
  swaggerUi.serve,
  swaggerUi.setup(openApiSpec, {
    swaggerOptions: {
      url: '/api/openapi.json',
      urls: [
        {
          url: '/api/openapi.json',
          name: 'ShopVault API',
        },
      ],
    },
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'ShopVault API Documentation',
  })
);

// ─── OpenAPI Schema Endpoint ───────────────────────
app.get('/api/openapi.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json(openApiSpec);
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

const defaultCategories = [
  {
    name: 'Electronics',
    description: 'Smartphones, laptops, cameras and more',
    image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400',
  },
  {
    name: 'Fashion',
    description: 'Clothing, shoes, and accessories',
    image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400',
  },
  {
    name: 'Home & Living',
    description: 'Furniture, decor, and kitchen essentials',
    image: 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=400',
  },
  {
    name: 'Books',
    description: 'Fiction, non-fiction, and educational books',
    image: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=400',
  },
];

const defaultProducts = [
  {
    title: 'iPhone 15 Pro Max 256GB',
    description: 'The most powerful iPhone ever with A17 Pro chip and pro camera system.',
    price: 134900,
    comparePrice: 159900,
    images: [
      { url: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600', alt: 'iPhone 15 Pro Max' },
    ],
    categoryName: 'Electronics',
    brand: 'Apple',
    stock: 50,
    rating: 4.8,
    numReviews: 324,
    featured: true,
    tags: ['smartphone', 'apple', 'iphone'],
  },
  {
    title: 'Samsung Galaxy S24 Ultra',
    description: 'Galaxy AI flagship phone with titanium frame and 200MP camera.',
    price: 129999,
    comparePrice: 144999,
    images: [
      { url: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=600', alt: 'Samsung Galaxy S24 Ultra' },
    ],
    categoryName: 'Electronics',
    brand: 'Samsung',
    stock: 35,
    rating: 4.7,
    numReviews: 256,
    featured: true,
    tags: ['smartphone', 'samsung', 'galaxy'],
  },
  {
    title: 'Premium Leather Jacket - Black',
    description: 'Handcrafted genuine leather jacket with slim fit design.',
    price: 8999,
    comparePrice: 14999,
    images: [
      { url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600', alt: 'Leather Jacket' },
    ],
    categoryName: 'Fashion',
    brand: 'UrbanEdge',
    stock: 40,
    rating: 4.5,
    numReviews: 78,
    featured: true,
    tags: ['jacket', 'fashion'],
  },
  {
    title: 'Classic White Sneakers',
    description: 'Comfortable premium white sneakers for everyday wear.',
    price: 3499,
    comparePrice: 5999,
    images: [
      { url: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600', alt: 'White Sneakers' },
    ],
    categoryName: 'Fashion',
    brand: 'StepUp',
    stock: 100,
    rating: 4.4,
    numReviews: 215,
    featured: true,
    tags: ['shoes', 'sneakers'],
  },
  {
    title: 'Scandinavian Coffee Table',
    description: 'Minimalist design coffee table in natural oak finish.',
    price: 12999,
    comparePrice: 18999,
    images: [
      { url: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600', alt: 'Coffee Table' },
    ],
    categoryName: 'Home & Living',
    brand: 'NordicHome',
    stock: 15,
    rating: 4.6,
    numReviews: 34,
    featured: true,
    tags: ['furniture', 'home'],
  },
  {
    title: 'Atomic Habits by James Clear',
    description: 'An easy and proven way to build good habits and break bad ones.',
    price: 499,
    comparePrice: 799,
    images: [
      { url: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600', alt: 'Atomic Habits Book' },
    ],
    categoryName: 'Books',
    brand: 'Penguin Random House',
    stock: 500,
    rating: 4.9,
    numReviews: 1234,
    featured: true,
    tags: ['books', 'bestseller'],
  },
];

const toSlug = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const buildSeedProductSlug = (title) => `${toSlug(title)}-seed`;

const ensureCatalogSeeded = async () => {
  // Can be disabled explicitly if a project wants to manage data externally.
  if (String(process.env.AUTO_SEED_CATALOG || 'true').toLowerCase() === 'false') {
    return;
  }

  const [categoryCount, productCount] = await Promise.all([
    Category.countDocuments({}),
    Product.countDocuments({}),
  ]);

  if (categoryCount > 0 && productCount > 0) {
    return;
  }

  logger.warn('Catalog is empty. Ensuring default categories and products exist.');

  // Repair earlier bootstrap rows that may have null slugs.
  const productsWithNullSlug = await Product.find({ slug: null }).select('_id title').lean();
  for (const product of productsWithNullSlug) {
    await Product.updateOne(
      { _id: product._id },
      { $set: { slug: `${toSlug(product.title)}-${String(product._id).slice(-6)}` } }
    );
  }

  await Promise.all(
    defaultCategories.map((category) => {
      const categoryWithSlug = {
        ...category,
        slug: toSlug(category.name),
      };

      return Category.findOneAndUpdate(
        { name: category.name },
        { $setOnInsert: categoryWithSlug },
        { upsert: true }
      );
    })
  );

  // Repair earlier failed bootstrap rows that may have name but null slug.
  await Promise.all(
    defaultCategories.map((category) =>
      Category.updateOne(
        { name: category.name, slug: null },
        { $set: { slug: toSlug(category.name) } }
      )
    )
  );

  const categories = await Category.find({ name: { $in: defaultCategories.map((category) => category.name) } })
    .select('name _id')
    .lean();
  const categoryByName = new Map(categories.map((category) => [category.name, category._id]));

  const productsToCreate = defaultProducts
    .map(({ categoryName, ...product }) => {
      const categoryId = categoryByName.get(categoryName);
      if (!categoryId) return null;
      return {
        ...product,
        category: categoryId,
      };
    })
    .filter(Boolean);

  let createdProducts = 0;
  for (const product of productsToCreate) {
    const productWithSlug = {
      ...product,
      slug: buildSeedProductSlug(product.title),
    };

    const result = await Product.updateOne(
      { title: product.title },
      { $setOnInsert: productWithSlug },
      { upsert: true }
    );

    if (result.upsertedCount) {
      createdProducts += 1;
    }
  }

  logger.success(`Default catalog ensured (${categories.length} categories available, ${createdProducts} products created).`);
};

// Public categories route
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
    await ensureCatalogSeeded();
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
