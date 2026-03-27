const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config();

const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');

const categories = [
  { name: 'Electronics', description: 'Smartphones, laptops, cameras and more', image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400' },
  { name: 'Fashion', description: 'Clothing, shoes, and accessories', image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400' },
  { name: 'Home & Living', description: 'Furniture, decor, and kitchen essentials', image: 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=400' },
  { name: 'Books', description: 'Fiction, non-fiction, and educational books', image: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=400' },
  { name: 'Sports & Fitness', description: 'Exercise equipment and sportswear', image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400' },
  { name: 'Beauty & Health', description: 'Skincare, makeup, and wellness', image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400' },
];

const DEFAULT_MOCK_PRODUCTS_PER_CATEGORY = 20;
const DEFAULT_SEED_TARGET_PRODUCTS = 100;

const GLOBAL_MOCK_IMAGE_POOL = [
  'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600',
  'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=600',
  'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=600',
  'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600',
  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600',
  'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600',
  'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600',
  'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600',
  'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600',
  'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600',
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600',
  'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600',
  'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600',
  'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=600',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600',
  'https://images.unsplash.com/photo-1620916297397-a4a5402a3c6c?w=600',
  'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=600',
  'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=600',
  'https://images.unsplash.com/photo-1445205170230-053b83016050?w=600',
  'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=600',
];

const categoryMockConfig = {
  Electronics: {
    brands: ['NovaTech', 'PixelWave', 'Nexora', 'ZenByte'],
    productTypes: ['Smartphone', 'Laptop', 'Bluetooth Earbuds', 'Smartwatch', 'Tablet', 'Gaming Mouse'],
    images: [
      'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=600',
      'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600',
      'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=600',
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600',
    ],
    descriptionTemplates: [
      '{brand} {productType} built for daily performance with reliable battery life and smooth multitasking.',
      'Upgrade your setup with {brand} {productType}, designed for fast performance and modern connectivity.',
      '{brand} {productType} offers practical features for work, entertainment, and everyday use.',
    ],
    tags: ['electronics', 'gadgets', 'tech'],
    minPrice: 2499,
    maxPrice: 129999,
  },
  Fashion: {
    brands: ['UrbanThread', 'StyleMint', 'Velora', 'DailyFit'],
    productTypes: ['Casual Shirt', 'Slim Fit Jeans', 'Running Shoes', 'Hoodie', 'Kurta Set', 'Backpack'],
    images: [
      'https://images.unsplash.com/photo-1445205170230-053b83016050?w=600',
      'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600',
      'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600',
      'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600',
    ],
    descriptionTemplates: [
      'Stay comfortable and stylish with {brand} {productType}, tailored for all-day wear.',
      '{brand} {productType} combines modern styling with practical comfort for everyday outfits.',
      'Refresh your wardrobe with {brand} {productType}, made for casual and smart-casual looks.',
    ],
    tags: ['fashion', 'style', 'apparel'],
    minPrice: 499,
    maxPrice: 8999,
  },
  'Home & Living': {
    brands: ['Nestora', 'OakLoom', 'UrbanNest', 'CozyGrid'],
    productTypes: ['Coffee Table', 'Wall Shelf', 'Bedside Lamp', 'Dining Chair', 'Curtain Set', 'Storage Rack'],
    images: [
      'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=600',
      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600',
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600',
      'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=600',
    ],
    descriptionTemplates: [
      '{brand} {productType} adds a clean, modern touch to your home with functional design.',
      'Designed for practical living, {brand} {productType} balances utility and aesthetics.',
      '{brand} {productType} is ideal for everyday home use with durable materials and finish.',
    ],
    tags: ['home', 'living', 'decor'],
    minPrice: 699,
    maxPrice: 24999,
  },
  Books: {
    brands: ['PaperLine', 'ReadSphere', 'MindStack', 'Bookverse'],
    productTypes: ['Self Growth Book', 'Business Book', 'Fiction Novel', 'Biography', 'Productivity Book', 'Startup Guide'],
    images: [
      'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=600',
      'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600',
      'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600',
      'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=600',
    ],
    descriptionTemplates: [
      '{brand} {productType} features engaging content for readers looking to learn and grow.',
      'Dive into {brand} {productType} for practical insights, ideas, and actionable takeaways.',
      '{brand} {productType} is a reader-friendly pick for building knowledge and perspective.',
    ],
    tags: ['books', 'reading', 'learning'],
    minPrice: 199,
    maxPrice: 1299,
  },
  'Sports & Fitness': {
    brands: ['FitForge', 'Athletiq', 'CoreMotion', 'PulseGear'],
    productTypes: ['Resistance Bands', 'Skipping Rope', 'Gym Gloves', 'Protein Shaker', 'Kettlebell', 'Training Shoes'],
    images: [
      'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600',
      'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=600',
      'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600',
      'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=600',
    ],
    descriptionTemplates: [
      '{brand} {productType} supports regular training with comfort, grip, and durability.',
      'Build your routine with {brand} {productType}, designed for home and gym workouts.',
      '{brand} {productType} is a practical fitness pick for strength, cardio, and mobility days.',
    ],
    tags: ['fitness', 'sports', 'workout'],
    minPrice: 299,
    maxPrice: 19999,
  },
  'Beauty & Health': {
    brands: ['PureGlow', 'DermaNest', 'SkinMint', 'WellCore'],
    productTypes: ['Face Wash', 'Moisturizer', 'Hair Serum', 'Sunscreen', 'Body Lotion', 'Vitamin Supplement'],
    images: [
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600',
      'https://images.unsplash.com/photo-1620916297397-a4a5402a3c6c?w=600',
      'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=600',
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600',
    ],
    descriptionTemplates: [
      '{brand} {productType} is made for daily care with a gentle and effective formula.',
      'Add {brand} {productType} to your routine for balanced care and everyday wellness support.',
      '{brand} {productType} helps you maintain consistent beauty and personal care habits.',
    ],
    tags: ['beauty', 'health', 'wellness'],
    minPrice: 199,
    maxPrice: 4999,
  },
};

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomItem = (arr) => arr[randomInt(0, arr.length - 1)];
const fillTemplate = (template, values) =>
  template.replace(/\{(\w+)\}/g, (_, key) => values[key] || '');
const unique = (arr) => [...new Set(arr)];
const hashString = (input) => String(input || '').split('').reduce((acc, ch) => ((acc * 31) + ch.charCodeAt(0)) >>> 0, 7);
const pickBySeed = (arr, seed) => {
  if (!arr?.length) return null;
  return arr[hashString(seed) % arr.length];
};

const generateMockProducts = (categoryMap, perCategory = DEFAULT_MOCK_PRODUCTS_PER_CATEGORY) => {
  const mockProducts = [];

  Object.keys(categoryMap).forEach((categoryName) => {
    const config = categoryMockConfig[categoryName];
    if (!config) return;

    for (let i = 1; i <= perCategory; i += 1) {
      const brand = randomItem(config.brands);
      const productType = randomItem(config.productTypes);
      const price = randomInt(config.minPrice, config.maxPrice);
      const comparePrice = Math.round(price * (1 + randomInt(10, 35) / 100));
      const rating = Number((Math.random() * 1.4 + 3.5).toFixed(1));
      const title = `${brand} ${productType} ${i}`;
      const imagePool = unique([...(config.images || []), ...GLOBAL_MOCK_IMAGE_POOL]);
      const primaryImage = pickBySeed(imagePool, `${categoryName}:${title}:primary`) || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600';
      const secondaryCandidates = imagePool.filter((url) => url !== primaryImage);
      const secondaryImage = secondaryCandidates.length > 0 && Math.random() < 0.65
        ? pickBySeed(secondaryCandidates, `${categoryName}:${title}:secondary`)
        : null;
      const template = pickBySeed(config.descriptionTemplates || ['{brand} {productType} for everyday use.'], `${categoryName}:${title}:template`);
      const featurePhrases = [
        'Value-focused pricing',
        'Top-rated by regular buyers',
        'Fast-moving marketplace choice',
        'Popular pick in this category',
      ];
      const featureLine = pickBySeed(featurePhrases, `${categoryName}:${title}:feature`);
      const description = fillTemplate(template, { brand, productType });

      const images = [{ url: primaryImage, alt: `${brand} ${productType}` }];
      if (secondaryImage) {
        images.push({ url: secondaryImage, alt: `${brand} ${productType} view 2` });
      }

      mockProducts.push({
        title,
        description: `${description} ${featureLine}. Demo listing generated for catalog browsing and UI testing.`,
        price,
        comparePrice,
        images,
        category: categoryMap[categoryName],
        brand,
        stock: randomInt(5, 300),
        rating,
        numReviews: randomInt(0, 1200),
        featured: Math.random() < 0.12,
        tags: [...config.tags, productType.toLowerCase().replace(/\s+/g, '-')],
      });
    }
  });

  return mockProducts;
};

const generateProducts = (categoryMap) => [
  // Electronics
  {
    title: 'iPhone 15 Pro Max 256GB',
    description: 'The most powerful iPhone ever. Featuring the A17 Pro chip, a customizable Action button, and the most powerful iPhone camera system. Titanium design with 6.7-inch Super Retina XDR display.',
    price: 134900,
    comparePrice: 159900,
    images: [
      { url: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600', alt: 'iPhone 15 Pro Max' },
      { url: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=600', alt: 'iPhone side view' },
    ],
    category: categoryMap['Electronics'],
    brand: 'Apple',
    stock: 50,
    rating: 4.8,
    numReviews: 324,
    featured: true,
    tags: ['smartphone', 'apple', 'iphone', '5g'],
    specifications: [
      { key: 'Display', value: '6.7-inch Super Retina XDR' },
      { key: 'Chip', value: 'A17 Pro' },
      { key: 'Storage', value: '256GB' },
      { key: 'Camera', value: '48MP + 12MP + 12MP' },
    ],
  },
  {
    title: 'Samsung Galaxy S24 Ultra',
    description: 'Galaxy AI is here. The ultimate Galaxy experience with built-in AI. Titanium frame, 200MP camera, and S Pen included.',
    price: 129999,
    comparePrice: 144999,
    images: [
      { url: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=600', alt: 'Samsung Galaxy S24 Ultra' },
    ],
    category: categoryMap['Electronics'],
    brand: 'Samsung',
    stock: 35,
    rating: 4.7,
    numReviews: 256,
    featured: true,
    tags: ['smartphone', 'samsung', 'galaxy', '5g', 'ai'],
    specifications: [
      { key: 'Display', value: '6.8-inch Dynamic AMOLED 2X' },
      { key: 'Processor', value: 'Snapdragon 8 Gen 3' },
      { key: 'Camera', value: '200MP' },
      { key: 'Battery', value: '5000mAh' },
    ],
  },
  {
    title: 'MacBook Air M3 15-inch',
    description: 'Strikingly thin, with the blazingly fast M3 chip—built for Apple Intelligence. Up to 18 hours of battery life.',
    price: 149900,
    comparePrice: 169900,
    images: [
      { url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600', alt: 'MacBook Air' },
    ],
    category: categoryMap['Electronics'],
    brand: 'Apple',
    stock: 25,
    rating: 4.9,
    numReviews: 189,
    featured: true,
    tags: ['laptop', 'apple', 'macbook', 'ultrabook'],
    specifications: [
      { key: 'Chip', value: 'Apple M3' },
      { key: 'RAM', value: '8GB Unified' },
      { key: 'Storage', value: '256GB SSD' },
      { key: 'Display', value: '15.3-inch Liquid Retina' },
    ],
  },
  {
    title: 'Sony WH-1000XM5 Headphones',
    description: 'Industry-leading noise canceling. Exceptional sound quality with LDAC. 30 hours battery life. Ultralight at 250g.',
    price: 26990,
    comparePrice: 34990,
    images: [
      { url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600', alt: 'Sony Headphones' },
    ],
    category: categoryMap['Electronics'],
    brand: 'Sony',
    stock: 80,
    rating: 4.6,
    numReviews: 432,
    featured: true,
    tags: ['headphones', 'wireless', 'noise-canceling', 'sony'],
    specifications: [
      { key: 'Type', value: 'Over-ear Wireless' },
      { key: 'Battery', value: '30 hours' },
      { key: 'Weight', value: '250g' },
      { key: 'Connectivity', value: 'Bluetooth 5.2' },
    ],
  },
  {
    title: 'iPad Pro 12.9" M2 Chip',
    description: 'Supercharged by M2 chip. 12.9-inch Liquid Retina XDR display. Wi-Fi 6E. Thunderbolt / USB 4.',
    price: 112900,
    comparePrice: 124900,
    images: [
      { url: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600', alt: 'iPad Pro' },
    ],
    category: categoryMap['Electronics'],
    brand: 'Apple',
    stock: 20,
    rating: 4.8,
    numReviews: 97,
    featured: false,
    tags: ['tablet', 'apple', 'ipad'],
  },

  // Fashion
  {
    title: 'Premium Leather Jacket - Black',
    description: 'Handcrafted genuine leather jacket with YKK zippers. Slim fit design with quilted lining. Perfect for any season.',
    price: 8999,
    comparePrice: 14999,
    images: [
      { url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600', alt: 'Leather Jacket' },
    ],
    category: categoryMap['Fashion'],
    brand: 'UrbanEdge',
    stock: 40,
    rating: 4.5,
    numReviews: 78,
    featured: true,
    tags: ['jacket', 'leather', 'mens', 'winter'],
  },
  {
    title: 'Classic White Sneakers',
    description: 'Premium quality white leather sneakers. Cushioned insole for all-day comfort. Minimalist design that goes with everything.',
    price: 3499,
    comparePrice: 5999,
    images: [
      { url: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600', alt: 'White Sneakers' },
    ],
    category: categoryMap['Fashion'],
    brand: 'StepUp',
    stock: 100,
    rating: 4.4,
    numReviews: 215,
    featured: true,
    tags: ['shoes', 'sneakers', 'casual', 'unisex'],
  },
  {
    title: 'Aviator Sunglasses - Gold Frame',
    description: 'Classic aviator sunglasses with UV400 protection. Gold metal frame with green gradient lenses. Comes with premium case.',
    price: 2499,
    comparePrice: 4999,
    images: [
      { url: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600', alt: 'Sunglasses' },
    ],
    category: categoryMap['Fashion'],
    brand: 'SunVista',
    stock: 150,
    rating: 4.3,
    numReviews: 156,
    featured: false,
    tags: ['sunglasses', 'accessories', 'aviator'],
  },

  // Home & Living
  {
    title: 'Scandinavian Coffee Table',
    description: 'Minimalist design coffee table in natural oak finish. Solid wood legs with laminated top. Dimensions: 120x60x45cm.',
    price: 12999,
    comparePrice: 18999,
    images: [
      { url: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600', alt: 'Coffee Table' },
    ],
    category: categoryMap['Home & Living'],
    brand: 'NordicHome',
    stock: 15,
    rating: 4.6,
    numReviews: 34,
    featured: true,
    tags: ['furniture', 'table', 'living-room', 'scandinavian'],
  },
  {
    title: 'Smart LED Desk Lamp',
    description: 'Touch-control LED lamp with 5 brightness levels and 3 color temperatures. USB charging port. Memory function remembers your last setting.',
    price: 1999,
    comparePrice: 3499,
    images: [
      { url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600', alt: 'Desk Lamp' },
    ],
    category: categoryMap['Home & Living'],
    brand: 'LuminTech',
    stock: 200,
    rating: 4.5,
    numReviews: 187,
    featured: false,
    tags: ['lamp', 'lighting', 'desk', 'smart'],
  },

  // Books
  {
    title: 'Atomic Habits by James Clear',
    description: 'An Easy & Proven Way to Build Good Habits & Break Bad Ones. The #1 New York Times bestseller. Millions of copies sold worldwide.',
    price: 499,
    comparePrice: 799,
    images: [
      { url: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600', alt: 'Atomic Habits Book' },
    ],
    category: categoryMap['Books'],
    brand: 'Penguin Random House',
    stock: 500,
    rating: 4.9,
    numReviews: 1234,
    featured: true,
    tags: ['self-help', 'habits', 'bestseller', 'productivity'],
  },
  {
    title: 'The Psychology of Money',
    description: 'Timeless lessons on wealth, greed, and happiness by Morgan Housel. 19 short stories exploring the strange ways people think about money.',
    price: 399,
    comparePrice: 599,
    images: [
      { url: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600', alt: 'Psychology of Money' },
    ],
    category: categoryMap['Books'],
    brand: 'Jaico Publishing',
    stock: 300,
    rating: 4.7,
    numReviews: 876,
    featured: true,
    tags: ['finance', 'psychology', 'bestseller'],
  },

  // Sports & Fitness
  {
    title: 'Professional Yoga Mat - 6mm',
    description: 'Eco-friendly TPE material. Non-slip textured surface. Extra thick 6mm cushioning. Includes carrying strap. 183x61cm.',
    price: 1299,
    comparePrice: 2499,
    images: [
      { url: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=600', alt: 'Yoga Mat' },
    ],
    category: categoryMap['Sports & Fitness'],
    brand: 'FlexFit',
    stock: 120,
    rating: 4.4,
    numReviews: 89,
    featured: false,
    tags: ['yoga', 'fitness', 'mat', 'exercise'],
  },
  {
    title: 'Adjustable Dumbbell Set 24kg',
    description: 'Quick-change weight system from 2.5kg to 24kg. Replaces 15 sets of dumbbells. Space-saving design with premium build quality.',
    price: 15999,
    comparePrice: 24999,
    images: [
      { url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600', alt: 'Dumbbell Set' },
    ],
    category: categoryMap['Sports & Fitness'],
    brand: 'IronCore',
    stock: 30,
    rating: 4.7,
    numReviews: 56,
    featured: true,
    tags: ['dumbbells', 'weights', 'home-gym', 'strength'],
  },

  // Beauty & Health
  {
    title: 'Vitamin C Brightening Serum 30ml',
    description: '20% Vitamin C with Hyaluronic Acid and Vitamin E. Brightens skin, reduces dark spots, and boosts collagen. Dermatologist tested.',
    price: 899,
    comparePrice: 1499,
    images: [
      { url: 'https://images.unsplash.com/photo-1620916297397-a4a5402a3c6c?w=600', alt: 'Vitamin C Serum' },
    ],
    category: categoryMap['Beauty & Health'],
    brand: 'GlowLab',
    stock: 200,
    rating: 4.5,
    numReviews: 345,
    featured: false,
    tags: ['skincare', 'serum', 'vitamin-c', 'brightening'],
  },
  {
    title: 'Electric Toothbrush Pro',
    description: 'Sonic technology with 40,000 vibrations/min. 5 cleaning modes. 30-day battery life. IPX7 waterproof. Includes 3 brush heads.',
    price: 2999,
    comparePrice: 4999,
    images: [
      { url: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=600', alt: 'Electric Toothbrush' },
    ],
    category: categoryMap['Beauty & Health'],
    brand: 'OralCare',
    stock: 75,
    rating: 4.6,
    numReviews: 198,
    featured: false,
    tags: ['toothbrush', 'electric', 'oral-care', 'dental'],
  },
];

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const isProduction = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
    const allowProdSeed = String(process.env.ALLOW_PROD_SEED || 'false').toLowerCase() === 'true';

    if (isProduction && !allowProdSeed) {
      throw new Error('Seeding is blocked in production. Set ALLOW_PROD_SEED=true to override intentionally.');
    }

    const shouldReset = String(process.env.SEED_RESET || '').toLowerCase() === 'true';

    if (isProduction && shouldReset) {
      throw new Error('SEED_RESET=true is blocked in production to protect live data.');
    }

    if (shouldReset) {
      const forceResetAll = String(process.env.FORCE_RESET_ALL || '').toLowerCase() === 'true';

      if (forceResetAll) {
        await User.deleteMany({});
        await Category.deleteMany({});
        await Product.deleteMany({});
        console.log('Cleared ALL existing data (SEED_RESET=true and FORCE_RESET_ALL=true)');
      } else {
        await User.deleteMany({ dataPartition: 'seed' });
        await Category.deleteMany({ dataPartition: 'seed' });
        await Product.deleteMany({ dataPartition: 'seed' });
        console.log('Cleared only seed partition data (SEED_RESET=true)');
      }
    } else {
      console.log('SEED_RESET is false. Preserving existing users, categories, and products.');
    }

    // Ensure admin user exists
    const existingAdmin = await User.findOne({ email: 'admin@shopvault.com' });
    if (!existingAdmin) {
      await User.create({
        name: 'Admin User',
        email: 'admin@shopvault.com',
        password: 'admin123',
        role: 'admin',
        dataPartition: 'seed',
      });
      console.log('Created admin user: admin@shopvault.com / admin123');
    } else {
      console.log('Admin user already exists: admin@shopvault.com');
    }

    // Ensure test user exists
    const existingTestUser = await User.findOne({ email: 'john@example.com' });
    if (!existingTestUser) {
      await User.create({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'user123',
        role: 'user',
        dataPartition: 'seed',
      });
      console.log('Created test user: john@example.com / user123');
    } else {
      console.log('Test user already exists: john@example.com');
    }

    // Ensure categories exist
    let createdCategories = [];
    if (shouldReset) {
      createdCategories = await Category.create(categories.map((category) => ({
        ...category,
        dataPartition: 'seed',
      })));
      console.log(`Created ${createdCategories.length} categories`);
    } else {
      await Promise.all(
        categories.map((category) =>
          Category.findOneAndUpdate(
            { name: category.name },
            { $setOnInsert: { ...category, dataPartition: 'seed' } },
            { new: true, upsert: true }
          )
        )
      );
      createdCategories = await Category.find({});
      console.log(`Loaded ${createdCategories.length} categories`);
    }

    // Build category map
    const categoryMap = {};
    createdCategories.forEach((cat) => {
      categoryMap[cat.name] = cat._id;
    });

    // Create products
    const fixedProducts = generateProducts(categoryMap);
    const perCategory = Number(process.env.MOCK_PRODUCTS_PER_CATEGORY) || DEFAULT_MOCK_PRODUCTS_PER_CATEGORY;
    const mockProducts = generateMockProducts(categoryMap, perCategory);
    const targetTotalProducts = Math.max(
      fixedProducts.length,
      Number(process.env.SEED_TARGET_PRODUCTS) || DEFAULT_SEED_TARGET_PRODUCTS
    );
    const products = [...fixedProducts, ...mockProducts].slice(0, targetTotalProducts);

    let createdProducts = [];
    let skippedProducts = 0;
    let updatedProducts = 0;

    if (shouldReset) {
      createdProducts = await Product.create(products.map((product) => ({
        ...product,
        dataPartition: 'seed',
      })));
    } else {
      for (const product of products) {
        const existingProduct = await Product.findOne({ title: product.title }).select('_id title');
        if (!existingProduct) {
          const seedProduct = { ...product, dataPartition: 'seed' };
          await Product.create(seedProduct);
          createdProducts.push(seedProduct);
        } else {
          await Product.updateOne({ _id: existingProduct._id }, { $set: { ...product, dataPartition: 'seed' } });
          updatedProducts += 1;
        }
      }

      skippedProducts = products.length - createdProducts.length - updatedProducts;
    }

    console.log(`Created ${createdProducts.length} products`);
    console.log(`  - Fixed products: ${fixedProducts.length}`);
    console.log(`  - Mock products generated: ${mockProducts.length}`);
    console.log(`  - Target total products: ${targetTotalProducts}`);
    console.log(`  - Per category mock count: ${perCategory}`);
    if (!shouldReset) {
      console.log(`  - Updated existing products: ${updatedProducts}`);
      console.log(`  - Skipped existing products: ${skippedProducts}`);
    }

    console.log('\n✅ Database seeded successfully!');
    console.log('\n📋 Login credentials:');
    console.log('  Admin: admin@shopvault.com / admin123');
    console.log('  User:  john@example.com / user123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
};

seedDatabase();
