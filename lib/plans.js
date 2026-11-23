// Central pricing config — the ONLY place subscription prices live.
// Edit here and the whole SaaS (billing, dashboard, wallet) follows.

export const PLANS = {
  currency: 'BDT',
  cycleDays: 30,
  graceDays: 5,
  dueSoonDays: 3,
  // Fixed tiers for the first pages, then a flat per-extra-page price.
  tiers: { 1: 299, 2: 399, 3: 649 },
  extraPagePrice: 250,
};

export function priceForPageCount(n) {
  const count = Math.max(0, Math.floor(Number(n) || 0));
  if (count === 0) return 0;
  if (PLANS.tiers[count] != null) return PLANS.tiers[count];
  const top = Math.max(...Object.keys(PLANS.tiers).map(Number));
  return PLANS.tiers[top] + (count - top) * PLANS.extraPagePrice;
}
