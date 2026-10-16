/**
 * Landing-hero demo couple variations.
 *
 * The phone demo cycles one couple per 10s animation loop so the product
 * never reads as one tribe or region — pairs mix Yoruba, Igbo, Hausa and
 * English names. Every text spot in HeroDemo and all three rendered assets
 * (og / card / pass, pre-rendered to public/marketing/variants/) come from
 * this single source so nothing can drift mid-cycle.
 *
 * Typed RSVP field constraints (CSS em caps in hero-demo.css): first name
 * ≤ 5 chars, last name ≤ 6 chars.
 *
 * Regenerate assets after editing: GET /api/marketing/hero-variants
 * (dev-only), then convert the PNGs in public/marketing/variants/ to .webp.
 */
export interface HeroVariant {
  /** Asset file key: public/marketing/variants/{key}-{og,card,pass}.webp */
  key: string;
  groom: string;
  bride: string;
  monogram: string;
  /** Display-only share link in the WhatsApp beat. */
  slug: string;
  /** Couple's local wedding date, YYYY-MM-DD (a Saturday). */
  weddingDate: string;
  /** "Saturday, 12 December 2026" — invitation hero. */
  dateLong: string;
  /** "Friday, 11 December 2026, 10:00" — traditional beat line. */
  tradWhen: string;
  /** "Saturday, 12 December 2026, 16:00" — reception beat line. */
  recvWhen: string;
  /** Traditional venue (matches the card render). */
  tradVenue: string;
  guest: { first: string; last: string };
  /** Pass + celebration + dashboard code for the demo guest. */
  guestCode: string;
  families: { brideParents: string; groomParents: string };
}

export const HERO_VARIANTS: HeroVariant[] = [
  {
    key: "da",
    groom: "Dele",
    bride: "Amaka",
    monogram: "DA",
    slug: "demo-wedding-9kumu",
    weddingDate: "2026-12-12",
    dateLong: "Saturday, 12 December 2026",
    tradWhen: "Friday, 11 December 2026, 10:00",
    recvWhen: "Saturday, 12 December 2026, 16:00",
    tradVenue: "Amaka Family Compound",
    guest: { first: "Tunde", last: "Bakare" },
    guestCode: "G-DA-014",
    families: {
      brideParents: "Mr & Mrs Obiora Nwosu (Onitsha, Anambra State)",
      groomParents: "Chief & Mrs Emeka Okonkwo (Nsukara, Enugu State)",
    },
  },
  {
    key: "sg",
    groom: "Seyi",
    bride: "Grace",
    monogram: "SG",
    slug: "seyi-grace",
    weddingDate: "2026-11-07",
    dateLong: "Saturday, 7 November 2026",
    tradWhen: "Friday, 6 November 2026, 10:00",
    recvWhen: "Saturday, 7 November 2026, 16:00",
    tradVenue: "The Adeyemi Family Home, Ibadan",
    guest: { first: "Mark", last: "Cole" },
    guestCode: "G-SG-014",
    families: {
      brideParents: "Mr & Mrs Richard Cooper (Manchester, United Kingdom)",
      groomParents: "Mr & Mrs Adewale Adeyemi (Ibadan, Oyo State)",
    },
  },
  {
    key: "eh",
    groom: "Emeka",
    bride: "Halima",
    monogram: "EH",
    slug: "emeka-halima",
    weddingDate: "2027-01-23",
    dateLong: "Saturday, 23 January 2027",
    tradWhen: "Friday, 22 January 2027, 10:00",
    recvWhen: "Saturday, 23 January 2027, 16:00",
    tradVenue: "Nwachukwu Family Compound, Awka",
    guest: { first: "Yusuf", last: "Bello" },
    guestCode: "G-EH-014",
    families: {
      brideParents: "Alhaji & Hajiya Musa Bello (Kano State)",
      groomParents: "Chief & Mrs Obiora Nwachukwu (Awka, Anambra State)",
    },
  },
  {
    key: "dz",
    groom: "Daniel",
    bride: "Zainab",
    monogram: "DZ",
    slug: "daniel-zainab",
    weddingDate: "2027-02-14",
    dateLong: "Saturday, 14 February 2027",
    tradWhen: "Friday, 13 February 2027, 10:00",
    recvWhen: "Saturday, 14 February 2027, 16:00",
    tradVenue: "Abubakar Family Residence, Abuja",
    guest: { first: "Peter", last: "Hall" },
    guestCode: "G-DZ-014",
    families: {
      brideParents: "Alhaji & Hajiya Sani Abubakar (Abuja, FCT)",
      groomParents: "Mr & Mrs David Thompson (London, United Kingdom)",
    },
  },
];

/** URLs of a variant's pre-rendered assets. */
export function variantAssets(v: HeroVariant): {
  og: string;
  card: string;
  pass: string;
} {
  const base = `/marketing/variants/${v.key}`;
  return { og: `${base}-og.webp`, card: `${base}-card.webp`, pass: `${base}-pass.webp` };
}
