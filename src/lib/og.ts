import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

/** 1200x630 Open Graph image via the same Satori + resvg pipeline as passes. */

type El = { type: string; props: Record<string, unknown> };
function h(type: string, style: Record<string, unknown> | null, children?: unknown): El {
  const props: Record<string, unknown> = {};
  if (style) props.style = style;
  if (children !== undefined) props.children = children;
  return { type, props };
}

const W = 1200;
const H = 630;

interface OgData {
  groomName: string;
  brideName: string;
  weddingDate: Date;
  timezone: string;
  theme: { primary: string; accent: string };
  heroImageUrl: string | null;
}

export async function renderOgImage(data: OgData): Promise<Buffer> {
  const base = process.cwd() + "/public/fonts";
  const { readFile } = await import("fs/promises");
  const [serif, sans] = await Promise.all([
    readFile(`${base}/CormorantGaramond-SemiBold.ttf`),
    readFile(`${base}/Inter-Regular.otf`),
  ]);

  const dateStr = new Intl.DateTimeFormat("en-NG", {
    timeZone: data.timezone,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(data.weddingDate);

  const gold = data.theme.primary;
  const accent = data.theme.accent;

  const root = h(
    "div",
    {
      width: "100%",
      height: "100%",
      display: "flex",
      backgroundColor: "#0B0C10",
      padding: "28px",
    },
    h(
      "div",
      {
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(11,12,16,0.72)",
        border: `2px solid ${gold}`,
      },
      [
        h("div", { fontSize: 24, letterSpacing: 12, color: accent, fontFamily: "Inter" }, "THE WEDDING CELEBRATION OF"),
        h(
          "div",
          { fontSize: 72, fontStyle: "italic", color: "#F9F8F6", marginTop: 12, fontFamily: "Cormorant Garamond" },
          `${data.groomName} & ${data.brideName}`,
        ),
        h("div", { fontSize: 30, color: gold, marginTop: 20, letterSpacing: 4, fontFamily: "Inter" }, dateStr),
      ],
    ),
  );

  const svg = await satori(root as never, {
    width: W,
    height: H,
    fonts: [
      { name: "Cormorant Garamond", data: serif, weight: 600, style: "normal" },
      { name: "Inter", data: sans, weight: 400, style: "normal" },
    ],
  });

  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: W } });
  return Buffer.from(resvg.render().asPng());
}
