const Seller = require('../models/Seller');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Category = require('../models/Category');
const User = require('../models/User');
const ApiError = require('../utils/apiError');
const crypto = require('crypto');

const DEFAULT_COMMISSION_PERCENTAGE = Number(process.env.DEFAULT_SELLER_COMMISSION || 10);

const sendSellerTokenResponse = (seller, statusCode, res) => {
  const token = seller.generateToken();

  res
    .status(statusCode)
    .cookie('sellerToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })
    .json({
      success: true,
      token,
      seller,
    });
};

const mapSellerOrder = (order, sellerId) => {
  const sellerItems = (order.items || []).filter(
    (item) => item.sellerId && String(item.sellerId) === String(sellerId)
  );

  const sellerSubtotal = sellerItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const sellerRevenue = sellerItems.reduce((sum, item) => sum + (item.sellerRevenue || 0), 0);
  const platformRevenue = sellerItems.reduce((sum, item) => sum + (item.platformRevenue || 0), 0);

  return {
    ...order,
    items: sellerItems,
    sellerSubtotal,
    sellerRevenue,
    platformRevenue,
  };
};

// @desc    Register seller
// @route   POST /api/seller/register
// @access  Public
exports.registerSeller = async (req, res, next) => {
  try {
    const { sellerName, storeName, email, phone, password } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedStoreName = String(storeName || '').trim();

    const existingSeller = await Seller.findOne({
      $or: [{ email: normalizedEmail }, { storeName: normalizedStoreName }],
    });

    if (existingSeller) {
      const sameEmail = String(existingSeller.email || '').trim().toLowerCase() === normalizedEmail;
      const sameStore = String(existingSeller.storeName || '').trim() === normalizedStoreName;

      if (!existingSeller.isVerified && (sameEmail || sameStore)) {
        return res.json({
          success: true,
          message: 'Seller application already pending admin verification.',
          data: existingSeller,
        });
      }

      if (existingSeller.isVerified && sameEmail) {
        return next(ApiError.badRequest('Seller account already exists. Please login.'));
      }

      return next(ApiError.badRequest('Seller email or store name already exists'));
    }

    const seller = await Seller.create({
      sellerName,
      storeName,
      email: normalizedEmail,
      phone,
      password,
      isVerified: false,
      applicationSource: 'direct',
    });

    res.status(201).json({
      success: true,
      message: 'Seller application submitted successfully. Waiting for admin verification.',
      data: seller,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Apply for seller account as existing user
// @route   POST /api/seller/apply
// @access  Private (User)
exports.applySellerAccount = async (req, res, next) => {
  try {
    const {
      sellerName,
      storeName,
      phone,
      password,
    } = req.body;

    const user = await User.findById(req.user._id).lean();
    if (!user) {
      return next(ApiError.unauthorized('User no longer exists'));
    }

    const normalizedEmail = String(user.email || '').trim().toLowerCase();
    const normalizedStoreName = String(storeName || '').trim();

    if (!normalizedStoreName) {
      return next(ApiError.badRequest('Store name is required'));
    }

    if (!password || String(password).length < 6) {
      return next(ApiError.badRequest('Password must be at least 6 characters'));
    }

    const existingSeller = await Seller.findOne({
      $or: [
        { userId: user._id },
        { email: normalizedEmail },
        { storeName: normalizedStoreName },
      ],
    });

    if (existingSeller) {
      if (String(existingSeller.userId || '') !== String(user._id) && String(existingSeller.storeName) === normalizedStoreName) {
        return next(ApiError.badRequest('Store name already exists'));
      }

      if (existingSeller.isVerified && String(existingSeller.userId || '') === String(user._id)) {
        return next(ApiError.badRequest('Your seller account is already approved'));
      }

      if (!existingSeller.isVerified && String(existingSeller.userId || '') === String(user._id)) {
        return res.json({
          success: true,
          message: 'Seller application already pending admin verification.',
          data: existingSeller,
        });
      }

      if (!existingSeller.isVerified && String(existingSeller.email || '').toLowerCase() === normalizedEmail) {
        existingSeller.userId = user._id;
        existingSeller.sellerName = String(sellerName || user.name || existingSeller.sellerName).trim();
        existingSeller.storeName = normalizedStoreName;
        existingSeller.phone = String(phone || user.phone || existingSeller.phone || '').trim();
        existingSeller.password = password;
        existingSeller.applicationSource = 'user_apply';
        existingSeller.isSuspended = false;
        existingSeller.suspensionReason = '';
        await existingSeller.save();

        return res.json({
          success: true,
          message: 'Seller application updated and pending admin verification.',
          data: existingSeller,
        });
      }

      return next(ApiError.badRequest('Seller application already exists for this email or store')); 
    }

    const seller = await Seller.create({
      userId: user._id,
      sellerName: String(sellerName || user.name || '').trim() || 'Seller',
      storeName: normalizedStoreName,
      email: normalizedEmail,
      phone: String(phone || user.phone || '').trim() || 'Not provided',
      password,
      isVerified: false,
      applicationSource: 'user_apply',
    });

    res.status(201).json({
      success: true,
      message: 'Seller application submitted. Waiting for admin verification.',
      data: seller,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get seller application status for current user
// @route   GET /api/seller/application-status
// @access  Private (User)
exports.getSellerApplicationStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('email').lean();
    if (!user) {
      return next(ApiError.unauthorized('User no longer exists'));
    }

    const normalizedEmail = String(user.email || '').trim().toLowerCase();
    const seller = await Seller.findOne({
      $or: [
        { userId: user._id },
        { email: normalizedEmail },
      ],
    }).lean();

    if (!seller) {
      return res.json({
        success: true,
        data: {
          status: 'none',
          isApproved: false,
        },
      });
    }

    const isApproved = Boolean(seller.isVerified && !seller.isSuspended);
    const status = isApproved
      ? 'approved'
      : seller.isSuspended
        ? 'suspended'
        : 'pending';

    res.json({
      success: true,
      data: {
        status,
        isApproved,
        sellerId: seller._id,
        storeName: seller.storeName,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login seller
// @route   POST /api/seller/login
// @access  Public
exports.loginSeller = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const seller = await Seller.findOne({ email: String(email || '').trim().toLowerCase() }).select('+password');
    if (!seller) {
      return next(ApiError.unauthorized('Invalid email or password'));
    }

    const isMatch = await seller.comparePassword(password);
    if (!isMatch) {
      return next(ApiError.unauthorized('Invalid email or password'));
    }

    if (seller.isSuspended) {
      return next(ApiError.forbidden(`Seller account suspended. ${seller.suspensionReason || 'Contact admin support.'}`));
    }

    if (!seller.isVerified) {
      return next(ApiError.forbidden('Seller account pending admin verification. Please wait for approval.'));
    }

    sendSellerTokenResponse(seller, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot password (seller)
// @route   POST /api/seller/forgot-password
// @access  Public
exports.forgotSellerPassword = async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email) {
      return next(ApiError.badRequest('Email is required'));
    }

    const seller = await Seller.findOne({ email }).select('+resetPasswordToken +resetPasswordExpire');
    const genericMessage = 'If a seller account exists for this email, a password reset link has been generated.';

    if (!seller) {
      return res.json({ success: true, message: genericMessage });
    }

    const resetToken = seller.getResetPasswordToken();
    await seller.save({ validateBeforeSave: false });

    const frontendBaseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendBaseUrl}/seller/reset-password/${resetToken}`;

    res.json({
      success: true,
      message: genericMessage,
      data: {
        resetUrl,
        expiresInMinutes: 15,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password (seller)
// @route   POST /api/seller/reset-password
// @access  Public
exports.resetSellerPassword = async (req, res, next) => {
  try {
    const token = String(req.body?.token || '').trim();
    const password = String(req.body?.password || '');

    if (!token) {
      return next(ApiError.badRequest('Reset token is required'));
    }

    if (password.length < 6) {
      return next(ApiError.badRequest('Password must be at least 6 characters'));
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const seller = await Seller.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: new Date() },
    }).select('+password +resetPasswordToken +resetPasswordExpire');

    if (!seller) {
      return next(ApiError.badRequest('Password reset token is invalid or has expired'));
    }

    seller.password = password;
    seller.resetPasswordToken = null;
    seller.resetPasswordExpire = null;
    await seller.save();

    res.json({
      success: true,
      message: 'Seller password reset successful. You can now sign in with the new password.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current seller
// @route   GET /api/seller/me
// @access  Private Seller
exports.getSellerMe = async (req, res, next) => {
  try {
    const seller = await Seller.findById(req.seller._id).populate('products', 'title stock price isActive');
    res.json({ success: true, seller });
  } catch (error) {
    next(error);
  }
};

// @desc    Seller dashboard stats
// @route   GET /api/seller/dashboard
// @access  Private Seller
exports.getSellerDashboard = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sellerId = req.seller._id;

    const [products, recentOrders, todayOrderAgg, lifetimeAgg, lowStockProducts] = await Promise.all([
      Product.find({ sellerId }).sort('-createdAt').limit(5).lean(),
      Order.find({ 'items.sellerId': sellerId }).sort('-createdAt').limit(10).lean(),
      Order.aggregate([
        { $match: { createdAt: { $gte: today }, 'items.sellerId': sellerId } },
        { $unwind: '$items' },
        { $match: { 'items.sellerId': sellerId } },
        {
          $group: {
            _id: null,
            revenueToday: { $sum: '$items.sellerRevenue' },
            ordersToday: { $addToSet: '$_id' },
          },
        },
      ]),
      Order.aggregate([
        { $match: { 'items.sellerId': sellerId } },
        { $unwind: '$items' },
        { $match: { 'items.sellerId': sellerId } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$items.sellerRevenue' },
            totalPlatformRevenue: { $sum: '$items.platformRevenue' },
            totalUnits: { $sum: '$items.quantity' },
            orders: { $addToSet: '$_id' },
          },
        },
      ]),
      Product.find({ sellerId, stock: { $lte: 5 }, isActive: true }).sort('stock').lean(),
    ]);

    const stats = lifetimeAgg[0] || { totalRevenue: 0, totalPlatformRevenue: 0, totalUnits: 0, orders: [] };
    const todayStats = todayOrderAgg[0] || { revenueToday: 0, ordersToday: [] };

    res.json({
      success: true,
      data: {
        seller: req.seller,
        stats: {
          totalProducts: await Product.countDocuments({ sellerId }),
          activeProducts: await Product.countDocuments({ sellerId, isActive: true }),
          lowStockProducts: lowStockProducts.length,
          totalRevenue: stats.totalRevenue || 0,
          platformRevenue: stats.totalPlatformRevenue || 0,
          totalUnitsSold: stats.totalUnits || 0,
          totalOrders: stats.orders?.length || 0,
          revenueToday: todayStats.revenueToday || 0,
          ordersToday: todayStats.ordersToday?.length || 0,
        },
        recentProducts: products,
        recentOrders: recentOrders.map((order) => mapSellerOrder(order, sellerId)),
        lowStockProducts,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create seller product
// @route   POST /api/seller/products
// @access  Private Seller
exports.createSellerProduct = async (req, res, next) => {
  try {
    const category = await Category.findById(req.body.category).lean();
    if (!category) {
      return next(ApiError.badRequest('Valid category is required'));
    }

    const product = await Product.create({
      ...req.body,
      sellerId: req.seller._id,
      sellerStoreName: req.seller.storeName,
      commissionPercentage: DEFAULT_COMMISSION_PERCENTAGE,
    });

    await Seller.findByIdAndUpdate(req.seller._id, { $addToSet: { products: product._id } });

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

// @desc    Get seller products
// @route   GET /api/seller/products
// @access  Private Seller
exports.getSellerProducts = async (req, res, next) => {
  try {
    const products = await Product.find({ sellerId: req.seller._id })
      .populate('category', 'name slug')
      .sort('-createdAt')
      .lean();

    res.json({ success: true, data: products });
  } catch (error) {
    next(error);
  }
};

// @desc    Update seller product
// @route   PATCH /api/seller/products/:id
// @access  Private Seller
exports.updateSellerProduct = async (req, res, next) => {
  try {
    const updatePayload = { ...req.body };
    delete updatePayload.commissionPercentage;

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, sellerId: req.seller._id },
      {
        ...updatePayload,
        sellerStoreName: req.seller.storeName,
      },
      { new: true, runValidators: true }
    );

    if (!product) {
      return next(ApiError.notFound('Seller product not found'));
    }

    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete seller product
// @route   DELETE /api/seller/products/:id
// @access  Private Seller
exports.deleteSellerProduct = async (req, res, next) => {
  try {
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, sellerId: req.seller._id },
      { isActive: false },
      { new: true }
    );

    if (!product) {
      return next(ApiError.notFound('Seller product not found'));
    }

    await Seller.findByIdAndUpdate(req.seller._id, { $pull: { products: product._id } });

    res.json({ success: true, message: 'Product removed from seller catalog' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get seller orders
// @route   GET /api/seller/orders
// @access  Private Seller
exports.getSellerOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ 'items.sellerId': req.seller._id })
      .populate('user', 'name email phone')
      .sort('-createdAt')
      .lean();

    res.json({
      success: true,
      data: orders.map((order) => mapSellerOrder(order, req.seller._id)),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get seller analytics
// @route   GET /api/seller/analytics
// @access  Private Seller
exports.getSellerAnalytics = async (req, res, next) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [dailyRevenue, topProducts] = await Promise.all([
      Order.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo }, 'items.sellerId': req.seller._id } },
        { $unwind: '$items' },
        { $match: { 'items.sellerId': req.seller._id } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            revenue: { $sum: '$items.sellerRevenue' },
            platformRevenue: { $sum: '$items.platformRevenue' },
            units: { $sum: '$items.quantity' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Order.aggregate([
        { $match: { 'items.sellerId': req.seller._id } },
        { $unwind: '$items' },
        { $match: { 'items.sellerId': req.seller._id } },
        {
          $group: {
            _id: '$items.product',
            title: { $first: '$items.title' },
            totalUnits: { $sum: '$items.quantity' },
            revenue: { $sum: '$items.sellerRevenue' },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 5 },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        dailyRevenue,
        topProducts,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout seller
// @route   POST /api/seller/logout
// @access  Private Seller
exports.logoutSeller = async (req, res, next) => {
  try {
    res.cookie('sellerToken', '', {
      httpOnly: true,
      expires: new Date(0),
    });

    res.json({ success: true, message: 'Seller logged out successfully' });
  } catch (error) {
    next(error);
  }
};