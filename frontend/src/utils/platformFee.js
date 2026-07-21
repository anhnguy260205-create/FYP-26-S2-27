// Platform commission — display only.
//
// These constants MIRROR the server (backend/app/control/services/trading_engine.py:
// PLATFORM_FEE_MIN / PLATFORM_FEE_RATE). The server always recomputes the fee it
// actually charges, so a drift here shows a wrong preview but can't cause a wrong
// charge. Still, change both together.
//
// Fee = whichever is GREATER of the flat minimum and the percentage of trade value.

export const PLATFORM_FEE_MIN = 4.0;
export const PLATFORM_FEE_RATE = 0.001; // 0.1%

export function calculatePlatformFee(tradeValue) {
  if (!tradeValue || tradeValue <= 0) return 0;
  return Math.round(Math.max(PLATFORM_FEE_MIN, tradeValue * PLATFORM_FEE_RATE) * 100) / 100;
}

export const PLATFORM_FEE_LABEL = `$${PLATFORM_FEE_MIN.toFixed(2)} min or ${
  PLATFORM_FEE_RATE * 100
}%, whichever is higher`;
