const Order = require('../models/Order');
const { Promotion, PROMOTION_TYPES, DISCOUNT_TYPES } = require('../models/Promotion');

const round2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const isPromotionActiveNow = (promotion, now) => {
  const start = new Date(promotion.startDate).getTime();
  const end = new Date(promotion.endDate).getTime();
  return promotion.isActive && start <= now.getTime() && now.getTime() <= end;
};

const toIdString = (value) => String(value || '');

const buildItemEligibility = (promotion, item) => {
  const productId = toIdString(item.product?._id || item.product);
  const categoryId = toIdString(item.product?.category?._id || item.product?.category);

  const hasProductFilter = (promotion.eligibleProducts || []).length > 0;
  const hasCategoryFilter = (promotion.eligibleCategories || []).length > 0;

  const productEligible = !hasProductFilter || promotion.eligibleProducts.some((id) => toIdString(id) === productId);
  const categoryEligible = !hasCategoryFilter || promotion.eligibleCategories.some((id) => toIdString(id) === categoryId);

  return productEligible && categoryEligible;
};

const computePercentageOrFixedDiscount = ({ promotion, applicableSubtotal }) => {
  let discount = 0;

  if (promotion.discountType === DISCOUNT_TYPES.PERCENTAGE) {
    discount = (applicableSubtotal * Number(promotion.discountValue || 0)) / 100;
  } else {
    discount = Number(promotion.discountValue || 0);
  }

  if (Number(promotion.maxDiscount || 0) > 0) {
    discount = Math.min(discount, Number(promotion.maxDiscount));
  }

  return round2(Math.max(0, discount));
};

const evaluatePromotion = ({ promotion, context }) => {
  const { items, subtotal, orderCount } = context;

  if (!isPromotionActiveNow(promotion, context.now)) {
    return null;
  }

  if (subtotal <= 0) {
    return null;
  }

  if (Number(promotion.minOrderAmount || 0) > subtotal) {
    return null;
  }

  if (promotion.type === PROMOTION_TYPES.FIRST_ORDER && orderCount > 0) {
    return null;
  }

  const eligibleItems = items.filter((item) => buildItemEligibility(promotion, item));
  if (
    [PROMOTION_TYPES.CATEGORY_DISCOUNT, PROMOTION_TYPES.BUY_ONE_GET_ONE, PROMOTION_TYPES.FLASH_SALE].includes(promotion.type) &&
    eligibleItems.length === 0
  ) {
    return null;
  }

  let discount = 0;
  const metadata = {};

  if (promotion.type === PROMOTION_TYPES.BUY_ONE_GET_ONE) {
    let bogoDiscount = 0;
    let freeUnits = 0;

    for (const item of eligibleItems) {
      const qty = Number(item.quantity || 0);
      const freeQty = Math.floor(qty / 2);
      if (freeQty <= 0) continue;

      const price = Number(item.product?.price || item.price || 0);
      bogoDiscount += freeQty * price;
      freeUnits += freeQty;
    }

    discount = round2(bogoDiscount);
    metadata.freeUnits = freeUnits;
  } else {
    let applicableSubtotal = subtotal;

    if ([PROMOTION_TYPES.CATEGORY_DISCOUNT, PROMOTION_TYPES.FLASH_SALE].includes(promotion.type)) {
      applicableSubtotal = eligibleItems.reduce((sum, item) => {
        const price = Number(item.product?.price || item.price || 0);
        return sum + price * Number(item.quantity || 0);
      }, 0);
    }

    discount = computePercentageOrFixedDiscount({ promotion, applicableSubtotal });
    metadata.applicableSubtotal = round2(applicableSubtotal);
  }

  discount = Math.min(round2(discount), round2(subtotal));

  if (discount <= 0) {
    return null;
  }

  return {
    promotion,
    discount,
    metadata,
  };
};

const calculatePromotionsForItems = async ({ userId, items, subtotal }) => {
  const now = new Date();
  const orderCount = await Order.countDocuments({ user: userId });

  const activePromotions = await Promotion.find({
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
  }).lean();

  const evaluations = activePromotions
    .map((promotion) => evaluatePromotion({ promotion, context: { userId, items, subtotal, now, orderCount } }))
    .filter(Boolean)
    .sort((left, right) => right.discount - left.discount);

  if (evaluations.length === 0) {
    return {
      promotionDiscount: 0,
      appliedPromotions: [],
      strategy: 'none',
    };
  }

  const bestSingle = evaluations[0];
  const combinablePromotions = evaluations.filter((item) => item.promotion.combinable);

  const combinedDiscountRaw = combinablePromotions.reduce((sum, item) => sum + item.discount, 0);
  const combinedDiscount = Math.min(round2(combinedDiscountRaw), round2(subtotal));

  const singleDiscount = Math.min(round2(bestSingle.discount), round2(subtotal));

  const useCombinable = combinablePromotions.length > 1 && combinedDiscount > singleDiscount;
  const selected = useCombinable ? combinablePromotions : [bestSingle];

  return {
    promotionDiscount: useCombinable ? combinedDiscount : singleDiscount,
    appliedPromotions: selected.map((entry) => ({
      promotionId: entry.promotion._id,
      promotionName: entry.promotion.promotionName,
      type: entry.promotion.type,
      discountType: entry.promotion.discountType,
      discountValue: entry.promotion.discountValue,
      discountAmount: round2(entry.discount),
      combinable: Boolean(entry.promotion.combinable),
      metadata: entry.metadata || {},
    })),
    strategy: useCombinable ? 'combinable' : 'single-best',
  };
};

const recordPromotionUsage = async (appliedPromotions = []) => {
  if (!Array.isArray(appliedPromotions) || appliedPromotions.length === 0) {
    return;
  }

  const operations = appliedPromotions
    .filter((promo) => promo.promotionId)
    .map((promo) => ({
      updateOne: {
        filter: { _id: promo.promotionId },
        update: {
          $inc: {
            usageCount: 1,
            totalOrders: 1,
            totalDiscountGiven: round2(promo.discountAmount || 0),
          },
        },
      },
    }));

  if (operations.length > 0) {
    await Promotion.bulkWrite(operations);
  }
};

module.exports = {
  calculatePromotionsForItems,
  recordPromotionUsage,
  PROMOTION_TYPES,
  DISCOUNT_TYPES,
};
