/**
 * Reduce a balance to specified precision
 * @param {number} amount - Amount to reduce
 * @param {number} precision - Decimal precision
 * @returns {number} Reduced balance
 */
export const reduceBalance = (amount, precision = 12) => {
  if (isNaN(amount)) return 0;
  const factor = Math.pow(10, precision);
  return Math.floor(amount * factor) / factor;
};
