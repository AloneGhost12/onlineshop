const mongoose = require('mongoose');
const Product = require('../models/Product');
const Review = require('../models/Review');
const Order = require('../models/Order');
const ApiError = require('../utils/apiError');

const hasPurchasedProduct = async (userId, productId) => {
  const order = await Order.findOne({
    user: userId,
    status: 'delivered',
    'items.product': productId,
  })
    .select('_id')
    .lean();

  return Boolean(order);
};

// @desc    Get reviews for a product
// @route   GET /api/products/:id/reviews
// @access  Public
exports.getProductReviews = async (req, res, next) => {
  try {
    const { id: productId } = req.params;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return next(ApiError.badRequest('Invalid product id'));
    }

    const [reviews, total] = await Promise.all([
      Review.find({ product: productId })
        .populate('user', 'name')
        .sort('-createdAt')
        .skip(skip)
        .limit(limit)
        .lean(),
      Review.countDocuments({ product: productId }),
    ]);

    res.json({
      success: true,
      data: reviews,
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

// @desc    Check if logged-in user can review a product
// @route   GET /api/products/:id/review-eligibility
// @access  Private
exports.getReviewEligibility = async (req, res, next) => {
  try {
    const { id: productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return next(ApiError.badRequest('Invalid product id'));
    }

    const [product, hasPurchased, existingReview] = await Promise.all([
      Product.findOne({ _id: productId, isActive: true }).select('_id').lean(),
      hasPurchasedProduct(req.user._id, productId),
      Review.findOne({ user: req.user._id, product: productId }).select('_id').lean(),
    ]);

    if (!product) {
      return next(ApiError.notFound('Product not found'));
    }

    res.json({
      success: true,
      data: {
        canReview: hasPurchased && !existingReview,
        hasPurchased,
        hasReviewed: Boolean(existingReview),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a review for a product
// @route   POST /api/products/:id/reviews
// @access  Private
exports.createProductReview = async (req, res, next) => {
  try {
    const { id: productId } = req.params;
    const { rating, title, comment } = req.body;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return next(ApiError.badRequest('Invalid product id'));
    }

    const numericRating = Number(rating);
    if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 5) {
      return next(ApiError.badRequest('Rating must be between 1 and 5'));
    }

    if (!String(comment || '').trim()) {
      return next(ApiError.badRequest('Review comment is required'));
    }

    const [product, purchased, existingReview] = await Promise.all([
      Product.findOne({ _id: productId, isActive: true }).select('_id').lean(),
      hasPurchasedProduct(req.user._id, productId),
      Review.findOne({ user: req.user._id, product: productId }).select('_id').lean(),
    ]);

    if (!product) {
      return next(ApiError.notFound('Product not found'));
    }

    if (!purchased) {
      return next(ApiError.forbidden('You can review only products you purchased and received'));
    }

    if (existingReview) {
      return next(ApiError.badRequest('You have already reviewed this product'));
    }

    const review = await Review.create({
      user: req.user._id,
      product: productId,
      rating: numericRating,
      title,
      comment,
    });

    const populated = await Review.findById(review._id).populate('user', 'name').lean();

    res.status(201).json({
      success: true,
      data: populated,
      message: 'Review submitted successfully',
    });
  } catch (error) {
    if (error.code === 11000) {
      return next(ApiError.badRequest('You have already reviewed this product'));
    }
    next(error);
  }
};
