const User = require('../models/User');
const ApiError = require('../utils/apiError');
const { extractClientInfo } = require('../utils/clientInfo');
const { getFraudBlockedMessage } = require('../utils/fraudDetection');

const fraudLoginGuard = async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    req.fraudContext = {
      ...(req.fraudContext || {}),
      clientInfo: extractClientInfo(req),
    };

    if (!email) {
      return next();
    }

    const user = await User.findOne({ email }).select('isFraudFlagged requiresVerification');
    if (user?.requiresVerification || user?.isFraudFlagged) {
      return next(ApiError.forbidden(getFraudBlockedMessage()));
    }

    next();
  } catch (error) {
    next(error);
  }
};

const fraudCheckoutGuard = async (req, res, next) => {
  try {
    req.fraudContext = {
      ...(req.fraudContext || {}),
      clientInfo: extractClientInfo(req),
    };

    if (req.user?.requiresVerification || req.user?.isFraudFlagged) {
      return next(ApiError.forbidden(getFraudBlockedMessage()));
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  fraudLoginGuard,
  fraudCheckoutGuard,
};