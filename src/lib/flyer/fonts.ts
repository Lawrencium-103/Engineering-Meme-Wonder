import { readFile } from "fs/promises";

/**
 * Font loader for the flyer pipeline. Same static TTFs the pass/OG renderers
 * use (Satori's bundled opentype parser crashes on variable fonts — see README).
 * Cached across renders: (re)reading ~2MB per flyer would be wasteful.
 */
export interface FontSet {
  serif: Buffer;
  script: Buffer;
  sans: Buffer;
  scriptAlt: Buffer;
  scriptFlourish: Buffer;
  serifDisplay: Buffer;
}

export const FONT_FAMILIES = {
  serif: "Cormorant Garamond",
  script: "Great Vibes",
  sans: "Inter",
  /** Stylish alternates the couple can pick for their names. */
  scriptAlt: "Allura",
  scriptFlourish: "Parisienne",
  serifDisplay: "Marcellus",
} as const;

export type NameFontId = "royal" | "allura" | "parisienne" | "marcellus";

export const NAME_FONTS: Array<{ id: NameFontId; label: string; family: string }> = [
  { id: "royal", label: "Royal Script", family: FONT_FAMILIES.script },
  { id: "allura", label: "Allura Elegant", family: FONT_FAMILIES.scriptAlt },
  { id: "parisienne", label: "Parisienne Chic", family: FONT_FAMILIES.scriptFlourish },
  { id: "marcellus", label: "Marcellus Regal", family: FONT_FAMILIES.serifDisplay },
];

/** Map a saved name-font id (or legacy label) to a loaded Satori family. */
export function nameFontFamily(pick?: string | null): string {
  if (!pick) return FONT_FAMILIES.script;
  const v = pick.trim().toLowerCase();
  const byId = NAME_FONTS.find((f) => f.id === v);
  if (byId) return byId.family;
  const byLabel = NAME_FONTS.find((f) => f.label.toLowerCase() === v);
  if (byLabel) return byLabel.family;
  const byFamily = NAME_FONTS.find((f) => f.family.toLowerCase() === v);
  if (byFamily) return byFamily.family;
  // Legacy value from before the picker: "Great Vibes".
  if (v === "great vibes") return FONT_FAMILIES.script;
  return FONT_FAMILIES.script;
}

let cache: FontSet | null = null;

export async function loadFonts(): Promise<FontSet> {
  if (cache) return cache;
  const base = `${process.cwd()}/public/fonts`;
  const read = (f: string) => readFile(`${base}/${f}`);
  const [serif, script, sans, scriptAlt, scriptFlourish, serifDisplay] = await Promise.all([
    read("CormorantGaramond-SemiBold.ttf"),
    read("GreatVibes-Regular.ttf"),
    read("Inter-Regular.otf"),
    read("Allura-Regular.ttf"),
    read("Parisienne-Regular.ttf"),
    read("Marcellus-Regular.ttf"),
  ]);
  cache = { serif, script, sans, scriptAlt, scriptFlourish, serifDisplay };
  return cache;
}
