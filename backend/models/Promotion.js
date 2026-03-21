const mongoose = require('mongoose');

const PROMOTION_TYPES = Object.freeze({
  FIRST_ORDER: 'FIRST_ORDER',
  FESTIVAL: 'FESTIVAL',
  CATEGORY_DISCOUNT: 'CATEGORY_DISCOUNT',
  BUY_ONE_GET_ONE: 'BUY_ONE_GET_ONE',
  FLASH_SALE: 'FLASH_SALE',
});

const DISCOUNT_TYPES = Object.freeze({
  PERCENTAGE: 'percentage',
  FIXED: 'fixed',
});

const promotionSchema = new mongoose.Schema(
  {
    promotionName: {
      type: String,
      required: [true, 'Promotion name is required'],
      trim: true,
      maxlength: [120, 'Promotion name cannot exceed 120 characters'],
    },
    type: {
      type: String,
      enum: Object.values(PROMOTION_TYPES),
      required: [true, 'Promotion type is required'],
      index: true,
    },
    discountType: {
      type: String,
      enum: Object.values(DISCOUNT_TYPES),
      default: DISCOUNT_TYPES.PERCENTAGE,
    },
    discountValue: {
      type: Number,
      required: [true, 'Discount value is required'],
      min: [0, 'Discount value cannot be negative'],
    },
    eligibleProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],
    eligibleCategories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
      },
    ],
    minOrderAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxDiscount: {
      type: Number,
      default: 0,
      min: 0,
    },
    combinable: {
      type: Boolean,
      default: false,
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
      index: true,
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    usageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalDiscountGiven: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalOrders: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

promotionSchema.index({ isActive: 1, startDate: 1, endDate: 1 });
promotionSchema.index({ type: 1, isActive: 1, createdAt: -1 });

module.exports = {
  Promotion: mongoose.model('Promotion', promotionSchema),
  PROMOTION_TYPES,
  DISCOUNT_TYPES,
};
