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
      maxlength: [120, 'Title cannot exceed 120 characters'],
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: [1200, 'Message cannot exceed 1200 characters'],
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
      },
      action: {
        type: String,
        default: '',
      },
      link: {
        type: String,
        default: '',
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
        default: 'System',
      },
    },
  },
  {
    timestamps: true,
  }
);

mailboxMessageSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('MailboxMessage', mailboxMessageSchema);
