const ApiError = require('./apiError');

const round2 = (value) => Math.round(value * 100) / 100;

const ensureCouponUsable = ({ coupon, userId, subtotal }) => {
  if (!coupon) {
    throw ApiError.notFound('Invalid coupon code');
  }

  if (!coupon.isActive) {
    throw ApiError.badRequest('Coupon is disabled');
  }

  if (new Date(coupon.expiryDate) < new Date()) {
    throw ApiError.badRequest('Coupon has expired');
  }

  if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
    throw ApiError.badRequest('Coupon usage limit reached');
  }

  if (coupon.visibility === 'targeted') {
    const isAllowed = coupon.allowedUsers.some((id) => id.toString() === userId.toString());
    if (!isAllowed) {
      throw ApiError.forbidden('You are not eligible for this coupon');
    }
  }

  if (coupon.visibility === 'private' && coupon.allowedUsers.length > 0) {
    const isAllowed = coupon.allowedUsers.some((id) => id.toString() === userId.toString());
    if (!isAllowed) {
      throw ApiError.forbidden('You are not eligible for this coupon');
    }
  }

  if (subtotal < coupon.minOrderAmount) {
    throw ApiError.badRequest(`Minimum order amount of ${coupon.minOrderAmount} is required`);
  }
};

const calculateCouponDiscount = ({ coupon, subtotal }) => {
  let discount = 0;

  if (coupon.discountType === 'percentage') {
    discount = (subtotal * coupon.discountValue) / 100;
  } else {
    discount = coupon.discountValue;
  }

  if (coupon.maxDiscount > 0) {
    discount = Math.min(discount, coupon.maxDiscount);
  }

  discount = Math.min(discount, subtotal);
  return round2(Math.max(0, discount));
};

module.exports = {
  ensureCouponUsable,
  calculateCouponDiscount,
  round2,
};
