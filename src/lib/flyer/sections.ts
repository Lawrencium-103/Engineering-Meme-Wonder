import { h, block, img, type El } from "./h";
import { FONT_FAMILIES, nameFontFamily } from "./fonts";
import { CEREMONY_TITLES, type FlyerData } from "./types";

/**
 * Shared, template-agnostic text sections.
 *
 * Every design renders the same CONTENT (monogram, families, couple, ceremonies,
 * palette, scripture, RSVP) and differs only in typography and art. Keeping the
 * builders here means a new template is a hundred lines of art plus a style
 * table — not a 400-line copy of the design next to it.
 *
 * Defaults match NG-001 Royal Burgundy, so a template that passes no style
 * options gets that house style.
 */

export type Align = "center" | "left";

/** Common options every section accepts. */
export interface SectionBase {
  /** Colour for body copy. */
  ink: string;
  /** Horizontal padding inside the section. */
  pad?: number;
  /** "center" (default) or "left", for editorial layouts. */
  align?: Align;
}

const alignItems = (a: Align = "center") => (a === "left" ? "flex-start" : "center");
const textAlign = (a: Align = "center") => (a === "left" ? "left" : "center");

/** A full-width row inside a flowing (space-between) column. */
export function flowRow(children: unknown, extra?: Record<string, unknown>): El {
  return h(
    "div",
    { width: "100%", display: "flex", flexDirection: "column", alignItems: "center", ...extra },
    children,
  );
}

/**
 * Hairline rule with a centred lozenge. Built in the TEXT layer (not the SVG
 * art) so it always falls between two sections, however the content varies.
 */
export function lozengeRule(color: string, width = 250): El {
  return h(
    "div",
    {
      width,
      height: 9,
      marginBottom: 14,
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },
    [
      h("div", { flexGrow: 1, height: 1, backgroundColor: color, opacity: 0.55 }, undefined),
      h(
        "div",
        {
          width: 7,
          height: 7,
          backgroundColor: color,
          transform: "rotate(45deg)",
          marginLeft: 12,
          marginRight: 12,
        },
        undefined,
      ),
      h("div", { flexGrow: 1, height: 1, backgroundColor: color, opacity: 0.55 }, undefined),
    ],
  );
}

/* ------------------------------------------------------------------ *
 * Head blocks — absolutely positioned, because the artwork's ornaments *
 * are pinned to these exact lines.                                     *
 * ------------------------------------------------------------------ */

/** The couple's monogram, in the script face. */
export function monogramBlock(
  data: FlyerData,
  o: { top: number; color: string; size?: number; tracking?: number },
): El | null {
  if (!data.monogram) return null;
  return block(o.top, [
    h(
      "div",
      {
        fontFamily: FONT_FAMILIES.script,
        fontSize: o.size ?? 60,
        lineHeight: 1,
        color: o.color,
        letterSpacing: o.tracking ?? 2,
      },
      data.monogram,
    ),
  ]);
}

/** The event hashtag, e.g. #BLESSOT24. */
export function hashtagBlock(
  data: FlyerData,
  o: { top: number; color: string; size?: number; tracking?: number },
): El | null {
  if (!data.hashtag) return null;
  return block(o.top, [
    h(
      "div",
      {
        fontFamily: FONT_FAMILIES.sans,
        fontSize: o.size ?? 21,
        letterSpacing: o.tracking ?? 7,
        color: o.color,
      },
      data.hashtag,
    ),
  ]);
}

/** Host announcement — both sets of parents, then the line that speaks for them.
 *
 *  Flowing (non-absolute) so `hierarchyBlock` can stack it directly above the
 *  couple's names: the Nigerian invitation hierarchy is hosts FIRST — bride's
 *  parents, then groom's parents, then "…joyfully invite you…" — and the
 *  couple's names come after. Absolute positioning here would let a long
 *  intro line run into the names; flowing cannot.
 */
export function familiesFlow(
  data: FlyerData,
  o: SectionBase & { introSize?: number; nameSize?: number; gap?: number },
): El | null {
  const fam = data.families;
  if (!fam || (!fam.brideParents && !fam.groomParents && !fam.introLine)) return null;

  const lines: El[] = [];
  for (const p of [fam.brideParents, fam.groomParents]) {
    if (p) {
      lines.push(
        h(
          "div",
          { fontFamily: FONT_FAMILIES.serif, fontSize: o.nameSize ?? 28, lineHeight: 1.4, color: o.ink },
          p,
        ),
      );
    }
  }
  if (fam.introLine) {
    lines.push(
      h(
        "div",
        {
          fontFamily: FONT_FAMILIES.serif,
          fontSize: o.introSize ?? 25,
          lineHeight: 1.35,
          color: o.ink,
          opacity: 0.82,
          marginTop: o.gap ?? 10,
        },
        fam.introLine,
      ),
    );
  }
  return h(
    "div",
    {
      width: "100%",
      display: "flex",
      flexDirection: "column",
      alignItems: alignItems(o.align),
      textAlign: textAlign(o.align),
    },
    lines,
  );
}

/** The couple's names — in the picked stylish typeface, joined by an italic ampersand. */
export function coupleRow(
  data: FlyerData,
  o: { primary: string; accent: string; nameSize?: number; ampSize?: number },
): El {
  const nameFace = nameFontFamily(data.nameFont);
  return h(
    "div",
    {
      width: "100%",
      display: "flex",
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      columnGap: 22,
    },
    [
      h(
        "div",
        {
          fontFamily: nameFace,
          fontSize: o.nameSize ?? 88,
          lineHeight: 1.05,
          color: o.primary,
          textAlign: "center",
        },
        data.couple.groom,
      ),
      h(
        "div",
        {
          fontFamily: FONT_FAMILIES.serif,
          fontSize: o.ampSize ?? 54,
          fontStyle: "italic",
          lineHeight: 1.05,
          color: o.accent,
          marginTop: 10,
        },
        "&",
      ),
      h(
        "div",
        {
          fontFamily: nameFace,
          fontSize: o.nameSize ?? 88,
          lineHeight: 1.05,
          color: o.primary,
          textAlign: "center",
        },
        data.couple.bride,
      ),
    ],
  );
}

/**
 * The head hierarchy: hosts (parents + invite line) ABOVE the couple's names,
 * flowed as one block so the two can never collide however long the content.
 * The invitation message ("…request the honour of your presence") hangs
 * directly below the names — the classic order on a Nigerian card.
 */
export function hierarchyBlock(
  data: FlyerData,
  o: {
    top: number;
    ink: string;
    primary: string;
    accent: string;
    introSize?: number;
    familySize?: number;
    nameSize?: number;
    ampSize?: number;
    inviteSize?: number;
    pad?: number;
    gap?: number;
  },
): El {
  const fam = familiesFlow(data, {
    ink: o.ink,
    introSize: o.introSize,
    nameSize: o.familySize,
    gap: o.gap,
  });
  const couple = coupleRow(data, {
    primary: o.primary,
    accent: o.accent,
    nameSize: o.nameSize,
    ampSize: o.ampSize,
  });

  // Guest honour line — "Dear Amara," — rendered above the couple when this
  // card was built for a specific guest (the /p/[token] personal link). The
  // owner preview and generic public card pass no guest, so the line is
  // absent there. Kept in this one chokepoint so every template inherits it.
  const guestEl = data.guest?.firstName
    ? h(
        "div",
        {
          fontFamily: FONT_FAMILIES.serif,
          fontSize: Math.round((o.inviteSize ?? 26) * 1.25),
          fontStyle: "italic",
          lineHeight: 1.2,
          color: o.accent,
          textAlign: "center" as const,
          marginBottom: 14,
        },
        `Dear ${data.guest.firstName},`,
      )
    : null;

  const kids: unknown[] = [];
  if (guestEl) kids.push(guestEl);
  if (fam) {
    kids.push(fam, h("div", { height: o.gap ?? 30 }, undefined), couple);
  } else {
    kids.push(couple);
  }
  if (data.invitationMessage) {
    kids.push(h("div", { height: 18 }, undefined));
    kids.push(
      h(
        "div",
        {
          fontFamily: FONT_FAMILIES.serif,
          fontSize: o.inviteSize ?? 26,
          fontStyle: "italic",
          lineHeight: 1.35,
          color: o.ink,
          opacity: 0.9,
          textAlign: "center",
        },
        data.invitationMessage,
      ),
    );
  }
  return block(o.top, kids, { paddingLeft: o.pad ?? 96, paddingRight: o.pad ?? 96 });
}

/** True when the couple supplied any host/family content. */
export function hasFamilies(data: FlyerData): boolean {
  const fam = data.families;
  return !!fam && !!(fam.brideParents || fam.groomParents || fam.introLine);
}

/**
 * Rough height of `hierarchyBlock` — the layouts use it to push the photo
 * window down when the hosts' block runs long (Satori wraps text; nothing
 * else in the engine can measure). Cormorant's average advance ≈ 0.47em.
 */
export function hierarchyHeight(
  data: FlyerData,
  o: {
    width: number;
    introSize?: number;
    familySize?: number;
    nameSize?: number;
    inviteSize?: number;
    gap?: number;
  },
): number {
  const introSize = o.introSize ?? 25;
  const familySize = o.familySize ?? 28;
  const nameSize = o.nameSize ?? 88;
  const inviteSize = o.inviteSize ?? 26;
  const gap = o.gap ?? 30;
  const estLines = (text: string, size: number) =>
    Math.max(1, Math.ceil((text.length * size * 0.47) / o.width));

  let h = 0;

  // Guest honour line — "Dear {name}," — sits above everything else in the
  // hierarchy block when present, so it must be budgeted for or the photo
  // band overlaps it.
  if (data.guest?.firstName) {
    const guestSize = Math.round(inviteSize * 1.25);
    h += estLines(`Dear ${data.guest.firstName},`, guestSize) * guestSize * 1.2 + 14;
  }

  const fam = data.families;
  if (fam?.brideParents) h += estLines(fam.brideParents, familySize) * familySize * 1.4;
  if (fam?.groomParents) h += estLines(fam.groomParents, familySize) * familySize * 1.4;
  if (fam?.introLine) h += estLines(fam.introLine, introSize) * introSize * 1.35 + (o.gap ?? 10);
  if (h > 0) h += gap;

  // The couple row is a WRAPPING flex line (groom, "&", bride): budget every
  // row it needs, or a long pair pushes the invitation message down onto the
  // photo — exactly the "Together with their families" overlap. Great Vibes'
  // average advance ≈ 0.5em, plus the ampersand and the two 22px column gaps.
  const coupleW =
    (data.couple.groom.length + data.couple.bride.length) * nameSize * 0.5 +
    nameSize * 0.6 +
    44;
  h += Math.max(1, Math.ceil(coupleW / o.width)) * nameSize * 1.05;
  if (data.invitationMessage) {
    h += 18 + estLines(data.invitationMessage, inviteSize) * inviteSize * 1.35;
  }
  return h;
}

/* ------------------------------------------------------------------ *
 * Flowing sections — stacked between two bounds so they can never      *
 * collide, however much content the couple fills in.                   *
 * ------------------------------------------------------------------ */

/** The invitation statement under the couple's names. */
export function invitationSection(
  data: FlyerData,
  o: SectionBase & { size?: number; italic?: boolean },
): El | null {
  if (!data.invitationMessage) return null;
  return flowRow(
    h(
      "div",
      {
        fontFamily: FONT_FAMILIES.serif,
        fontSize: o.size ?? 26,
        fontStyle: o.italic === false ? "normal" : "italic",
        lineHeight: 1.35,
        color: o.ink,
        opacity: 0.9,
        textAlign: textAlign(o.align),
      },
      data.invitationMessage,
    ),
  );
}

/** Ceremonies — title, date · time, venue. Only the ones that exist. */
export function eventsSection(
  data: FlyerData,
  o: SectionBase & {
    primary: string;
    accent: string;
    titleSize?: number;
    dateSize?: number;
    venueSize?: number;
    gap?: number;
    max?: number;
    rule?: boolean;
    ruleWidth?: number;
  },
): El | null {
  if (data.events.length === 0) return null;

  const rows: El[] = [];
  data.events.slice(0, o.max ?? 4).forEach((e, i) => {
    rows.push(
      h(
        "div",
        {
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: alignItems(o.align),
          marginTop: i === 0 ? 0 : (o.gap ?? 12),
        },
        [
          h(
            "div",
            {
              fontFamily: FONT_FAMILIES.sans,
              fontSize: o.titleSize ?? 18,
              letterSpacing: 5,
              color: o.primary,
            },
            (e.title ?? CEREMONY_TITLES[e.kind]).toUpperCase(),
          ),
          h(
            "div",
            { fontFamily: FONT_FAMILIES.serif, fontSize: o.dateSize ?? 24, color: o.ink, marginTop: 3 },
            `${e.date} · ${e.time}`,
          ),
          h(
            "div",
            {
              fontFamily: FONT_FAMILIES.serif,
              fontSize: o.venueSize ?? 22,
              color: o.ink,
              opacity: 0.72,
              marginTop: 1,
            },
            e.venue,
          ),
        ],
      ),
    );
  });

  const head = o.rule === false ? [] : [lozengeRule(o.accent, o.ruleWidth ?? 250)];
  return flowRow([...head, ...rows]);
}

/** Colours of the day — swatch chips with their labels. */
export function paletteSection(
  data: FlyerData,
  o: SectionBase & {
    label?: string;
    eyebrowSize?: number;
    swatchSize?: number;
    swatchLabelSize?: number;
    gap?: number;
    max?: number;
  },
): El | null {
  const swatches = (data.palette ?? []).filter((s) => s.hex);
  if (swatches.length === 0) return null;

  return flowRow([
    h(
      "div",
      {
        fontFamily: FONT_FAMILIES.sans,
        fontSize: o.eyebrowSize ?? 16,
        letterSpacing: 5,
        color: o.ink,
        opacity: 0.6,
      },
      (o.label ?? "COLOURS OF THE DAY").toUpperCase(),
    ),
    h(
      "div",
      {
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "center",
        flexWrap: "wrap",
        gap: o.gap ?? 26,
        marginTop: 10,
      },
      swatches.slice(0, o.max ?? 4).map((s) =>
        h("div", { display: "flex", flexDirection: "column", alignItems: "center" }, [
          h(
            "div",
            {
              width: o.swatchSize ?? 32,
              height: o.swatchSize ?? 32,
              borderRadius: 999,
              backgroundColor: s.hex,
              border: "1px solid rgba(0,0,0,0.15)",
            },
            undefined,
          ),
          h(
            "div",
            {
              fontFamily: FONT_FAMILIES.sans,
              fontSize: o.swatchLabelSize ?? 15,
              letterSpacing: 2,
              color: o.ink,
              opacity: 0.7,
              marginTop: 8,
            },
            s.label.toUpperCase(),
          ),
        ]),
      ),
    ),
  ]);
}

/** Scripture, toast or closing line. */
export function scriptureSection(
  data: FlyerData,
  o: SectionBase & { size?: number; quotes?: boolean; opacity?: number },
): El | null {
  if (!data.scripture) return null;
  return flowRow(
    h(
      "div",
      {
        fontFamily: FONT_FAMILIES.serif,
        fontSize: o.size ?? 22,
        fontStyle: "italic",
        lineHeight: 1.35,
        color: o.ink,
        opacity: o.opacity ?? 0.85,
        textAlign: textAlign(o.align),
      },
      o.quotes === false ? data.scripture : `“${data.scripture}”`,
    ),
  );
}

/** Closing sign-off — "Can't wait to celebrate with you!" — last on the card. */
export function closingSection(
  data: FlyerData,
  o: SectionBase & { size?: number; opacity?: number },
): El | null {
  if (!data.closingMessage) return null;
  return flowRow(
    h(
      "div",
      {
        fontFamily: FONT_FAMILIES.serif,
        fontSize: o.size ?? 24,
        fontStyle: "italic",
        lineHeight: 1.35,
        color: o.ink,
        opacity: o.opacity ?? 0.9,
        textAlign: textAlign(o.align),
      },
      data.closingMessage,
    ),
  );
}

/** RSVP — a rule, the label, then up to three contacts on one line. */
export function rsvpSection(
  data: FlyerData,
  o: SectionBase & {
    accent: string;
    label?: string;
    labelSize?: number;
    valueSize?: number;
    rule?: boolean;
    ruleWidth?: number;
    max?: number;
  },
): El | null {
  if (!data.rsvpContacts || data.rsvpContacts.length === 0) return null;

  const line = data.rsvpContacts
    .slice(0, o.max ?? 3)
    .map((c) => `${c.name} ${c.phone}`.trim())
    .join("   ·   ");

  return flowRow([
    o.rule === false ? h("div", { height: 0 }, undefined) : lozengeRule(o.accent, o.ruleWidth ?? 210),
    h(
      "div",
      {
        fontFamily: FONT_FAMILIES.sans,
        fontSize: o.labelSize ?? 15,
        letterSpacing: 5,
        color: o.accent,
        marginTop: 10,
      },
      (o.label ?? "RSVP").toUpperCase(),
    ),
    h(
      "div",
      {
        fontFamily: FONT_FAMILIES.sans,
        fontSize: o.valueSize ?? 20,
        letterSpacing: 1,
        color: o.ink,
        marginTop: 6,
        textAlign: textAlign(o.align),
      },
      line,
    ),
  ]);
}

/**
 * Stack every non-empty section between two bounds.
 *
 * With enough sections they spread (`space-between`); with only one or two,
 * centring keeps sparse data reading as a deliberate short card rather than a
 * layout with a hole in it.
 */
export function lowerBand(
  sections: (El | null)[],
  band: { top: number; bottom: number; pad?: number },
  denseFrom = 3,
): El | null {
  const lower = sections.filter((s): s is El => s !== null);
  if (lower.length === 0) return null;
  return h(
    "div",
    {
      position: "absolute",
      top: band.top,
      left: 0,
      width: "100%",
      height: band.bottom - band.top,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: lower.length >= denseFrom ? "space-between" : "center",
      paddingLeft: band.pad ?? 118,
      paddingRight: band.pad ?? 118,
      textAlign: "center",
    },
    lower,
  );
}

