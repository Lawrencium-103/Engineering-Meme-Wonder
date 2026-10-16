import { normalizeTier, TIERS, formatNaira, type TierId } from "./pricing";

/**
 * Agent compensation plan.
 *
 * Every plan a referred couple sits on earns the agent points. Free sign-ups
 * still count (they grow the funnel) but pay little, while the big paid
 * plans carry the real weight: an agent moving 2 paid + 8 free plans earns
 * strictly less than one moving 3 or more bigger plans.
 *
 *   FREE    ₦0       → 0.5 pts
 *   CLASSIC ₦24,990  → 2 pts
 *   GRAND   ₦49,990  → 4 pts
 *   EPIC    ₦99,990  → 6 pts
 *
 * Payout rule:
 *   - 10 or more points: ₦40,000 bonus plus 15% commission on everything sold.
 *   - Below 10 points: 15% commission only.
 *
 * Worked outcomes (all amounts in kobo internally, shown in naira):
 *   8 free + 2 classic = 4 + 4 = 8 pts. 15% of ₦49,980 = ₦7,497. No bonus.
 *   1 epic + 1 grand  = 6 + 4 = 10 pts. 15% of ₦149,980 = ₦22,497 plus ₦40,000 bonus.
 *   2 grand + 1 classic = 8 + 2 = 10. 15% of ₦124,970 = ₦18,745.50 plus ₦40,000 bonus.
 */

export const POINTS_TARGET = 10;

export const PLAN_POINTS: Record<TierId, number> = {
  FREE: 0.5,
  CLASSIC: 2,
  GRAND: 4,
  EPIC: 6,
};

/** ₦40,000 in kobo — paid once the points target is hit. */
export const BONUS_MINOR = 4_000_000;

/** 15% commission on everything the agent sold. */
export const COMMISSION_RATE = 0.15;

/** Points for one event sitting on the given tier (legacy-safe). */
export function pointsForTier(tier: string): number {
  return PLAN_POINTS[normalizeTier(tier)];
}

/** Price of one plan in kobo (for the earnings table). */
export function planPriceMinor(tier: TierId): number {
  return TIERS[tier].basePriceMinor;
}

export interface Payout {
  points: number;
  target: number;
  qualifies: boolean;
  pointsToGo: number;
  salesMinor: number;
  commissionMinor: number;
  bonusMinor: number;
  totalMinor: number;
}

/** Full payout breakdown from total points + total SUCCESS sales (kobo). */
export function payoutFor(points: number, salesMinor: number): Payout {
  const qualifies = points >= POINTS_TARGET;
  const commissionMinor = Math.round(salesMinor * COMMISSION_RATE);
  const bonusMinor = qualifies ? BONUS_MINOR : 0;
  return {
    points,
    target: POINTS_TARGET,
    qualifies,
    pointsToGo: Math.max(0, POINTS_TARGET - points),
    salesMinor,
    commissionMinor,
    bonusMinor,
    totalMinor: commissionMinor + bonusMinor,
  };
}

/** "8 pts" / "8.5 pts" display. */
export function formatPoints(points: number): string {
  return `${points} pt${points === 1 ? "" : "s"}`;
}

export { formatNaira };
