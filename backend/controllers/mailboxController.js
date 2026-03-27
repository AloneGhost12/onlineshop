const MailboxMessage = require('../models/MailboxMessage');
const ApiError = require('../utils/apiError');

// @desc    Get mailbox messages for current user
// @route   GET /api/mailbox
// @access  Private
exports.getMailboxMessages = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const onlyUnread = String(req.query.unread || '').toLowerCase() === 'true';

    const filter = { user: req.user._id };
    if (onlyUnread) {
      filter.isRead = false;
    }

    const [messages, total, unreadCount] = await Promise.all([
      MailboxMessage.find(filter)
        .sort('-createdAt')
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      MailboxMessage.countDocuments(filter),
      MailboxMessage.countDocuments({ user: req.user._id, isRead: false }),
    ]);

    res.json({
      success: true,
      data: messages,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get unread mailbox count
// @route   GET /api/mailbox/unread-count
// @access  Private
exports.getUnreadMailboxCount = async (req, res, next) => {
  try {
    const unreadCount = await MailboxMessage.countDocuments({
      user: req.user._id,
      isRead: false,
    });

    res.json({
      success: true,
      data: { unreadCount },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark single mailbox message as read
// @route   PATCH /api/mailbox/:id/read
// @access  Private
exports.markMailboxMessageRead = async (req, res, next) => {
  try {
    const message = await MailboxMessage.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!message) {
      return next(ApiError.notFound('Mailbox message not found'));
    }

    if (!message.isRead) {
      message.isRead = true;
      message.readAt = new Date();
      await message.save();
    }

    res.json({
      success: true,
      data: message,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark all mailbox messages as read
// @route   PATCH /api/mailbox/read-all
// @access  Private
exports.markAllMailboxRead = async (req, res, next) => {
  try {
    await MailboxMessage.updateMany(
      { user: req.user._id, isRead: false },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      }
    );

    res.json({
      success: true,
      message: 'All messages marked as read',
    });
  } catch (error) {
    next(error);
  }
};
