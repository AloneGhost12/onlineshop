const MailboxMessage = require('../models/MailboxMessage');
const User = require('../models/User');

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
      role: createdBy.role || 'system',
      userId: createdBy.userId || null,
      name: createdBy.name || 'System',
    },
  });
};

const createOrderMailboxMessage = async ({
  order,
  title,
  message,
  action,
  createdBy = {},
}) => {
  if (!order?.user) return null;

  return createMailboxMessage({
    userId: order.user,
    type: 'order_update',
    title,
    message,
    metadata: {
      orderId: order._id,
      orderNumber: order.orderNumber || '',
      action: action || '',
      link: order._id ? `/orders/${order._id}` : '/orders',
    },
    createdBy,
  });
};

const broadcastAdminMessage = async ({
  title,
  message,
  createdBy = {},
  userFilter = {},
}) => {
  const users = await User.find(userFilter).select('_id').lean();
  if (!users.length) return { sent: 0 };

  const now = new Date();
  const docs = users.map((user) => ({
    user: user._id,
    type: 'admin_message',
    title,
    message,
    metadata: {
      action: 'admin_broadcast',
      link: '/mailbox',
    },
    createdBy: {
      role: createdBy.role || 'admin',
      userId: createdBy.userId || null,
      name: createdBy.name || 'Admin',
    },
    createdAt: now,
    updatedAt: now,
  }));

  await MailboxMessage.insertMany(docs, { ordered: false });
  return { sent: docs.length };
};

module.exports = {
  createMailboxMessage,
  createOrderMailboxMessage,
  broadcastAdminMessage,
};
