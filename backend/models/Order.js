const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seller',
    default: null,
  },
  sellerStoreName: {
    type: String,
    default: 'ShopVault',
  },
  commissionPercentage: {
    type: Number,
    default: 0,
    min: 0,
  },
  sellerRevenue: {
    type: Number,
    default: 0,
    min: 0,
  },
  platformRevenue: {
    type: Number,
    default: 0,
    min: 0,
  },
  title: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  image: { type: String, default: '' },
});

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    orderNumber: {
      type: String,
      unique: true,
    },
    items: [orderItemSchema],
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    tax: {
      type: Number,
      default: 0,
      min: 0,
    },
    shippingCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    couponDiscount: {
      type: Number,
      default: 0,
      min: 0,
    },
    promotionDiscount: {
      type: Number,
      default: 0,
      min: 0,
    },
    promotions: [
      {
        promotionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Promotion',
        },
        promotionName: {
          type: String,
          default: '',
        },
        type: {
          type: String,
          default: '',
        },
        discountType: {
          type: String,
          default: '',
        },
        discountValue: {
          type: Number,
          default: 0,
        },
        discountAmount: {
          type: Number,
          default: 0,
          min: 0,
        },
      },
    ],
    coupon: {
      couponId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Coupon',
      },
      code: {
        type: String,
        uppercase: true,
        trim: true,
      },
      discountType: {
        type: String,
        enum: ['percentage', 'fixed'],
      },
      discountValue: {
        type: Number,
        min: 0,
      },
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
      default: 'pending',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    paymentMethod: {
      type: String,
      enum: ['card', 'upi', 'cod', 'wallet'],
      default: 'card',
    },
    paymentId: {
      type: String,
      default: '',
    },
    clientInfo: {
      ipAddress: { type: String, default: '' },
      device: { type: String, default: 'unknown' },
      browser: { type: String, default: 'unknown' },
      os: { type: String, default: 'unknown' },
      country: { type: String, default: 'unknown' },
      city: { type: String, default: 'unknown' },
    },
    shippingAddress: {
      name: { type: String, required: true },
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zipCode: { type: String, required: true },
      country: { type: String, default: 'India' },
      phone: { type: String, required: true },
    },
    notes: {
      type: String,
      default: '',
    },
    expectedDeliveryAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancellationReason: {
      type: String,
      default: '',
      trim: true,
      maxlength: [250, 'Cancellation reason cannot exceed 250 characters'],
    },
    deliveredAt: Date,
  },
  {
    timestamps: true,
  }
);

// Generate order number before saving
orderSchema.pre('save', function () {
  if (!this.orderNumber) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.orderNumber = `SV-${timestamp}-${random}`;
  }
});

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ 'items.sellerId': 1, createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
