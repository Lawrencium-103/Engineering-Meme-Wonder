import QRCode from "qrcode";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { appUrl } from "./auth";
import { blurredUrl } from "./cloudinary";
import { pickReadable } from "./contrast";
import { TEMPLATE_SPECS } from "./flyer/catalog-meta";
import { h, img as imgEl, type El } from "./flyer/h";

/**
 * Access pass generation: Satori (JSX → SVG) + resvg (SVG → PNG).
 * 1080x1920 (9:16).
 *
 * Craft notes:
 * - Type hierarchy mirrors the flyer sections (same faces, same voice):
 *   script for the monogram, small-tracked caps for labels, serif italic
 *   for names, regular sans for body lines.
 * - The couple photo is a soft blurred wash behind the card (Cloudinary
 *   e_blur in production). Satori cannot blur or darken, so `pass-bg.jpg`
 *   exists as a ready-made local backdrop; when only a sharp local hero is
 *   available there is nothing to hide behind — the card then stays opaque
 *   so text is never set over a busy photo.
 * - Minimum text size 28px at this resolution.
 *
 * The pass speaks the couple's design language: its ground + inks come from
 * the curated template they picked in the Studio (NG-001…NG-006), falling
 * back to the house Onyx & Gold look, so every guest's pass matches the
 * wedding invitation they were sent.
 */

const W = 1080;
const H = 1920;

let fontCache: { serif: Buffer; script: Buffer; sans: Buffer } | null = null;

export async function loadFonts() {
  if (fontCache) return fontCache;
  const base = process.cwd() + "/public/fonts";
  const { readFile } = await import("fs/promises");
  const load = async (p: string) => readFile(p);
  fontCache = {
    serif: await load(`${base}/CormorantGaramond-SemiBold.ttf`),
    script: await load(`${base}/GreatVibes-Regular.ttf`),
    sans: await load(`${base}/Inter-Regular.otf`),
  };
  return fontCache;
}

export interface PassData {
  guestFirstName: string;
  guestLastName: string;
  side: "GROOM" | "BRIDE";
  guestCode: string;
  publicToken: string;
  monogram: string;
  groomName: string;
  brideName: string;
  weddingDate: Date;
  timezone: string;
  receptionVenue: string | null;
  heroImageUrl: string | null;
  groomSignatureUrl: string | null;
  brideSignatureUrl: string | null;
  theme: { primary: string; accent: string };
  /** Curated design the couple picked in the Studio — drives the pass palette. */
  templateId?: string;
  /** Free tier carries Aravow branding (small mark under the QR). */
  branded?: boolean;
  /** Couple's wedding hashtag, rendered under the names when set. */
  hashtag?: string;
  /** Host families from the invitation, rendered above the couple (flyer hierarchy). */
  families?: { brideParents?: string; groomParents?: string; introLine?: string };
}

async function qrDataUrl(token: string): Promise<string> {
  const url = `${appUrl()}/p/${token}`;
  // Local qrcode package — no third-party QR API.
  return QRCode.toDataURL(url, {
    width: 360,
    margin: 1,
    color: { dark: "#0B0C10", light: "#FFFFFF" },
  });
}

async function fetchAsDataUrl(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    if (url.startsWith("/")) {
      // Site-relative (dev uploads / bundled art): read from disk on `public/`.
      // Node fetch cannot resolve relative URLs, and self-fetching the dev
      // server risks deadlock — same approach as flyer/photo.ts.
      const { readFile } = await import("fs/promises");
      const path = await import("path");
      const buf = await readFile(path.join(process.cwd(), "public", url));
      const clean = url.split("?")[0].toLowerCase();
      const ext = clean.endsWith(".png")
        ? "png"
        : clean.endsWith(".webp")
          ? "webp"
          : clean.endsWith(".gif")
            ? "gif"
            : "jpeg";
      return `data:image/${ext};base64,${buf.toString("base64")}`;
    }
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const ext = url.includes(".png") ? "png" : "jpeg";
    return `data:image/${ext};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function renderPass(data: PassData): Promise<Buffer> {
  const fonts = await loadFonts();
  const qr = await qrDataUrl(data.publicToken);

  // Backdrop: the blurred delivery URL in production (Cloudinary e_blur),
  // the baked pass-bg.jpg for local marketing shots. A sharp local upload
  // is intentionally NOT used as a backdrop — satori cannot blur or scrim
  // it, so a dark studio portrait would read as a black mourning frame.
  // (The couple's photo still appears on the guest page hero + flyer card.)
  const heroUrl = data.heroImageUrl?.includes("/upload/")
    ? blurredUrl(data.heroImageUrl)
    : data.heroImageUrl?.includes("marketing/")
      ? `${appUrl()}/marketing/pass-bg.jpg`
      : null;
  const [hero, groomSig, brideSig] = await Promise.all([
    fetchAsDataUrl(heroUrl),
    fetchAsDataUrl(data.groomSignatureUrl),
    fetchAsDataUrl(data.brideSignatureUrl),
  ]);

  const dateStr = new Intl.DateTimeFormat("en-NG", {
    timeZone: data.timezone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(data.weddingDate);

  const fullName = `${data.guestFirstName} ${data.guestLastName}`;
  const sideLabel = data.side === "GROOM" ? "GROOM'S GUEST" : "BRIDE'S GUEST";

  // The pass speaks the couple's design language: ground + inks come from the
  // template they chose in the Studio (falling back to the house Onyx & Gold),
  // with their own theme colours preferred wherever they stay legible on the
  // template's ground — same pickReadable contract the flyer templates use.
  const spec =
    TEMPLATE_SPECS.find((s) => s.id === data.templateId) ??
    TEMPLATE_SPECS.find((s) => s.id === "NG-004")!;
  const ground = spec.palette.background;
  // Over a blurred photo wash the text needs a veil: keep the template's
  // ground as the scrim when it is light (ivory paper), lift to a dusk ink
  // when the ground is dark (onyx) so the wash never swallows the type.
  const scrim = hero ? (isLight(ground) ? ground : "rgba(11,12,16,0.72)") : ground;
  const gold = pickReadable(scrim, [data.theme.primary, spec.palette.primary], spec.palette.primary);
  const accent = pickReadable(scrim, [data.theme.accent, spec.palette.accent], spec.palette.accent);
  const ink = pickReadable(scrim, [spec.palette.text], "#F9F8F6");

  // Host family lines (flyer hierarchy): parents first, then the intro line.
  // Parents read in the plain sans; the intro line leans into the serif
  // italic, exactly like the flyer cards. All centred, all full-width.
  const hostLines: El[] = [];
  if (data.families?.brideParents) {
    hostLines.push(
      h(
        "div",
        {
          fontSize: 30,
          color: ink,
          marginTop: 18,
          fontFamily: "Inter",
          textAlign: "center",
          width: "100%",
          lineHeight: 1.4,
        },
        data.families.brideParents,
      ),
    );
  }
  if (data.families?.groomParents) {
    hostLines.push(
      h(
        "div",
        {
          fontSize: 30,
          color: ink,
          marginTop: 8,
          fontFamily: "Inter",
          textAlign: "center",
          width: "100%",
          lineHeight: 1.4,
        },
        data.families.groomParents,
      ),
    );
  }
  if (data.families?.introLine) {
    hostLines.push(
      h(
        "div",
        {
          fontSize: 30,
          fontStyle: "italic",
          color: accent,
          marginTop: 12,
          fontFamily: "Cormorant Garamond",
          textAlign: "center",
          width: "100%",
          lineHeight: 1.35,
        },
        data.families.introLine,
      ),
    );
  }

  // Hairline rule with a centred diamond — the flyer's lozenge divider,
  // redrawn inline so the pass needs no new shared component.
  const rule = (color: string, width = 250) =>
    h(
      "div",
      {
        width,
        height: 9,
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

  // Full-bleed invitation: the content column is the full canvas height
  // (inside the frame) and spreads top → guest → foot with space-between,
  // so the composition always fills 1080×1920 instead of floating mid-card.
  const card = (children: unknown) =>
    h(
      "div",
      {
        position: "relative",
        width: W,
        height: H,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: ground,
        overflow: "hidden",
      },
      [
        ...(hero
          ? [
              {
                type: "img",
                props: {
                  src: hero,
                  width: W,
                  height: H,
                  style: {
                    position: "absolute",
                    left: 0,
                    top: 0,
                    width: W,
                    height: H,
                    objectFit: "cover",
                  },
                },
              },
              // Paper veil: the photo is atmosphere, never the page the type
              // sits on. Opaque ground over the wash, frame + text above it.
              h(
                "div",
                {
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: W,
                  height: H,
                  backgroundColor: scrim,
                  opacity: isLight(ground) ? 0.88 : 1,
                },
                undefined,
              ),
            ]
          : []),
        h(
          "div",
          {
            position: "absolute",
            left: 44,
            top: 44,
            width: W - 88,
            height: H - 88,
            border: `3px solid ${gold}`,
          },
          undefined,
        ),
        h(
          "div",
          {
            position: "absolute",
            left: 62,
            top: 62,
            width: W - 124,
            height: H - 124,
            border: `1px solid ${accent}`,
            opacity: 0.55,
          },
          undefined,
        ),
        h(
          "div",
          {
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            height: "100%",
            paddingTop: 150,
            paddingBottom: 130,
            paddingLeft: 128,
            paddingRight: 128,
          },
          children,
        ),
      ],
    );

  const top = h(
    "div",
    { display: "flex", flexDirection: "column", alignItems: "center", width: "100%" },
    [
      h("div", { fontSize: 56, color: gold, fontFamily: "Great Vibes", lineHeight: 1 }, data.monogram),
      ...(hostLines.length > 0
        ? hostLines
        : [
            h(
              "div",
              {
                fontSize: 28,
                letterSpacing: "6px",
                color: accent,
                marginTop: 18,
                fontFamily: "Inter",
                textAlign: "center",
              },
              "THE WEDDING CELEBRATION OF",
            ),
          ]),
      h(
        "div",
        {
          fontSize: 76,
          color: ink,
          marginTop: 16,
          fontFamily: "Cormorant Garamond",
          textAlign: "center",
          lineHeight: 1.1,
        },
        `${data.groomName} & ${data.brideName}`,
      ),
      ...(data.hashtag
        ? [
            h(
              "div",
              {
                fontSize: 28,
                letterSpacing: "3px",
                color: accent,
                marginTop: 16,
                fontFamily: "Inter",
                textAlign: "center",
              },
              data.hashtag,
            ),
          ]
        : []),
    ],
  );

  const guest = h(
    "div",
    { display: "flex", flexDirection: "column", alignItems: "center", width: "100%" },
    [
      rule(gold),
      h(
        "div",
        {
          fontSize: 28,
          letterSpacing: "6px",
          color: accent,
          fontFamily: "Inter",
          textAlign: "center",
          marginTop: 28,
        },
        "CORDIALLY INVITING",
      ),
      h(
        "div",
        {
          fontSize: 64,
          color: ink,
          marginTop: 14,
          fontFamily: "Cormorant Garamond",
          textAlign: "center",
        },
        fullName,
      ),
      h(
        "div",
        {
          marginTop: 26,
          padding: "14px 36px",
          border: `1px solid ${gold}`,
          borderRadius: 999,
          fontSize: 28,
          letterSpacing: "4px",
          color: gold,
          fontFamily: "Inter",
        },
        sideLabel,
      ),
    ],
  );

  const sigRow = h(
    "div",
    { display: "flex", justifyContent: "space-between", alignItems: "flex-end", width: "100%", marginTop: 44 },
    [
      sigBlock(groomSig, "Groom", gold),
      h("div", { fontSize: 28, color: accent, fontFamily: "Great Vibes" }, "with love"),
      sigBlock(brideSig, "Bride", gold),
    ],
  );

  const bottom = h(
    "div",
    { display: "flex", flexDirection: "column", alignItems: "center", width: "100%" },
    [
      rule(gold),
      h(
        "div",
        { fontSize: 34, color: ink, fontFamily: "Cormorant Garamond", textAlign: "center", marginTop: 28 },
        dateStr,
      ),
      ...(data.receptionVenue
        ? [
            h(
              "div",
              {
                fontSize: 28,
                color: accent,
                marginTop: 10,
                fontFamily: "Inter",
                textAlign: "center",
                lineHeight: 1.4,
              },
              data.receptionVenue,
            ),
          ]
        : []),
      imgEl(qr, 300, 300, { marginTop: 36, borderRadius: 12 }),
      h(
        "div",
        { fontSize: 34, letterSpacing: "6px", color: ink, marginTop: 20, fontFamily: "Inter" },
        data.guestCode,
      ),
      ...(data.branded
        ? [
            h(
              "div",
              {
                fontSize: 26,
                letterSpacing: "3px",
                color: accent,
                marginTop: 18,
                fontFamily: "Inter",
                textAlign: "center",
              },
              "Crafted with Aravow",
            ),
          ]
        : []),
      sigRow,
    ],
  );

  const outer = card([top, guest, bottom]);

  const svg = await satori(outer as never, {
    width: W,
    height: H,
    fonts: [
      { name: "Cormorant Garamond", data: fonts.serif, weight: 600, style: "normal" },
      { name: "Great Vibes", data: fonts.script, weight: 400, style: "normal" },
      { name: "Inter", data: fonts.sans, weight: 400, style: "normal" },
    ],
  });

  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: W } });
  return Buffer.from(resvg.render().asPng());
}

function isLight(hex: string): boolean {
  // Relative luminance of a #rrggbb ground — decides whether the veil can be
  // the paper itself or must lift to a dusk ink for legibility.
  const m = hex.replace("#", "");
  if (m.length < 6) return true;
  const r = parseInt(m.slice(0, 2), 16) / 255;
  const g = parseInt(m.slice(2, 4), 16) / 255;
  const b = parseInt(m.slice(4, 6), 16) / 255;
  const f = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b) > 0.35;
}

function sigBlock(src: string | null, label: string, gold: string): El {
  return h(
    "div",
    { display: "flex", flexDirection: "column", alignItems: "center", width: 280 },
    src
      ? [
          { type: "img", props: { src, width: 220, height: 90, style: { objectFit: "contain" } } },
          h(
            "div",
            { fontSize: 28, color: gold, marginTop: 8, fontFamily: "Inter", letterSpacing: "3px" },
            label.toUpperCase(),
          ),
        ]
      : [h("div", { fontSize: 56, color: gold, fontFamily: "Great Vibes", lineHeight: 1.2 }, label)],
  );
}
