// Cosmetic labels for the preset gift price tiers — purely presentational,
// the backend only ever sees a dollar amount (see split_gift() in gift.py).
const STICKERS = {
  5: { emoji: "🌹", name: "Rose" },
  10: { emoji: "☕", name: "Coffee" },
  20: { emoji: "💐", name: "Bouquet" },
  50: { emoji: "💎", name: "Diamond" },
  100: { emoji: "👑", name: "Crown" },
  200: { emoji: "🏆", name: "Trophy" },
};

export const stickerFor = (amount) =>
  STICKERS[amount] ?? { emoji: "🎁", name: `$${amount}` };
