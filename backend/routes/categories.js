const Category = require('../models/Category');

module.exports = router => {
  // Public route to get all active categories
  router.get('/api/categories', async (req, res, next) => {
    try {
      const categories = await Category.find({ isActive: true }).sort('name').lean();
      res.json({ success: true, data: categories });
    } catch (error) {
      next(error);
    }
  });
};
