const mongoose = require('mongoose');

const mailboxMessageSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['order_update', 'admin_message', 'system'],
      default: 'system',
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [160, 'Title cannot exceed 160 characters'],
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
    },
    metadata: {
      orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        default: null,
      },
      orderNumber: {
        type: String,
        default: '',
        trim: true,
      },
      link: {
        type: String,
        default: '',
        trim: true,
      },
      action: {
        type: String,
        default: '',
        trim: true,
      },
    },
    createdBy: {
      role: {
        type: String,
        default: 'system',
      },
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      },
      name: {
        type: String,
        default: 'ShopVault',
      },
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

mailboxMessageSchema.index({ user: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('MailboxMessage', mailboxMessageSchema);
