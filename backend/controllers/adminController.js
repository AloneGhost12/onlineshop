const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const UserSession = require('../models/UserSession');
const Seller = require('../models/Seller');
const Category = require('../models/Category');
const Coupon = require('../models/Coupon');
const FraudLog = require('../models/FraudLog');
const ApiError = require('../utils/apiError');
const { applyDeliveryRewards, rollbackDeliveryRewards } = require('../services/loyaltyService');
const {
  ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  normalizeRole,
  sanitizePermissions,
  getDefaultPermissions,
  getEffectivePermissions,
} = require('../utils/rbac');
const { getFraudThreshold, syncUserFraudState } = require('../utils/fraudDetection');

const nonUserRoles = [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.MODERATOR, ROLES.SUPPORT];

const buildRoleFilter = (rolesInput) => {
  const roleValues = String(rolesInput || '')
    .split(',')
    .map((role) => normalizeRole(role))
    .filter(Boolean);

  if (roleValues.length === 0) {
    return null;
  }

  return {
    $in: [...new Set([...roleValues, ...roleValues.map((role) => role.toLowerCase())])],
  };
};

const buildPermissionSet = (role, permissions) => {
  const explicitPermissions = sanitizePermissions(permissions);
  return explicitPermissions.length > 0 ? explicitPermissions : getDefaultPermissions(role);
};

const createModerationEntry = (req, action, reason = '') => ({
  action,
  reason: String(reason || '').trim(),
  performedBy: {
    userId: req.user?._id || null,
    name: req.user?.name || '',
    email: req.user?.email || '',
    role: normalizeRole(req.user?.role),
  },
  createdAt: new Date(),
});

const decorateUser = async (user) => {
  const [orderCount, latestSession] = await Promise.all([
    Order.countDocuments({ user: user._id }),
    UserSession.findOne({ userId: user._id }).sort('-loginTime').lean(),
  ]);

  return {
    ...user,
    role: normalizeRole(user.role),
    permissions: getEffectivePermissions(user.role, user.permissions),
    orderCount,
    lastLogin: latestSession?.loginTime || null,
    activity: latestSession
      ? {
          ipAddress: latestSession.ipAddress,
          device: latestSession.device,
          browser: latestSession.browser,
          os: latestSession.os,
          country: latestSession.country,
          city: latestSession.city,
        }
      : null,
    accountStatus: user.isBanned ? 'banned' : user.isBlocked ? 'blocked' : 'active',
    fraudRiskScore: Number(user.fraudRiskScore || 0),
    isFraudFlagged: Boolean(user.isFraudFlagged),
    requiresVerification: Boolean(user.requiresVerification),
    fraudLastEventAt: user.fraudLastEventAt || null,
  };
};

const decorateSeller = async (seller) => {
  const [productCount, activeProductCount, orderAggregate] = await Promise.all([
    Product.countDocuments({ sellerId: seller._id }),
    Product.countDocuments({ sellerId: seller._id, isActive: true }),
    Order.aggregate([
      { $match: { 'items.sellerId': seller._id } },
      { $unwind: '$items' },
      { $match: { 'items.sellerId': seller._id } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$items.sellerRevenue' },
          totalOrders: { $addToSet: '$_id' },
        },
      },
    ]),
  ]);

  const stats = orderAggregate[0] || { totalRevenue: 0, totalOrders: [] };

  return {
    ...seller,
    productCount,
    activeProductCount,
    totalRevenue: stats.totalRevenue || 0,
    totalOrders: stats.totalOrders?.length || 0,
    accountStatus: seller.isSuspended ? 'suspended' : seller.isVerified ? 'verified' : 'pending',
    verificationStatus: seller.isVerified ? 'approved' : 'waiting_verification',
    applicationSource: seller.applicationSource || 'direct',
    userLinked: Boolean(seller.userId),
    moderationHistory: Array.isArray(seller.moderationHistory)
      ? [...seller.moderationHistory].sort(
          (left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime()
        )
      : [],
  };
};

// @desc    Get dashboard statistics
// @route   GET /api/admin/dashboard
// @access  Admin
exports.getDashboard = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeUserCutoff = new Date();
    activeUserCutoff.setDate(activeUserCutoff.getDate() - 7);

    const [
      totalProducts,
      totalUsers,
      totalSellers,
      activeUsers,
      blockedUsers,
      suspendedSellers,
      flaggedFraudUsers,
      openFraudEvents,
      totalOrders,
      todayOrders,
      totalRevenueData,
      todayRevenueData,
      couponUsageData,
      recentOrders,
      topProducts,
      dailyRevenue,
      roleDistribution,
    ] = await Promise.all([
      Product.countDocuments({ isActive: true }),
      User.countDocuments(),
      Seller.countDocuments(),
      UserSession.distinct('userId', { loginTime: { $gte: activeUserCutoff } }).then((users) => users.length),
      User.countDocuments({ $or: [{ isBlocked: true }, { isBanned: true }] }),
      Seller.countDocuments({ isSuspended: true }),
      User.countDocuments({ $or: [{ isFraudFlagged: true }, { requiresVerification: true }] }),
      FraudLog.countDocuments({ status: 'open', riskScore: { $gt: 0 } }),
      Order.countDocuments(),
      Order.countDocuments({ createdAt: { $gte: today } }),
      Order.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } },
      ]),
      Order.aggregate([
        { $match: { paymentStatus: 'paid', createdAt: { $gte: today } } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } },
      ]),
      Coupon.aggregate([
        {
          $group: {
            _id: null,
            totalUses: { $sum: '$usedCount' },
            activeCoupons: {
              $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] },
            },
          },
        },
      ]),
      Order.find()
        .sort('-createdAt')
        .limit(10)
        .populate('user', 'name email')
        .lean(),
      Order.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.product',
            title: { $first: '$items.title' },
            totalSold: { $sum: '$items.quantity' },
            totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          },
        },
        { $sort: { totalSold: -1 } },
        { $limit: 5 },
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo }, paymentStatus: 'paid' } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            revenue: { $sum: '$totalPrice' },
            orders: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      User.aggregate([
        {
          $group: {
            _id: '$role',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        stats: {
          totalProducts,
          totalUsers,
          totalSellers,
          activeUsers,
          blockedUsers,
          suspendedSellers,
          flaggedFraudUsers,
          openFraudEvents,
          couponUsage: couponUsageData[0]?.totalUses || 0,
          totalOrders,
          todayOrders,
          revenueToday: todayRevenueData[0]?.total || 0,
          totalRevenue: totalRevenueData[0]?.total || 0,
        },
        recentOrders,
        topProducts,
        dailyRevenue,
        roleDistribution: Object.values(
          roleDistribution.reduce((accumulator, item) => {
            const normalizedRole = normalizeRole(item._id);

            if (!accumulator[normalizedRole]) {
              accumulator[normalizedRole] = {
                role: normalizedRole,
                count: 0,
              };
            }

            accumulator[normalizedRole].count += item.count;
            return accumulator;
          }, {})
        ),
        couponAnalytics: {
          totalUses: couponUsageData[0]?.totalUses || 0,
          activeCoupons: couponUsageData[0]?.activeCoupons || 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get fraud monitor data
// @route   GET /api/admin/fraud-monitor
// @access  Admin
exports.getFraudMonitor = async (req, res, next) => {
  try {
    const { status = 'open', limit = 50 } = req.query;
    const logFilter = { riskScore: { $gt: 0 } };

    if (status === 'open' || status === 'safe') {
      logFilter.status = status;
    }

    const limitNum = Math.min(100, Math.max(10, parseInt(limit, 10) || 50));
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [flaggedUsersRaw, recentLogs, openEvents, safeEvents, ipActivity, totalRiskSummary] = await Promise.all([
      User.find({
        $or: [
          { fraudRiskScore: { $gt: 0 } },
          { isFraudFlagged: true },
          { requiresVerification: true },
        ],
      })
        .sort({ fraudRiskScore: -1, fraudLastEventAt: -1, createdAt: -1 })
        .limit(25)
        .lean(),
      FraudLog.find(logFilter)
        .populate('userId', 'name email fraudRiskScore isFraudFlagged requiresVerification isBlocked isBanned')
        .sort('-timestamp')
        .limit(limitNum)
        .lean(),
      FraudLog.countDocuments({ status: 'open', riskScore: { $gt: 0 } }),
      FraudLog.countDocuments({ status: 'safe', riskScore: { $gt: 0 } }),
      FraudLog.aggregate([
        {
          $match: {
            timestamp: { $gte: sevenDaysAgo },
          },
        },
        {
          $group: {
            _id: '$ipAddress',
            totalEvents: { $sum: 1 },
            totalRiskScore: { $sum: '$riskScore' },
            lastSeen: { $max: '$timestamp' },
            actions: { $addToSet: '$action' },
            users: { $addToSet: '$email' },
          },
        },
        { $sort: { totalRiskScore: -1, lastSeen: -1 } },
        { $limit: 20 },
      ]),
      FraudLog.aggregate([
        { $match: { riskScore: { $gt: 0 } } },
        {
          $group: {
            _id: null,
            totalRiskScore: { $sum: '$riskScore' },
          },
        },
      ]),
    ]);

    const flaggedUsers = await Promise.all(flaggedUsersRaw.map((user) => decorateUser(user)));

    res.json({
      success: true,
      data: {
        threshold: getFraudThreshold(),
        summary: {
          flaggedUsers: flaggedUsers.filter((user) => user.isFraudFlagged || user.requiresVerification).length,
          verificationRequired: flaggedUsers.filter((user) => user.requiresVerification).length,
          openEvents,
          safeEvents,
          totalRiskScore: totalRiskSummary[0]?.totalRiskScore || 0,
        },
        flaggedUsers,
        logs: recentLogs,
        ipActivity: ipActivity.map((entry) => ({
          ipAddress: entry._id || 'unknown',
          totalEvents: entry.totalEvents,
          totalRiskScore: entry.totalRiskScore,
          lastSeen: entry.lastSeen,
          actions: entry.actions,
          users: (entry.users || []).filter(Boolean),
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark a fraud event as safe
// @route   PATCH /api/admin/fraud-logs/:id/mark-safe
// @access  Admin
exports.markFraudLogSafe = async (req, res, next) => {
  try {
    const { note = '' } = req.body;
    const fraudLog = await FraudLog.findById(req.params.id);

    if (!fraudLog) {
      return next(ApiError.notFound('Fraud log not found'));
    }

    fraudLog.status = 'safe';
    fraudLog.reviewedAt = new Date();
    fraudLog.reviewNote = String(note || '').trim();
    fraudLog.reviewedBy = {
      userId: req.user?._id || null,
      name: req.user?.name || '',
      email: req.user?.email || '',
    };

    await fraudLog.save();

    const userState = await syncUserFraudState(fraudLog.userId);

    res.json({
      success: true,
      message: 'Fraud event marked as safe',
      data: {
        ...fraudLog.toObject(),
        userState,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all sellers
// @route   GET /api/admin/sellers
// @access  Admin
exports.getAllSellers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { sellerName: { $regex: search, $options: 'i' } },
        { storeName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    if (status === 'verified') {
      filter.isVerified = true;
      filter.isSuspended = false;
    }

    if (status === 'pending') {
      filter.isVerified = false;
      filter.isSuspended = false;
    }

    if (status === 'suspended') {
      filter.isSuspended = true;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));

    const [sellers, total] = await Promise.all([
      Seller.find(filter)
        .sort('-createdAt')
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      Seller.countDocuments(filter),
    ]);

    const data = await Promise.all(sellers.map((seller) => decorateSeller(seller)));

    res.json({
      success: true,
      data,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update seller verification or suspension
// @route   PATCH /api/admin/sellers/:id/status
// @access  Admin
exports.updateSellerStatus = async (req, res, next) => {
  try {
    const action = String(req.body?.action || req.body?.status || '').trim().toLowerCase();
    const { reason = '' } = req.body;
    const allowedActions = ['verify', 'unverify', 'suspend', 'unsuspend', 'revert'];

    if (!allowedActions.includes(action)) {
      return next(ApiError.badRequest('Action must be one of: verify, unverify, suspend, unsuspend, revert'));
    }

    const seller = await Seller.findById(req.params.id);
    if (!seller) {
      return next(ApiError.notFound('Seller not found'));
    }

    if (action === 'verify') {
      seller.isVerified = true;
    }

    if (action === 'unverify') {
      seller.isVerified = false;
    }

    if (action === 'suspend') {
      seller.isSuspended = true;
      seller.suspensionReason = String(reason || '').trim();
    }

    if (action === 'unsuspend') {
      seller.isSuspended = false;
      seller.suspensionReason = '';
    }

    if (action === 'revert') {
      seller.isVerified = false;
      seller.isSuspended = false;
      seller.suspensionReason = '';
    }

    seller.moderationHistory.unshift(createModerationEntry(req, action, reason));

    if (seller.moderationHistory.length > 25) {
      seller.moderationHistory = seller.moderationHistory.slice(0, 25);
    }

    await seller.save();

    res.json({
      success: true,
      message: `Seller ${action} action applied successfully`,
      data: await decorateSeller(seller.toObject()),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all orders (admin)
// @route   GET /api/admin/orders
// @access  Admin
exports.getAllOrders = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, parseInt(limit));

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('user', 'name email')
        .sort('-createdAt')
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      Order.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: orders,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update order status
// @route   PUT /api/admin/orders/:id
// @access  Admin
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status, paymentStatus } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return next(ApiError.notFound('Order not found'));
    }

    const previousStatus = String(order.status || '').toLowerCase();

    if (status) {
      order.status = status;
    }

    if (paymentStatus) {
      order.paymentStatus = paymentStatus;
    }

    const nextStatus = String(order.status || '').toLowerCase();
    if (nextStatus === 'delivered' && previousStatus !== 'delivered') {
      order.deliveredAt = new Date();
      await applyDeliveryRewards(order);
    }

    if (previousStatus === 'delivered' && nextStatus !== 'delivered') {
      order.deliveredAt = null;
      await rollbackDeliveryRewards(order);
    }

    await order.save();
    await order.populate('user', 'name email');

    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users (admin)
// @route   GET /api/admin/users
// @access  Admin
exports.getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, role, adminOnly, status } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const roleFilter = buildRoleFilter(role);
    if (roleFilter) {
      filter.role = roleFilter;
    }

    if (adminOnly === 'true') {
      filter.role = buildRoleFilter(nonUserRoles.join(','));
    }

    if (status === 'blocked') {
      filter.isBlocked = true;
    }

    if (status === 'banned') {
      filter.isBanned = true;
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, parseInt(limit));

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort('-createdAt')
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      User.countDocuments(filter),
    ]);

    const enrichedUsers = await Promise.all(users.map((user) => decorateUser(user)));

    res.json({
      success: true,
      data: enrichedUsers,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get RBAC configuration
// @route   GET /api/admin/rbac
// @access  Admin
exports.getRbacConfig = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: {
        roles: Object.values(ROLES),
        permissions: Object.values(PERMISSIONS),
        rolePermissions: ROLE_PERMISSIONS,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create admin or staff user
// @route   POST /api/admin/admins
// @access  Admin
exports.createAdminUser = async (req, res, next) => {
  try {
    const { name, email, password, role = ROLES.ADMIN, permissions = [] } = req.body;
    const normalizedRole = normalizeRole(role);

    if (!nonUserRoles.includes(normalizedRole)) {
      return next(ApiError.badRequest('Admin creation requires an admin-capable role'));
    }

    if (normalizedRole === ROLES.SUPER_ADMIN && normalizeRole(req.user.role) !== ROLES.SUPER_ADMIN) {
      return next(ApiError.forbidden('Only a super admin can create another super admin'));
    }

    const existingUser = await User.findOne({ email: String(email || '').trim().toLowerCase() });
    if (existingUser) {
      return next(ApiError.badRequest('Email is already registered'));
    }

    const user = await User.create({
      name,
      email,
      password,
      role: normalizedRole,
      permissions: buildPermissionSet(normalizedRole, permissions),
    });

    res.status(201).json({
      success: true,
      data: await decorateUser(user.toObject()),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user role and permissions
// @route   PATCH /api/admin/users/:id/role
// @access  Admin
exports.updateUserRole = async (req, res, next) => {
  try {
    const { role, permissions } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return next(ApiError.notFound('User not found'));
    }

    if (String(user._id) === String(req.user._id)) {
      return next(ApiError.forbidden('You cannot change your own role or permissions here'));
    }

    const currentRole = normalizeRole(user.role);
    const nextRole = role ? normalizeRole(role) : currentRole;

    if (
      (currentRole === ROLES.SUPER_ADMIN || nextRole === ROLES.SUPER_ADMIN) &&
      normalizeRole(req.user.role) !== ROLES.SUPER_ADMIN
    ) {
      return next(ApiError.forbidden('Only a super admin can assign or modify the super admin role'));
    }

    user.role = nextRole;

    if (permissions !== undefined) {
      user.permissions = sanitizePermissions(permissions);
    } else if (role) {
      user.permissions = getDefaultPermissions(nextRole);
    }

    await user.save();

    res.json({
      success: true,
      message: 'User role updated successfully',
      data: await decorateUser(user.toObject()),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get login session history for a user
// @route   GET /api/admin/users/:id/sessions
// @access  Admin
exports.getUserSessions = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status = 'all' } = req.query;
    const validStatuses = ['all', 'active', 'closed', 'blocked'];

    if (!validStatuses.includes(status)) {
      return next(ApiError.badRequest('Status must be one of: all, active, closed, blocked'));
    }

    const user = await User.findById(req.params.id).select('name email isBlocked isBanned banReason').lean();
    if (!user) {
      return next(ApiError.notFound('User not found'));
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const filter = { userId: user._id };

    if (status === 'active') {
      filter.logoutTime = null;
    }

    if (status === 'closed') {
      filter.logoutTime = { $ne: null };
    }

    if (status === 'blocked') {
      filter.isBlocked = true;
    }

    const [sessions, filteredTotal, totalSessions, activeSessions, blockedSessions, latestSession] = await Promise.all([
      UserSession.find(filter)
        .sort('-loginTime')
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      UserSession.countDocuments(filter),
      UserSession.countDocuments({ userId: user._id }),
      UserSession.countDocuments({ userId: user._id, logoutTime: null }),
      UserSession.countDocuments({ userId: user._id, isBlocked: true }),
      UserSession.findOne({ userId: user._id }).sort('-loginTime').lean(),
    ]);

    const data = sessions.map((session) => ({
      ...session,
      sessionStatus: session.isBlocked ? 'blocked' : session.logoutTime ? 'closed' : 'active',
      durationMinutes: session.logoutTime
        ? Math.max(1, Math.round((new Date(session.logoutTime) - new Date(session.loginTime)) / 60000))
        : null,
    }));

    res.json({
      success: true,
      data,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: normalizeRole(user.role),
        permissions: getEffectivePermissions(user.role, user.permissions),
        isBlocked: user.isBlocked,
        isBanned: user.isBanned,
        banReason: user.banReason,
      },
      summary: {
        totalSessions,
        activeSessions,
        blockedSessions,
        latestLogin: latestSession?.loginTime || null,
      },
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: filteredTotal,
        pages: filteredTotal === 0 ? 1 : Math.ceil(filteredTotal / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Block, unblock, or ban a user
// @route   PATCH /api/admin/users/:id/access
// @access  Admin
exports.updateUserAccess = async (req, res, next) => {
  try {
    const { action, reason = '' } = req.body;

    if (!['block', 'unblock', 'ban'].includes(action)) {
      return next(ApiError.badRequest('Action must be one of: block, unblock, ban'));
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return next(ApiError.notFound('User not found'));
    }

    if (normalizeRole(user.role) === ROLES.SUPER_ADMIN && normalizeRole(req.user.role) !== ROLES.SUPER_ADMIN) {
      return next(ApiError.forbidden('Only a super admin can modify a super admin account'));
    }

    if (action === 'block') {
      user.isBlocked = true;
      user.isBanned = false;
      user.banReason = '';
    }

    if (action === 'unblock') {
      user.isBlocked = false;
      user.isBanned = false;
      user.banReason = '';
    }

    if (action === 'ban') {
      user.isBanned = true;
      user.isBlocked = false;
      user.banReason = String(reason || '').trim();
    }

    await user.save();

    await UserSession.updateMany(
      {
        userId: user._id,
        logoutTime: null,
      },
      {
        $set: {
          isBlocked: user.isBlocked || user.isBanned,
          logoutTime: new Date(),
        },
      }
    );

    res.json({
      success: true,
      message: `User ${action} action applied successfully`,
      data: {
        _id: user._id,
        email: user.email,
        role: normalizeRole(user.role),
        permissions: getEffectivePermissions(user.role, user.permissions),
        isBlocked: user.isBlocked,
        isBanned: user.isBanned,
        banReason: user.banReason,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all categories (admin)
// @route   GET /api/admin/categories
// @access  Admin
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find().sort('name').lean();
    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
};

// @desc    Create category
// @route   POST /api/admin/categories
// @access  Admin
exports.createCategory = async (req, res, next) => {
  try {
    const category = await Category.create(req.body);
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

// @desc    Create coupon
// @route   POST /api/admin/coupons/create
// @access  Admin
exports.createCoupon = async (req, res, next) => {
  try {
    const {
      code,
      discountType,
      discountValue,
      minOrderAmount = 0,
      maxDiscount = 0,
      expiryDate,
      usageLimit = 0,
      isActive = true,
      visibility = 'public',
      allowedUsers = [],
    } = req.body;

    if (!code) {
      return next(ApiError.badRequest('Coupon code is required'));
    }

    if (visibility === 'targeted' && (!Array.isArray(allowedUsers) || allowedUsers.length === 0)) {
      return next(ApiError.badRequest('Targeted coupons require at least one allowed user'));
    }

    const coupon = await Coupon.create({
      code: code.trim().toUpperCase(),
      discountType,
      discountValue,
      minOrderAmount,
      maxDiscount,
      expiryDate,
      usageLimit,
      usedCount: 0,
      isActive,
      visibility,
      allowedUsers,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: coupon });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all coupons with usage analytics
// @route   GET /api/admin/coupons
// @access  Admin
exports.getCoupons = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, visibility, isActive } = req.query;
    const filter = {};

    if (search) {
      filter.code = { $regex: search, $options: 'i' };
    }

    if (visibility) {
      filter.visibility = visibility;
    }

    if (typeof isActive !== 'undefined') {
      filter.isActive = isActive === 'true';
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, parseInt(limit, 10));

    const [coupons, total, aggregate] = await Promise.all([
      Coupon.find(filter)
        .populate('createdBy', 'name email')
        .sort('-createdAt')
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      Coupon.countDocuments(filter),
      Coupon.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalCoupons: { $sum: 1 },
            activeCoupons: {
              $sum: {
                $cond: [{ $eq: ['$isActive', true] }, 1, 0],
              },
            },
            totalUses: { $sum: '$usedCount' },
          },
        },
      ]),
    ]);

    const data = coupons.map((coupon) => ({
      ...coupon,
      remainingUsage:
        coupon.usageLimit > 0 ? Math.max(0, coupon.usageLimit - coupon.usedCount) : null,
      usageRate:
        coupon.usageLimit > 0
          ? Math.round((coupon.usedCount / coupon.usageLimit) * 10000) / 100
          : null,
      targetedUsersCount: coupon.allowedUsers?.length || 0,
    }));

    res.json({
      success: true,
      data,
      analytics: {
        totalCoupons: aggregate[0]?.totalCoupons || 0,
        activeCoupons: aggregate[0]?.activeCoupons || 0,
        totalUses: aggregate[0]?.totalUses || 0,
      },
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update coupon
// @route   PATCH /api/admin/coupons/:id
// @access  Admin
exports.updateCoupon = async (req, res, next) => {
  try {
    const payload = { ...req.body };

    if (payload.code) {
      payload.code = payload.code.trim().toUpperCase();
    }

    if (
      payload.visibility === 'targeted' &&
      payload.allowedUsers &&
      Array.isArray(payload.allowedUsers) &&
      payload.allowedUsers.length === 0
    ) {
      return next(ApiError.badRequest('Targeted coupons require at least one allowed user'));
    }

    const coupon = await Coupon.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });

    if (!coupon) {
      return next(ApiError.notFound('Coupon not found'));
    }

    res.json({ success: true, data: coupon });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete coupon
// @route   DELETE /api/admin/coupons/:id
// @access  Admin
exports.deleteCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) {
      return next(ApiError.notFound('Coupon not found'));
    }

    res.json({ success: true, message: 'Coupon deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Assign coupon to specific users
// @route   POST /api/admin/coupons/assign
// @access  Admin
exports.assignCoupon = async (req, res, next) => {
  try {
    const { couponId, userIds = [] } = req.body;

    if (!couponId) {
      return next(ApiError.badRequest('couponId is required'));
    }

    if (!Array.isArray(userIds)) {
      return next(ApiError.badRequest('userIds must be an array'));
    }

    const coupon = await Coupon.findById(couponId);
    if (!coupon) {
      return next(ApiError.notFound('Coupon not found'));
    }

    coupon.allowedUsers = [...new Set(userIds.map((id) => id.toString()))];

    if (coupon.visibility === 'targeted' && coupon.allowedUsers.length === 0) {
      return next(ApiError.badRequest('Targeted coupons require at least one assigned user'));
    }

    await coupon.save();

    res.json({
      success: true,
      message: 'Coupon assignment updated',
      data: coupon,
    });
  } catch (error) {
    next(error);
  }
};
