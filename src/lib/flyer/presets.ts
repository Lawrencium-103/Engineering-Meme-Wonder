/**
 * Curated colour presets (aso-ebi palettes) for the Studio colour picker.
 *
 * Each preset is a real Nigerian wedding colour story: a primary + accent that
 * feed `theme`, plus 3–4 swatches that prefill the "Colours of the day" row.
 * Client-safe (no fs / no render engine) so the Studio can import it directly.
 *
 * Colours are chosen to read on the light and dark template grounds; the
 * render engine still runs `pickReadable` so a pastel never lands as body text
 * on a ground where it would vanish.
 */

export interface ColourPreset {
  id: string;
  name: string;
  /** Drives headings, names, rules — the dominant ink. */
  primary: string;
  /** Drives ornaments, hashtags, closing line — the supporting ink. */
  accent: string;
  /** "Colours of the day" swatches (aso-ebi). First entry mirrors primary. */
  swatches: Array<{ label: string; hex: string }>;
}

export const COLOUR_PRESETS: ColourPreset[] = [
  {
    id: "champagne-gold",
    name: "Champagne & Gold",
    primary: "#C9A227",
    accent: "#E8D3C4",
    swatches: [
      { label: "Gold", hex: "#C9A227" },
      { label: "Champagne", hex: "#E8D3C4" },
      { label: "Ivory", hex: "#F5EFE3" },
    ],
  },
  {
    id: "emerald-gold",
    name: "Emerald & Gold",
    primary: "#0E5135",
    accent: "#C9A227",
    swatches: [
      { label: "Emerald", hex: "#0E5135" },
      { label: "Gold", hex: "#C9A227" },
      { label: "Sage", hex: "#8FA98B" },
    ],
  },
  {
    id: "burgundy-gold",
    name: "Burgundy & Gold",
    primary: "#641F26",
    accent: "#B58A35",
    swatches: [
      { label: "Burgundy", hex: "#641F26" },
      { label: "Gold", hex: "#B58A35" },
      { label: "Wine", hex: "#722F37" },
    ],
  },
  {
    id: "royal-blue-gold",
    name: "Royal Blue & Gold",
    primary: "#1F3A93",
    accent: "#D4AF37",
    swatches: [
      { label: "Royal Blue", hex: "#1F3A93" },
      { label: "Gold", hex: "#D4AF37" },
      { label: "Sky", hex: "#5B7FC7" },
    ],
  },
  {
    id: "teal-coral",
    name: "Teal & Coral",
    primary: "#0F5257",
    accent: "#E8836B",
    swatches: [
      { label: "Teal", hex: "#0F5257" },
      { label: "Coral", hex: "#E8836B" },
      { label: "Seafoam", hex: "#7FB5B0" },
    ],
  },
  {
    id: "blush-gold",
    name: "Blush & Gold",
    primary: "#9C4A54",
    accent: "#C9973F",
    swatches: [
      { label: "Blush", hex: "#9C4A54" },
      { label: "Gold", hex: "#C9973F" },
      { label: "Rosewater", hex: "#E8C4C0" },
    ],
  },
  {
    id: "wine-rose",
    name: "Wine & Rose",
    primary: "#722F37",
    accent: "#E8B4B8",
    swatches: [
      { label: "Wine", hex: "#722F37" },
      { label: "Rose", hex: "#E8B4B8" },
      { label: "Berry", hex: "#8E3B52" },
    ],
  },
  {
    id: "terracotta-cream",
    name: "Terracotta & Cream",
    primary: "#C46A4A",
    accent: "#F2EAD9",
    swatches: [
      { label: "Terracotta", hex: "#C46A4A" },
      { label: "Cream", hex: "#F2EAD9" },
      { label: "Clay", hex: "#D9835E" },
    ],
  },
  {
    id: "lavender-silver",
    name: "Lavender & Silver",
    primary: "#6B5B95",
    accent: "#C0C0C0",
    swatches: [
      { label: "Lavender", hex: "#6B5B95" },
      { label: "Silver", hex: "#C0C0C0" },
      { label: "Lilac", hex: "#B8A9D4" },
    ],
  },
  {
    id: "sage-ivory",
    name: "Sage & Ivory",
    primary: "#7C8C6F",
    accent: "#F3F0E4",
    swatches: [
      { label: "Sage", hex: "#7C8C6F" },
      { label: "Ivory", hex: "#F3F0E4" },
      { label: "Olive", hex: "#6B6B3A" },
    ],
  },
  {
    id: "onyx-gold",
    name: "Onyx & Gold",
    primary: "#D4AF37",
    accent: "#E8D3C4",
    swatches: [
      { label: "Onyx", hex: "#0B0C10" },
      { label: "Gold", hex: "#D4AF37" },
      { label: "Champagne", hex: "#E8D3C4" },
    ],
  },
  {
    id: "olive-ivory",
    name: "Olive & Ivory",
    primary: "#6B6B3A",
    accent: "#F9F6EE",
    swatches: [
      { label: "Olive", hex: "#6B6B3A" },
      { label: "Ivory", hex: "#F9F6EE" },
      { label: "Moss", hex: "#8A8C5A" },
    ],
  },
];

export function getPreset(id: string): ColourPreset | null {
  return COLOUR_PRESETS.find((p) => p.id === id) ?? null;
}
