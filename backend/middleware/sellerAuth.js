const jwt = require('jsonwebtoken');
const Seller = require('../models/Seller');
const ApiError = require('../utils/apiError');

const protectSeller = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.sellerToken) {
      token = req.cookies.sellerToken;
    }

    if (!token) {
      return next(ApiError.unauthorized('Seller authentication required.'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'seller') {
      return next(ApiError.unauthorized('Invalid seller token.'));
    }

    const seller = await Seller.findById(decoded.id);
    if (!seller) {
      return next(ApiError.unauthorized('Seller account no longer exists.'));
    }

    if (seller.isSuspended) {
      return next(ApiError.forbidden(`Seller account suspended. ${seller.suspensionReason || 'Contact admin support.'}`));
    }

    req.seller = seller;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(ApiError.unauthorized('Invalid seller token.'));
    }
    if (error.name === 'TokenExpiredError') {
      return next(ApiError.unauthorized('Seller session expired. Please sign in again.'));
    }
    next(error);
  }
};

module.exports = { protectSeller };