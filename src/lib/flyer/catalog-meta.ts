import type { TemplateSpec } from "./types";

/**
 * CLIENT-SAFE template metadata: the curated specs without the render engine.
 *
 * The Studio (a client component) needs id/name/category/palette to draw the
 * design picker, but `catalog.ts` pulls in templates → sections → fonts →
 * `fs/promises`, which cannot bundle for the browser. Specs live here; the
 * template modules import their spec from this file, so there is exactly one
 * source of truth per design.
 *
 * (Type-only import of TemplateSpec erases at compile time — zero runtime deps.)
 */

const FIELDS = ["families", "events", "palette", "scripture", "rsvp", "closing"] as const;

const OPTIONAL_FIELDS = [
  "families",
  "palette",
  "scripture",
  "closingMessage",
  "rsvpContacts",
  "photo",
  "hashtag",
  "invitationMessage",
] as const;

export const royalBurgundySpec: TemplateSpec = {
  id: "NG-001",
  name: "Royal Burgundy",
  category: "Nigerian Wedding — Traditional + Church",
  canvas: { width: 1080, height: 1920 },
  palette: { background: "#F7F1E5", primary: "#641F26", accent: "#B58A35", text: "#241A18" },
  supportedCeremonies: ["TRADITIONAL", "COURT", "RELIGIOUS", "RECEPTION"],
  requiredFields: ["couple", "events", "monogram"],
  optionalFields: [...OPTIONAL_FIELDS],
  rendersPhoto: true,
  photoFrame: { w: 460, h: 508 },
  sections: [...FIELDS],
};

export const emeraldBotanicalSpec: TemplateSpec = {
  id: "NG-002",
  name: "Emerald Botanical",
  category: "Nigerian Wedding — Garden / Church",
  canvas: { width: 1080, height: 1920 },
  palette: { background: "#F3F7EE", primary: "#0E5135", accent: "#C9A227", text: "#1C2A20" },
  supportedCeremonies: ["TRADITIONAL", "COURT", "RELIGIOUS", "RECEPTION"],
  requiredFields: ["couple", "events", "monogram"],
  optionalFields: [...OPTIONAL_FIELDS],
  rendersPhoto: true,
  photoFrame: { w: 520, h: 520 },
  sections: [...FIELDS],
};

export const asoOkeHeritageSpec: TemplateSpec = {
  id: "NG-003",
  name: "Aso-Oke Heritage",
  category: "Nigerian Wedding — Traditional (Yoruba)",
  canvas: { width: 1080, height: 1920 },
  palette: { background: "#141A38", primary: "#E9C46A", accent: "#D9835E", text: "#F2EAD9" },
  supportedCeremonies: ["TRADITIONAL", "COURT", "RECEPTION"],
  requiredFields: ["couple", "events", "monogram"],
  optionalFields: [...OPTIONAL_FIELDS],
  rendersPhoto: true,
  photoFrame: { w: 470, h: 560 },
  sections: [...FIELDS],
};

export const onyxGoldSpec: TemplateSpec = {
  id: "NG-004",
  name: "Onyx & Gold",
  category: "Nigerian Wedding — Black Tie",
  canvas: { width: 1080, height: 1920 },
  palette: { background: "#0B0C10", primary: "#D4AF37", accent: "#E8D3C4", text: "#F9F8F6" },
  supportedCeremonies: ["TRADITIONAL", "COURT", "RELIGIOUS", "RECEPTION"],
  requiredFields: ["couple", "events", "monogram"],
  optionalFields: [...OPTIONAL_FIELDS],
  rendersPhoto: true,
  photoFrame: { w: 470, h: 560 },
  sections: [...FIELDS],
};

export const rosewaterIvorySpec: TemplateSpec = {
  id: "NG-005",
  name: "Rosewater Ivory",
  category: "Nigerian Wedding — Garden / Church",
  canvas: { width: 1080, height: 1920 },
  palette: { background: "#FBF3EF", primary: "#9C4A54", accent: "#C9973F", text: "#33221F" },
  supportedCeremonies: ["TRADITIONAL", "COURT", "RELIGIOUS", "RECEPTION"],
  requiredFields: ["couple", "events", "monogram"],
  optionalFields: [...OPTIONAL_FIELDS],
  rendersPhoto: true,
  photoFrame: { w: 500, h: 500 },
  sections: [...FIELDS],
};

export const editorialNoirSpec: TemplateSpec = {
  id: "NG-006",
  name: "Editorial Noir",
  category: "Nigerian Wedding — Modern Minimal",
  canvas: { width: 1080, height: 1920 },
  palette: { background: "#F9F8F6", primary: "#0B0C10", accent: "#B58A35", text: "#17181C" },
  supportedCeremonies: ["TRADITIONAL", "COURT", "RELIGIOUS", "RECEPTION"],
  requiredFields: ["couple", "events", "monogram"],
  optionalFields: [...OPTIONAL_FIELDS],
  rendersPhoto: true,
  photoFrame: { w: 620, h: 420 },
  sections: [...FIELDS],
};

export const westernWhiteSpec: TemplateSpec = {
  id: "NG-007",
  name: "Western White",
  category: "Classic — Church / White Wedding",
  canvas: { width: 1080, height: 1920 },
  palette: { background: "#FCFBF8", primary: "#5C6B5A", accent: "#C9A86A", text: "#2A2723" },
  supportedCeremonies: ["COURT", "RELIGIOUS", "RECEPTION", "TRADITIONAL"],
  requiredFields: ["couple", "events", "monogram"],
  optionalFields: [...OPTIONAL_FIELDS],
  rendersPhoto: true,
  photoFrame: { w: 480, h: 600 },
  sections: [...FIELDS],
};

export const watercolorBloomSpec: TemplateSpec = {
  id: "NG-008",
  name: "Watercolor Bloom",
  category: "Garden — Soft Romantic",
  canvas: { width: 1080, height: 1920 },
  palette: { background: "#FBF7F4", primary: "#B5838D", accent: "#94A8B8", text: "#3A3335" },
  supportedCeremonies: ["TRADITIONAL", "COURT", "RELIGIOUS", "RECEPTION"],
  requiredFields: ["couple", "events", "monogram"],
  optionalFields: [...OPTIONAL_FIELDS],
  rendersPhoto: true,
  photoFrame: { w: 500, h: 500 },
  sections: [...FIELDS],
};

export const luxuryFoilSpec: TemplateSpec = {
  id: "NG-009",
  name: "Luxury Foil",
  category: "Evening — Metallic Glamour",
  canvas: { width: 1080, height: 1920 },
  palette: { background: "#141019", primary: "#D4AF37", accent: "#E8D6C0", text: "#F6F1E7" },
  supportedCeremonies: ["TRADITIONAL", "COURT", "RELIGIOUS", "RECEPTION"],
  requiredFields: ["couple", "events", "monogram"],
  optionalFields: [...OPTIONAL_FIELDS],
  rendersPhoto: true,
  photoFrame: { w: 480, h: 560 },
  sections: [...FIELDS],
};

export const typeOnlyEditorialSpec: TemplateSpec = {
  id: "NG-010",
  name: "Type Editorial",
  category: "Modern — Typography Only",
  canvas: { width: 1080, height: 1920 },
  palette: { background: "#F4F1EA", primary: "#1A1A1A", accent: "#8C7B5A", text: "#22201C" },
  supportedCeremonies: ["TRADITIONAL", "COURT", "RELIGIOUS", "RECEPTION"],
  requiredFields: ["couple", "events", "monogram"],
  optionalFields: [...OPTIONAL_FIELDS],
  rendersPhoto: false,
  sections: [...FIELDS],
};

export const nikahSpec: TemplateSpec = {
  id: "NG-011",
  name: "Nikah",
  category: "Islamic — Nikah / Walima",
  canvas: { width: 1080, height: 1920 },
  palette: { background: "#0F2E2A", primary: "#C9A86A", accent: "#E6D9B8", text: "#F3EFE2" },
  supportedCeremonies: ["TRADITIONAL", "RECEPTION", "COURT"],
  requiredFields: ["couple", "events", "monogram"],
  optionalFields: [...OPTIONAL_FIELDS],
  rendersPhoto: true,
  photoFrame: { w: 480, h: 480 },
  sections: [...FIELDS],
};

export const fullBleedSpec: TemplateSpec = {
  id: "NG-012",
  name: "Full Bleed",
  category: "Cinematic — Photo Forward",
  canvas: { width: 1080, height: 1920 },
  palette: { background: "#0B0C10", primary: "#FFFFFF", accent: "#D4AF37", text: "#FFFFFF" },
  supportedCeremonies: ["TRADITIONAL", "COURT", "RELIGIOUS", "RECEPTION"],
  requiredFields: ["couple", "events", "monogram"],
  optionalFields: [...OPTIONAL_FIELDS],
  rendersPhoto: true,
  photoFrame: { w: 1080, h: 1920 },
  sections: [...FIELDS],
};

/** Ordered spec list — mirrors `TEMPLATES` in catalog.ts (server-side). */
export const TEMPLATE_SPECS: TemplateSpec[] = [
  royalBurgundySpec,
  emeraldBotanicalSpec,
  asoOkeHeritageSpec,
  onyxGoldSpec,
  rosewaterIvorySpec,
  editorialNoirSpec,
  westernWhiteSpec,
  watercolorBloomSpec,
  luxuryFoilSpec,
  typeOnlyEditorialSpec,
  nikahSpec,
  fullBleedSpec,
];
