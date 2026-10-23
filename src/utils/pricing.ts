// Money rules — identical to the original site and to the backend
// (foodie-server src/utils/pricing.js). Keep all three in sync.

export const PROMO = { code: "FOODIE50", minSubtotal: 299, pct: 50, cap: 100 };
export const DELIVERY_FEE = 30;
export const FREE_DELIVERY_ABOVE = 499;

export const inr = (n: number) => "₹" + n.toLocaleString("en-IN");

export interface Breakdown {
  subtotal: number;
  discount: number;
  delivery: number;
  total: number;
}

export function breakdown(subtotal: number, promoApplied: boolean): Breakdown {
  let discount = 0;
  if (promoApplied && subtotal >= PROMO.minSubtotal) {
    discount = Math.min(Math.floor((subtotal * PROMO.pct) / 100), PROMO.cap);
  }
  const delivery = subtotal - discount >= FREE_DELIVERY_ABOVE ? 0 : DELIVERY_FEE;
  return { subtotal, discount, delivery, total: subtotal - discount + delivery };
}
