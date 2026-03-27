const User = require('../models/User');
const { round2 } = require('./commissionService');

const LOYALTY_POINTS_PER_100_INR = 5;
const REFERRER_REWARD_POINTS = 150;
const REFEREE_REWARD_POINTS = 100;

const toNonNegative = (value) => Math.max(0, Number(value || 0));

const calculateEarnedPoints = (totalPrice) => {
  const total = Number(totalPrice || 0);
  return Math.max(0, Math.floor(total / 100) * LOYALTY_POINTS_PER_100_INR);
};

const applyDeliveryRewards = async (order) => {
  if (!order || order.loyaltyRewardProcessed) {
    return { applied: false, reason: 'already-processed' };
  }

  const customer = await User.findById(order.user);
  if (!customer) {
    return { applied: false, reason: 'customer-not-found' };
  }

  const earnedPoints = Math.max(
    toNonNegative(order.loyaltyPointsEarned),
    calculateEarnedPoints(order.totalPrice)
  );

  customer.loyalty = customer.loyalty || {};
  customer.referral = customer.referral || {};

  if (earnedPoints > 0) {
    customer.loyalty.points = toNonNegative(customer.loyalty.points) + earnedPoints;
    customer.loyalty.lifetimePoints = toNonNegative(customer.loyalty.lifetimePoints) + earnedPoints;
  }

  order.loyaltyPointsEarned = earnedPoints;
  order.loyaltyRewardProcessed = true;
  order.loyaltyRewardProcessedAt = new Date();

  const referrerUserId = order.referral?.referrerUserId || customer.referral?.referredBy || null;
  if (referrerUserId && !order.referral?.rewardGranted) {
    const referrer = await User.findById(referrerUserId);

    if (referrer) {
      const referrerRewardPoints = toNonNegative(order.referral?.referrerRewardPoints || REFERRER_REWARD_POINTS);
      const refereeRewardPoints = toNonNegative(order.referral?.refereeRewardPoints || REFEREE_REWARD_POINTS);

      customer.referral.referredBy = customer.referral.referredBy || referrer._id;
      customer.referral.rewardGranted = true;
      customer.loyalty.points = toNonNegative(customer.loyalty.points) + refereeRewardPoints;
      customer.loyalty.lifetimePoints = toNonNegative(customer.loyalty.lifetimePoints) + refereeRewardPoints;
      customer.loyalty.totalReferralBonus = toNonNegative(customer.loyalty.totalReferralBonus) + refereeRewardPoints;

      referrer.loyalty = referrer.loyalty || {};
      referrer.referral = referrer.referral || {};
      referrer.loyalty.points = toNonNegative(referrer.loyalty.points) + referrerRewardPoints;
      referrer.loyalty.lifetimePoints = toNonNegative(referrer.loyalty.lifetimePoints) + referrerRewardPoints;
      referrer.loyalty.totalReferralBonus = toNonNegative(referrer.loyalty.totalReferralBonus) + referrerRewardPoints;
      referrer.referral.successfulReferrals = toNonNegative(referrer.referral.successfulReferrals) + 1;
      referrer.referral.totalReferralRewards = toNonNegative(referrer.referral.totalReferralRewards) + referrerRewardPoints;
      referrer.refreshLoyaltyTier();
      await referrer.save();

      order.referral = {
        ...(order.referral?.toObject ? order.referral.toObject() : order.referral || {}),
        referrerUserId: referrer._id,
        rewardGranted: true,
        referrerRewardPoints,
        refereeRewardPoints,
      };
    }
  }

  customer.refreshLoyaltyTier();
  await customer.save();
  await order.save();

  return { applied: true, earnedPoints };
};

const rollbackDeliveryRewards = async (order) => {
  if (!order || !order.loyaltyRewardProcessed) {
    return { rolledBack: false, reason: 'not-processed' };
  }

  const customer = await User.findById(order.user);
  if (!customer) {
    return { rolledBack: false, reason: 'customer-not-found' };
  }

  customer.loyalty = customer.loyalty || {};
  customer.referral = customer.referral || {};

  const earnedPoints = toNonNegative(order.loyaltyPointsEarned);
  if (earnedPoints > 0) {
    customer.loyalty.points = Math.max(0, toNonNegative(customer.loyalty.points) - earnedPoints);
  }

  if (order.referral?.rewardGranted) {
    const referrerRewardPoints = toNonNegative(order.referral?.referrerRewardPoints || REFERRER_REWARD_POINTS);
    const refereeRewardPoints = toNonNegative(order.referral?.refereeRewardPoints || REFEREE_REWARD_POINTS);

    customer.loyalty.points = Math.max(0, toNonNegative(customer.loyalty.points) - refereeRewardPoints);
    customer.loyalty.totalReferralBonus = Math.max(0, toNonNegative(customer.loyalty.totalReferralBonus) - refereeRewardPoints);
    customer.referral.rewardGranted = false;

    if (order.referral?.referrerUserId) {
      const referrer = await User.findById(order.referral.referrerUserId);
      if (referrer) {
        referrer.loyalty = referrer.loyalty || {};
        referrer.referral = referrer.referral || {};

        referrer.loyalty.points = Math.max(0, toNonNegative(referrer.loyalty.points) - referrerRewardPoints);
        referrer.loyalty.totalReferralBonus = Math.max(0, toNonNegative(referrer.loyalty.totalReferralBonus) - referrerRewardPoints);
        referrer.referral.successfulReferrals = Math.max(0, toNonNegative(referrer.referral.successfulReferrals) - 1);
        referrer.referral.totalReferralRewards = Math.max(0, toNonNegative(referrer.referral.totalReferralRewards) - referrerRewardPoints);
        referrer.refreshLoyaltyTier();
        await referrer.save();
      }
    }

    order.referral = {
      ...(order.referral?.toObject ? order.referral.toObject() : order.referral || {}),
      rewardGranted: false,
      referrerRewardPoints: toNonNegative(order.referral?.referrerRewardPoints || REFERRER_REWARD_POINTS),
      refereeRewardPoints: toNonNegative(order.referral?.refereeRewardPoints || REFEREE_REWARD_POINTS),
    };
  }

  customer.refreshLoyaltyTier();
  await customer.save();

  order.loyaltyRewardProcessed = false;
  order.loyaltyRewardProcessedAt = null;
  await order.save();

  return { rolledBack: true, reversedPoints: round2(earnedPoints) };
};

module.exports = {
  LOYALTY_POINTS_PER_100_INR,
  REFERRER_REWARD_POINTS,
  REFEREE_REWARD_POINTS,
  calculateEarnedPoints,
  applyDeliveryRewards,
  rollbackDeliveryRewards,
};
