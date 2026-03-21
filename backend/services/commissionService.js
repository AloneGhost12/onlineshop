const round2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const calculateCommissionBreakdown = ({ price, quantity, commissionPercentage = 0 }) => {
  const itemSubtotal = Number(price) * Number(quantity);
  const percentage = Math.max(0, Number(commissionPercentage || 0));

  const platformRevenue = round2(itemSubtotal * (percentage / 100));
  const sellerRevenue = round2(itemSubtotal - platformRevenue);

  return {
    itemSubtotal: round2(itemSubtotal),
    platformRevenue,
    sellerRevenue,
  };
};

module.exports = {
  round2,
  calculateCommissionBreakdown,
};
