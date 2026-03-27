const express = require('express');
const router = express.Router();
const {
  getMailboxMessages,
  getUnreadMailboxCount,
  markMailboxMessageRead,
  markAllMailboxRead,
} = require('../controllers/mailboxController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', getMailboxMessages);
router.get('/unread-count', getUnreadMailboxCount);
router.patch('/read-all', markAllMailboxRead);
router.patch('/:id/read', markMailboxMessageRead);

module.exports = router;
