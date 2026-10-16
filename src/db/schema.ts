import {
  pgTable,
  text,
  timestamp,
  integer,
  jsonb,
  boolean,
  pgEnum,
  customType,
  date,
  index,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// citext for case-insensitive emails
const citext = customType<{ data: string; driverData: string }>({
  dataType() {
    return "citext";
  },
});

export const eventStatus = pgEnum("event_status", [
  "DRAFT",
  "PENDING_PAYMENT",
  "PUBLISHED",
  "ARCHIVED",
]);

export const ceremonyKind = pgEnum("ceremony_kind", [
  "TRADITIONAL",
  "COURT",
  "RELIGIOUS",
  "RECEPTION",
]);

export const guestSide = pgEnum("guest_side", ["GROOM", "BRIDE"]);

export const paymentStatus = pgEnum("payment_status", [
  "PENDING",
  "SUCCESS",
  "FAILED",
  "REFUNDED",
]);

/**
 * Sales agents. Each gets a unique human-friendly code (AV-01-SWT) they hand
 * to couples at sign-up; the code links every future sale back to them.
 */
export const agents = pgTable(
  "agents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    /** Human-friendly code handed to couples, e.g. AV-01-SWT. */
    code: text("code").notNull(),
    /** Monotonic number embedded in the code (AV-01-…, AV-02-…). */
    seq: integer("seq").notNull(),
    name: text("name").notNull(),
    email: citext("email").notNull().unique(),
    phone: text("phone"),
    /** Deactivated agents' codes stop validating at sign-up. */
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("agents_code_unique").on(t.code),
    uniqueIndex("agents_seq_unique").on(t.seq),
  ],
);

export const accounts = pgTable("accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: citext("email").notNull().unique(),
  /**
   * Sales agent who referred this couple (their Customer Service ID at
   * sign-up). First-touch: set once, never overwritten.
   */
  referredByAgentId: uuid("referred_by_agent_id").references(() => agents.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const events = pgTable(
  "events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => accounts.id),
    status: eventStatus("status").notNull().default("DRAFT"),
    // NULL until publish; UNIQUE enforced at DB level
    slug: text("slug"),
    timezone: text("timezone").notNull().default("Africa/Lagos"),
    monogram: text("monogram").notNull(),
    groomName: text("groom_name").notNull(),
    brideName: text("bride_name").notNull(),
    weddingDate: date("wedding_date").notNull(),
    groomSeq: integer("groom_seq").notNull().default(0),
    brideSeq: integer("bride_seq").notNull().default(0),
    guestCap: integer("guest_cap").notNull(),
    tier: text("tier").notNull(),
    theme: jsonb("theme").$type<{
      primary: string;
      accent: string;
      /** Hero photo crop: object-position percentages + zoom. */
      heroCrop?: { x: number; y: number; zoom: number };
    }>(),
    /**
     * Invitation-flyer content (Phase B). Everything the curated templates
     * render beyond the core names/date/theme: family lines, invitation
     * message, colours-of-the-day, scripture, RSVP contacts, hashtag and the
     * chosen template id. Nullable so old rows keep working; merge with
     * defaults on read.
     */
    flyer: jsonb("flyer").$type<{
      hashtag?: string;
      invitationMessage?: string;
      families?: { introLine?: string; brideParents?: string; groomParents?: string };
      palette?: Array<{ label: string; hex: string }>;
      scripture?: string;
      closingMessage?: string;
      rsvpContacts?: Array<{ name: string; phone: string }>;
      templateId?: string;
      nameFont?: string;
    }>(),
    heroImageUrl: text("hero_image_url"),
    groomSignatureUrl: text("groom_signature_url"),
    brideSignatureUrl: text("bride_signature_url"),
    story: text("story"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("events_slug_unique").on(t.slug)],
);

export const ceremonies = pgTable(
  "ceremonies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    kind: ceremonyKind("kind").notNull(),
    venueName: text("venue_name").notNull(),
    address: text("address"),
    mapsUrl: text("maps_url"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    dressCode: text("dress_code"),
    isRequired: boolean("is_required").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("ceremonies_event_idx").on(t.eventId)],
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(), // 'paystack'
    providerRef: text("provider_ref").notNull(),
    amountMinor: integer("amount_minor").notNull(),
    currency: text("currency").notNull().default("NGN"),
    status: paymentStatus("status").notNull().default("PENDING"),
    raw: jsonb("raw"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("payments_provider_ref_unique").on(t.providerRef)],
);

export const guests = pgTable(
  "guests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    side: guestSide("side").notNull(),
    seq: integer("seq").notNull(),
    guestCode: text("guest_code").notNull(),
    publicToken: text("public_token").notNull(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: citext("email"),
    phone: text("phone"),
    dietary: text("dietary"),
    /** Total people in this party (guest + plus-ones). Caps count people, not rows. */
    partySize: integer("party_size").notNull().default(1),
    passImageUrl: text("pass_image_url"),
    checkedInAt: timestamp("checked_in_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("guests_event_side_seq_unique").on(t.eventId, t.side, t.seq),
    uniqueIndex("guests_guest_code_unique").on(t.eventId, t.guestCode),
    uniqueIndex("guests_public_token_unique").on(t.publicToken),
  ],
);

/** One gift promise per guest; resubmitting updates the row. */
export interface PromiseItem {
  kind: "CASH" | "ITEM";
  label: string;
  /** Kobo — present on CASH items only. */
  amountMinor?: number;
  /** Optional guest note (size, colour, message). */
  note?: string;
}

export const giftPromises = pgTable(
  "gift_promises",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    guestId: uuid("guest_id")
      .notNull()
      .references(() => guests.id, { onDelete: "cascade" }),
    items: jsonb("items").$type<PromiseItem[]>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("gift_promises_guest_unique").on(t.guestId),
    index("gift_promises_event_idx").on(t.eventId),
  ],
);
