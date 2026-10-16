import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import type { PromiseItem } from "@/db/schema";
import { pickReadable } from "./contrast";
import { TEMPLATE_SPECS } from "./flyer/catalog-meta";
import { h, type El } from "./flyer/h";
import { loadFonts } from "./pass";
import { formatNaira, promiseLine } from "./promises";

/**
 * Gift-promise card: 1080×1920 PNG rendered on the fly (never stored — the
 * guest may edit their promise). Speaks the couple's design language (same
 * template palette as the pass + flyer) and carries Aravow branding. Shows
 * ONLY what this guest promised: their name, guest code and item lines.
 */

const W = 1080;
const H = 1920;

export interface PromiseCardData {
  monogram: string;
  groomName: string;
  brideName: string;
  weddingDate: Date;
  theme: { primary: string; accent: string };
  templateId?: string;
  guestFirstName: string;
  guestLastName: string;
  guestCode: string;
  items: PromiseItem[];
}

export async function renderPromiseCard(data: PromiseCardData): Promise<Buffer> {
  const fonts = await loadFonts();

  const spec =
    TEMPLATE_SPECS.find((s) => s.id === data.templateId) ??
    TEMPLATE_SPECS.find((s) => s.id === "NG-004")!;
  const ground = spec.palette.background;
  const gold = pickReadable(ground, [data.theme.primary, spec.palette.primary], spec.palette.primary);
  const accent = pickReadable(ground, [data.theme.accent, spec.palette.accent], spec.palette.accent);
  const ink = pickReadable(ground, [spec.palette.text], "#F9F8F6");

  const dateStr = new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(data.weddingDate);

  const rule = (color: string, width = 260): El =>
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

  // Item lines: label + optional note; cash shows the ₦ amount. Up to 10,
  // then a "+N more" line so the card never overflows.
  const shown = data.items.slice(0, 10);
  const extra = data.items.length - shown.length;
  const itemRows: El[] = shown.map((it) =>
    h(
      "div",
      {
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        marginTop: 26,
      },
      [
        h(
          "div",
          {
            fontSize: 38,
            color: it.kind === "CASH" ? gold : ink,
            fontFamily: "Cormorant Garamond",
            textAlign: "center",
          },
          it.kind === "CASH" ? formatNaira(it.amountMinor ?? 0) : it.label,
        ),
        h(
          "div",
          {
            fontSize: 28,
            color: accent,
            marginTop: 4,
            fontFamily: "Inter",
            textAlign: "center",
          },
          it.kind === "CASH" ? it.label : it.note ? it.note : "\u00A0",
        ),
      ],
    ),
  );
  if (extra > 0) {
    itemRows.push(
      h(
        "div",
        { fontSize: 30, color: accent, marginTop: 26, fontFamily: "Inter", fontStyle: "italic" },
        `+ ${extra} more`,
      ),
    );
  }

  // Thin gold frame, echoing the pass border.
  const frame: El = h("div", { position: "absolute", inset: 36, border: `1px solid ${gold}`, opacity: 0.5 }, undefined);

  const content: El = h(
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
      padding: "0 90px",
      overflow: "hidden",
    },
    [
      frame,
      h(
        "div",
        { fontSize: 96, color: gold, fontFamily: "Great Vibes", lineHeight: 1.1 },
        data.monogram || "AA",
      ),
      h(
        "div",
        {
          fontSize: 28,
          letterSpacing: "8px",
          color: accent,
          marginTop: 18,
          fontFamily: "Inter",
        },
        "A PROMISE OF LOVE",
      ),
      h(
        "div",
        {
          fontSize: 58,
          color: ink,
          fontFamily: "Cormorant Garamond",
          fontStyle: "italic",
          marginTop: 30,
          textAlign: "center",
        },
        `${data.groomName} & ${data.brideName}`,
      ),
      rule(gold),
      h(
        "div",
        { fontSize: 28, letterSpacing: "5px", color: accent, marginTop: 44, fontFamily: "Inter" },
        "PROMISED BY",
      ),
      h(
        "div",
        {
          fontSize: 64,
          color: ink,
          fontFamily: "Cormorant Garamond",
          marginTop: 14,
          textAlign: "center",
        },
        `${data.guestFirstName} ${data.guestLastName}`,
      ),
      h(
        "div",
        { fontSize: 32, letterSpacing: "6px", color: gold, marginTop: 12, fontFamily: "Inter" },
        data.guestCode,
      ),
      h(
        "div",
        { fontSize: 28, color: accent, marginTop: 20, fontFamily: "Inter", fontStyle: "italic" },
        "will present to the couple",
      ),
      rule(gold, 200),
      ...itemRows,
      h(
        "div",
        { position: "absolute", bottom: 90, display: "flex", flexDirection: "column", alignItems: "center" },
        [
          h(
            "div",
            { fontSize: 28, color: ink, opacity: 0.8, fontFamily: "Inter", textAlign: "center" },
            `Promised with love · ${dateStr}`,
          ),
          h(
            "div",
            {
              fontSize: 26,
              letterSpacing: "5px",
              color: accent,
              marginTop: 16,
              fontFamily: "Inter",
            },
            "ARAVOW · ARAVOW.ORG",
          ),
        ],
      ),
    ],
  );

  const svg = await satori(content as never, {
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
