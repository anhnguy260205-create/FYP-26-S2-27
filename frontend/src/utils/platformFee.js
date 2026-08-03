// Utility functions for calculating platform fees and related information.
export const PLATFORM_FEE_MIN = 4.0;// Minimum platform fee in dollars.
export const PLATFORM_FEE_RATE = 0.001; // 0.1%
// Calculate the platform fee based on the trade value. The fee is the greater of a minimum fee or a percentage of the trade value.
export function calculatePlatformFee(tradeValue) {
  if (!tradeValue || tradeValue <= 0) return 0;
  return Math.round(Math.max(PLATFORM_FEE_MIN, tradeValue * PLATFORM_FEE_RATE) * 100) / 100;
}
// Generate a label for the platform fee, indicating the minimum fee and the percentage rate.
export const PLATFORM_FEE_LABEL = `$${PLATFORM_FEE_MIN.toFixed(2)} min or ${PLATFORM_FEE_RATE * 100
  }%, whichever is higher`;
