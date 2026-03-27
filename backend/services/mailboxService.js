const User = require('../models/User');
const MailboxMessage = require('../models/MailboxMessage');

const createMailboxMessage = async ({
  userId,
  type = 'system',
  title,
  message,
  metadata = {},
  createdBy = {},
}) => {
  if (!userId || !title || !message) {
    return null;
  }

  return MailboxMessage.create({
    user: userId,
    type,
    title,
    message,
    metadata,
    createdBy: {
      role: String(createdBy.role || 'system'),
      userId: createdBy.userId || null,
      name: String(createdBy.name || 'ShopVault'),
    },
  });
};

const createOrderMailboxMessage = async ({
  order,
  action,
  title,
  message,
  createdBy = {},
}) => {
  if (!order?.user) {
    return null;
  }

  return createMailboxMessage({
    userId: order.user,
    type: 'order_update',
    title,
    message,
    metadata: {
      orderId: order._id,
      orderNumber: order.orderNumber || '',
      link: order?._id ? `/orders/${order._id}` : '/orders',
      action: String(action || ''),
    },
    createdBy,
  });
};

const broadcastAdminMessage = async ({ title, message, createdBy = {} }) => {
  const users = await User.find({ isBanned: false }).select('_id').lean();
  if (users.length === 0) {
    return { sent: 0 };
  }

  const docs = users.map((user) => ({
    user: user._id,
    type: 'admin_message',
    title,
    message,
    metadata: {
      link: '/mailbox',
      action: 'admin_broadcast',
    },
    createdBy: {
      role: String(createdBy.role || 'admin'),
      userId: createdBy.userId || null,
      name: String(createdBy.name || 'Admin'),
    },
  }));

  await MailboxMessage.insertMany(docs, { ordered: false });
  return { sent: docs.length };
};

module.exports = {
  createMailboxMessage,
  createOrderMailboxMessage,
  broadcastAdminMessage,
};
