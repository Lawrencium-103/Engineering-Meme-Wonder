/**
 * Pricing tiers. All amounts in KOBO (₦1 = 100 kobo). Never hard-code prices in UI.
 * Guest limit = number of RSVP records; 1 RSVP = 1 slot, no plus-ones.
 *
 * Flat-cap model: every tier has a fixed guest cap and a single price.
 * FREE is the branded acquisition tier; paid tiers remove branding and
 * raise the cap. Upgrades charge only the difference already paid.
 */

export type TierId = "FREE" | "CLASSIC" | "GRAND" | "EPIC";

export interface Tier {
  id: TierId;
  label: string;
  minGuests: number;
  maxGuests: number;
  basePriceMinor: number;
  /** FREE shows Aravow branding (public footer + pass watermark). */
  branded: boolean;
}

export const TIERS: Record<TierId, Tier> = {
  FREE: {
    id: "FREE",
    label: "Free",
    minGuests: 1,
    maxGuests: 30,
    basePriceMinor: 0,
    branded: true,
  },
  CLASSIC: {
    id: "CLASSIC",
    label: "Classic",
    minGuests: 31,
    maxGuests: 100,
    basePriceMinor: 2_499_000, // ₦24,990
    branded: false,
  },
  GRAND: {
    id: "GRAND",
    label: "Grand",
    minGuests: 101,
    maxGuests: 250,
    basePriceMinor: 4_999_000, // ₦49,990
    branded: false,
  },
  EPIC: {
    id: "EPIC",
    label: "Epic",
    minGuests: 251,
    maxGuests: 500,
    basePriceMinor: 9_999_000, // ₦99,990
    branded: false,
  },
};

/** Tier order for pickers / landing (cheapest → most expensive). */
export const TIER_ORDER: TierId[] = ["FREE", "CLASSIC", "GRAND", "EPIC"];

/** A new draft defaults to FREE; paid tiers are chosen at publish/upgrade. */
export const DEFAULT_TIER: TierId = "FREE";

export const NGN = "NGN";

/** Guest cap granted on the free tier (also the draft placeholder cap). */
export const FREE_GUEST_CAP = TIERS.FREE.maxGuests;

/** Templates free-tier events may use. Anything else requires a paid tier. */
export const FREE_TEMPLATE_IDS = ["NG-004", "NG-005", "NG-006"];

export function isTemplateFree(id: string): boolean {
  return FREE_TEMPLATE_IDS.includes(id);
}

/** Whether a tier carries Aravow branding (free tier only). */
export function isBranded(tier: TierId): boolean {
  return TIERS[tier].branded;
}

/**
 * Coerce a stored / legacy tier string to a valid TierId.
 * Legacy "INTIMATE" (30 guests) maps to FREE (same cap, no live payments to
 * honour). Unknown values fall back to CLASSIC so nothing renders broken.
 */
export function normalizeTier(raw: string): TierId {
  if (raw === "FREE" || raw === "CLASSIC" || raw === "GRAND" || raw === "EPIC") return raw;
  if (raw === "INTIMATE") return "FREE";
  return "CLASSIC";
}

/** Format kobo to ₦ display string. */
export function formatNaira(minor: number): string {
  return `₦${(minor / 100).toLocaleString("en-NG")}`;
}

/** Which tier fits a desired guest count. */
export function tierForGuests(guests: number): Tier {
  if (guests <= TIERS.FREE.maxGuests) return TIERS.FREE;
  if (guests <= TIERS.CLASSIC.maxGuests) return TIERS.CLASSIC;
  if (guests <= TIERS.GRAND.maxGuests) return TIERS.GRAND;
  return TIERS.EPIC;
}

/** Guest cap for a tier (flat — every tier has a fixed cap). */
export function capForTier(tier: TierId): number {
  return TIERS[tier].maxGuests;
}

/** Price in kobo for a tier (flat — cap does not change the price). */
export function priceForCap(tier: TierId): number {
  return TIERS[tier].basePriceMinor;
}

/**
 * Amount (kobo) for moving an event to a tier.
 * For upgrades: charge only the positive difference between what was already
 * paid (sum of SUCCESS payments) and the new tier price.
 */
export function upgradeAmountMinor(
  tier: TierId,
  paidSoFarMinor: number,
): { cap: number; amountMinor: number; isUpgrade: boolean } {
  const cap = capForTier(tier);
  const full = priceForCap(tier);
  const amountMinor = Math.max(0, full - paidSoFarMinor);
  return { cap, amountMinor, isUpgrade: paidSoFarMinor > 0 };
}

export function tierLabel(tier: TierId): string {
  return TIERS[tier].label;
}
