const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1'],
    default: 1,
  },
});

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    items: [cartItemSchema],
    appliedCoupon: {
      coupon: {
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
      discountAmount: {
        type: Number,
        min: 0,
        default: 0,
      },
      appliedAt: {
        type: Date,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Virtual for total price (computed on populate)
cartSchema.methods.calculateTotal = async function () {
  await this.populate('items.product', 'price title images stock');
  let total = 0;
  for (const item of this.items) {
    if (item.product) {
      total += item.product.price * item.quantity;
    }
  }
  return total;
};

module.exports = mongoose.model('Cart', cartSchema);
