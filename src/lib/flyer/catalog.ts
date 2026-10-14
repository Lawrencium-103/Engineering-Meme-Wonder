import { asoOkeHeritage } from "./templates/aso-oke-heritage";
import { editorialNoir } from "./templates/editorial-noir";
import { emeraldBotanical } from "./templates/emerald-botanical";
import { fullBleed } from "./templates/full-bleed";
import { luxuryFoil } from "./templates/luxury-foil";
import { nikah } from "./templates/nikah";
import { onyxGold } from "./templates/onyx-gold";
import { rosewaterIvory } from "./templates/rosewater-ivory";
import { royalBurgundy } from "./templates/royal-burgundy";
import { typeOnlyEditorial } from "./templates/type-only-editorial";
import { watercolorBloomTemplate as watercolorBloom } from "./templates/watercolor-bloom";
import { westernWhite } from "./templates/western-white";
import type { FlyerTemplate } from "./types";

/**
 * The template catalog. Each entry is a full design: art + layout + declared
 * fields. Adding a design never touches the engine or the app.
 */
export const TEMPLATES: FlyerTemplate[] = [
  royalBurgundy,
  emeraldBotanical,
  asoOkeHeritage,
  onyxGold,
  rosewaterIvory,
  editorialNoir,
  westernWhite,
  watercolorBloom,
  luxuryFoil,
  typeOnlyEditorial,
  nikah,
  fullBleed,
];

export function getTemplate(id: string): FlyerTemplate | null {
  return TEMPLATES.find((t) => t.spec.id === id) ?? null;
}

export function templateIds(): string[] {
  return TEMPLATES.map((t) => t.spec.id);
}

/**
 * Deterministic design matcher — no AI needed.
 * Picks a template that supports the ceremonies this wedding actually has.
 * (Placeholder heuristic; the curated catalog + couple preferences refine it.)
 */
export function matchTemplate(ceremonyKinds: string[]): FlyerTemplate {
  const wanted = new Set(ceremonyKinds);
  const scored = TEMPLATES.map((t) => {
    const coverage = t.spec.supportedCeremonies.filter((k) => wanted.has(k)).length;
    return { t, coverage };
  }).sort((a, b) => b.coverage - a.coverage);
  return scored[0]?.t ?? TEMPLATES[0];
}
