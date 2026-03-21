const FraudLog = require('../models/FraudLog');
const User = require('../models/User');
const Order = require('../models/Order');
const { extractClientInfo } = require('./clientInfo');

const FRAUD_ACTIONS = {
  LOGIN_ATTEMPT: 'LOGIN_ATTEMPT',
  FAILED_PAYMENT: 'FAILED_PAYMENT',
  MULTIPLE_COUPON_ATTEMPTS: 'MULTIPLE_COUPON_ATTEMPTS',
  SUSPICIOUS_ORDER: 'SUSPICIOUS_ORDER',
  COUPON_ATTEMPT: 'COUPON_ATTEMPT',
};

const FRAUD_SCORES = {
  [FRAUD_ACTIONS.LOGIN_ATTEMPT]: 10,
  [FRAUD_ACTIONS.FAILED_PAYMENT]: 20,
  [FRAUD_ACTIONS.MULTIPLE_COUPON_ATTEMPTS]: 15,
  [FRAUD_ACTIONS.SUSPICIOUS_ORDER]: 25,
  [FRAUD_ACTIONS.COUPON_ATTEMPT]: 0,
};

const getFraudThreshold = () => Number(process.env.FRAUD_RISK_THRESHOLD || 60);

const getFraudBlockedMessage = () =>
  'This account has been flagged for verification due to suspicious activity. Please contact support or wait for admin review.';

const syncUserFraudState = async (userId) => {
  if (!userId) {
    return null;
  }

  const aggregate = await FraudLog.aggregate([
    {
      $match: {
        userId,
        status: 'open',
      },
    },
    {
      $group: {
        _id: null,
        totalRiskScore: { $sum: '$riskScore' },
        lastEventAt: { $max: '$timestamp' },
      },
    },
  ]);

  const totalRiskScore = aggregate[0]?.totalRiskScore || 0;
  const lastEventAt = aggregate[0]?.lastEventAt || null;
  const requiresVerification = totalRiskScore >= getFraudThreshold();

  const user = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        fraudRiskScore: totalRiskScore,
        isFraudFlagged: requiresVerification,
        requiresVerification,
        fraudLastEventAt: lastEventAt,
      },
    },
    {
      new: true,
      select: 'fraudRiskScore isFraudFlagged requiresVerification fraudLastEventAt',
    }
  ).lean();

  return user;
};

const createFraudLog = async ({
  req,
  userId = null,
  email = '',
  action,
  riskScore,
  reason = '',
  metadata = {},
}) => {
  const clientInfo = extractClientInfo(req);
  const log = await FraudLog.create({
    userId,
    email: String(email || '').trim().toLowerCase(),
    ipAddress: clientInfo.ipAddress,
    device: clientInfo.device,
    browser: clientInfo.browser,
    os: clientInfo.os,
    action,
    riskScore: Number(riskScore || 0),
    reason: String(reason || '').trim(),
    metadata,
    timestamp: new Date(),
  });

  const userState = await syncUserFraudState(userId);

  if (userState) {
    log.totalRiskScore = userState.fraudRiskScore || 0;
    log.requiresVerification = Boolean(userState.requiresVerification);
    await log.save();
  }

  return {
    log,
    userState,
    clientInfo,
  };
};

const recordFailedLoginAttempt = async ({ req, userId = null, email = '', reason = '' }) =>
  createFraudLog({
    req,
    userId,
    email,
    action: FRAUD_ACTIONS.LOGIN_ATTEMPT,
    riskScore: FRAUD_SCORES[FRAUD_ACTIONS.LOGIN_ATTEMPT],
    reason: reason || 'Invalid login attempt',
    metadata: {
      email: String(email || '').trim().toLowerCase(),
    },
  });

const trackCouponAttempt = async ({ req, userId = null, code = '', success = false, reason = '' }) => {
  const clientInfo = extractClientInfo(req);
  const email = req.user?.email || '';

  await FraudLog.create({
    userId,
    email,
    ipAddress: clientInfo.ipAddress,
    device: clientInfo.device,
    browser: clientInfo.browser,
    os: clientInfo.os,
    action: FRAUD_ACTIONS.COUPON_ATTEMPT,
    riskScore: 0,
    reason: success ? 'Coupon applied' : String(reason || 'Coupon rejected'),
    metadata: {
      code: String(code || '').trim().toUpperCase(),
      success,
    },
    timestamp: new Date(),
  });

  const recentWindow = new Date(Date.now() - 15 * 60 * 1000);
  const scope = userId
    ? { userId }
    : { ipAddress: clientInfo.ipAddress };

  const recentAttempts = await FraudLog.countDocuments({
    ...scope,
    action: FRAUD_ACTIONS.COUPON_ATTEMPT,
    timestamp: { $gte: recentWindow },
  });

  let suspiciousEvent = null;
  if (recentAttempts >= 4) {
    const duplicateEvent = await FraudLog.findOne({
      ...scope,
      action: FRAUD_ACTIONS.MULTIPLE_COUPON_ATTEMPTS,
      timestamp: { $gte: recentWindow },
    }).lean();

    if (!duplicateEvent) {
      suspiciousEvent = await createFraudLog({
        req,
        userId,
        email,
        action: FRAUD_ACTIONS.MULTIPLE_COUPON_ATTEMPTS,
        riskScore: FRAUD_SCORES[FRAUD_ACTIONS.MULTIPLE_COUPON_ATTEMPTS],
        reason: `Detected ${recentAttempts} coupon attempts within 15 minutes`,
        metadata: {
          code: String(code || '').trim().toUpperCase(),
          recentAttempts,
        },
      });
    }
  }

  return {
    recentAttempts,
    suspiciousEvent,
    userState: suspiciousEvent?.userState || null,
  };
};

const recordFailedPaymentAttempt = async ({ req, userId = null, amount = 0, paymentMethod = 'card', reason = '' }) =>
  createFraudLog({
    req,
    userId,
    email: req.user?.email || '',
    action: FRAUD_ACTIONS.FAILED_PAYMENT,
    riskScore: FRAUD_SCORES[FRAUD_ACTIONS.FAILED_PAYMENT],
    reason: reason || 'Payment failed during checkout',
    metadata: {
      amount,
      paymentMethod,
    },
  });

const evaluateOrderFraud = async ({ req, userId, totalPrice, paymentMethod }) => {
  const clientInfo = extractClientInfo(req);
  const triggers = [];
  const shortWindow = new Date(Date.now() - 10 * 60 * 1000);

  const sameIpOrderCount = await Order.countDocuments({
    'clientInfo.ipAddress': clientInfo.ipAddress,
    createdAt: { $gte: shortWindow },
  });

  if (sameIpOrderCount >= 2) {
    triggers.push(`Multiple orders detected from IP ${clientInfo.ipAddress} in a short time window`);
  }

  const orderHistory = await Order.aggregate([
    {
      $match: {
        user: userId,
        paymentStatus: { $in: ['pending', 'paid'] },
      },
    },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        averageAmount: { $avg: '$totalPrice' },
      },
    },
  ]);

  const historicalCount = orderHistory[0]?.count || 0;
  const historicalAverage = orderHistory[0]?.averageAmount || 0;
  const unusualAbsoluteThreshold = Number(process.env.FRAUD_HIGH_ORDER_AMOUNT || 25000);

  if (totalPrice >= unusualAbsoluteThreshold) {
    triggers.push(`Order amount ₹${totalPrice} exceeded high value threshold`);
  } else if (historicalCount >= 2 && historicalAverage > 0 && totalPrice >= historicalAverage * 3) {
    triggers.push(`Order amount ₹${totalPrice} is unusually high compared to historical average`);
  }

  let suspiciousEvent = null;
  if (triggers.length > 0) {
    suspiciousEvent = await createFraudLog({
      req,
      userId,
      email: req.user?.email || '',
      action: FRAUD_ACTIONS.SUSPICIOUS_ORDER,
      riskScore: FRAUD_SCORES[FRAUD_ACTIONS.SUSPICIOUS_ORDER],
      reason: triggers.join('; '),
      metadata: {
        totalPrice,
        paymentMethod,
        sameIpOrderCount,
        historicalAverage,
        historicalCount,
        triggers,
      },
    });
  }

  return {
    clientInfo,
    triggers,
    suspiciousEvent,
    blocked: Boolean(suspiciousEvent?.userState?.requiresVerification),
    userState: suspiciousEvent?.userState || null,
  };
};

module.exports = {
  FRAUD_ACTIONS,
  FRAUD_SCORES,
  getFraudThreshold,
  getFraudBlockedMessage,
  syncUserFraudState,
  createFraudLog,
  recordFailedLoginAttempt,
  trackCouponAttempt,
  recordFailedPaymentAttempt,
  evaluateOrderFraud,
};