import type { El } from "./h";

/** Shared flyer types. Content is separate from design — see TemplateSpec. */

export type CeremonyKind = "TRADITIONAL" | "COURT" | "RELIGIOUS" | "RECEPTION";

export interface FlyerEvent {
  kind: CeremonyKind;
  /** Display title override, e.g. "White Wedding". Falls back to a default. */
  title?: string;
  date: string;
  time: string;
  venue: string;
}

export interface FlyerSwatch {
  label: string;
  hex: string;
}

export interface FlyerContact {
  name: string;
  phone: string;
}

/**
 * The wedding CONTENT. Deliberately independent of any template, so the same
 * data can render through every design in the catalog.
 */
export interface FlyerData {
  monogram: string;
  hashtag?: string;
  couple: { bride: string; groom: string };
  /** Guest being honoured — renders a "Dear {name}" line when present. */
  guest?: { firstName: string; lastName: string; side: "GROOM" | "BRIDE" };
  families?: {
    brideParents?: string;
    groomParents?: string;
    introLine?: string;
  };
  invitationMessage?: string;
  events: FlyerEvent[];
  palette?: FlyerSwatch[];
  scripture?: string;
  closingMessage?: string;
  rsvpContacts?: FlyerContact[];
  /** The couple's colours — drives accents so the flyer matches their theme. */
  theme: { primary: string; accent: string };
  photoUrl?: string | null;
  /** Manual crop (percent). Reserved for the Studio "adjust photo" UI. */
  photoCrop?: { x: number; y: number; zoom: number };
  /** Handwritten signatures, drawn in the Studio. Rendered bottom of card. */
  groomSignatureUrl?: string | null;
  brideSignatureUrl?: string | null;
  /**
   * Couple name typeface pick. Couple facing label, e.g. "Royal Script".
   * Engine maps it to a loaded Satori family; unknown values fall back.
   */
  nameFont?: string;
}

export type SectionKind =
  | "families"
  | "events"
  | "palette"
  | "scripture"
  | "rsvp"
  | "closing";

/**
 * The DESIGN. A declarative description of one template — not a prompt.
 * Templates declare what they need so the UI can validate completeness.
 */
export interface TemplateSpec {
  id: string;
  name: string;
  category: string;
  canvas: { width: number; height: number };
  palette: { background: string; primary: string; accent: string; text: string };
  supportedCeremonies: CeremonyKind[];
  requiredFields: string[];
  optionalFields: string[];
  rendersPhoto: boolean;
  /** Aspect of the photo frame; used to pre-crop on Cloudinary. */
  photoFrame?: { w: number; h: number };
  sections: SectionKind[];
}

/**
 * What a template produces: a full-fidelity SVG art fragment (gradients,
 * filters, masks, the photo) plus the Satori text tree layered on top.
 */
export interface TemplateRender {
  art: string;
  text: El;
}

export interface FlyerTemplate {
  spec: TemplateSpec;
  build(data: FlyerData, photoDataUrl: string | null): TemplateRender;
}

export const CEREMONY_TITLES: Record<CeremonyKind, string> = {
  TRADITIONAL: "Traditional Wedding",
  COURT: "Court Wedding",
  RELIGIOUS: "Church Wedding",
  RECEPTION: "Reception",
};
