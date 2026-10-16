import { z } from "zod";

/** Shared zod schemas + client draft types for the Studio (Phase 2). */

export const CEREMONY_KINDS = ["TRADITIONAL", "COURT", "RELIGIOUS", "RECEPTION"] as const;
export type CeremonyKind = (typeof CEREMONY_KINDS)[number];

export const ceremonySchema = z.object({
  kind: z.enum(CEREMONY_KINDS),
  enabled: z.boolean(),
  venueName: z.string().trim().max(200).optional().default(""),
  address: z.string().trim().max(300).optional().default(""),
  mapsUrl: z.string().trim().max(600).optional().default(""),
  /** ISO instant (UTC) after client conversion, or empty when not set. */
  startsAt: z.string().optional().default(""),
  dressCode: z.string().trim().max(120).optional().default(""),
});

/**
 * Asset URLs come from Cloudinary in production (absolute https URL) or from
 * the dev-only local uploader (site-relative /uploads/...). Accept both.
 */
const assetUrl = z
  .string()
  .max(600)
  .refine(
    (v) => v === "" || /^https?:\/\/\S+$/i.test(v) || v.startsWith("/"),
    "Must be a valid image URL",
  );

export const studioSaveSchema = z
  .object({
    groomName: z.string().trim().min(1, "Groom's name is required").max(100),
    brideName: z.string().trim().min(1, "Bride's name is required").max(100),
    monogram: z.string().regex(/^[A-Z]{1,5}$/, "Monogram: 1-5 letters A-Z"),
    weddingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick the wedding date"),
    timezone: z.string().min(1).max(64),
    theme: z.object({
      primary: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Primary color"),
      accent: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Accent color"),
      heroCrop: z
        .object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100), zoom: z.number().min(1).max(3) })
        .optional(),
    }),
    heroImageUrl: assetUrl.optional(),
    groomSignatureUrl: assetUrl.optional(),
    brideSignatureUrl: assetUrl.optional(),
    story: z.string().max(500, "Story must be 500 characters or fewer").optional().default(""),
    ceremonies: z.array(ceremonySchema).max(4),
    /**
     * Invitation-flyer content — the rich fields the curated templates
     * (NG-001/002/003…) render. All optional so old clients keep working.
     */
    flyer: z
      .object({
        hashtag: z.string().trim().max(60).optional().default(""),
        invitationMessage: z.string().trim().max(300).optional().default(""),
        families: z
          .object({
            introLine: z.string().trim().max(200).optional().default(""),
            brideParents: z.string().trim().max(200).optional().default(""),
            groomParents: z.string().trim().max(200).optional().default(""),
          })
          .optional()
          .default({ introLine: "", brideParents: "", groomParents: "" }),
        palette: z
          .array(
            z.object({
              label: z.string().trim().max(40),
              hex: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Swatch color"),
            }),
          )
          .max(6)
          .optional()
          .default([]),
        scripture: z.string().trim().max(400).optional().default(""),
        closingMessage: z.string().trim().max(200).optional().default(""),
        rsvpContacts: z
          .array(
            z.object({
              name: z.string().trim().max(60),
              phone: z.string().trim().max(30),
            }),
          )
          .max(4)
          .optional()
          .default([]),
        /** Curated template id, e.g. NG-001. Validated against the catalog on save. */
        templateId: z.string().trim().max(20).optional().default(""),
        /** Couple name typeface pick, e.g. Royal Script. Validated on save. */
        nameFont: z.string().trim().max(40).optional().default(""),
      })
      .optional()
      .default({
        hashtag: "",
        invitationMessage: "",
        families: { introLine: "", brideParents: "", groomParents: "" },
        palette: [],
        scripture: "",
        closingMessage: "",
        rsvpContacts: [],
        templateId: "",
        nameFont: "",
      }),
    /** Required only when the visitor is not signed in yet. */
    email: z.string().email().optional(),
    /**
     * Agent's Customer Service ID (e.g. AV-01-SWT) given to the couple by a
     * sales agent. Empty string = "None" (no agent). Validated server-side
     * against active agents on save.
     */
    agentCode: z.string().trim().max(20).optional().default(""),
  })
  .superRefine((val, ctx) => {
    const reception = val.ceremonies.find((c) => c.kind === "RECEPTION");
    if (!reception || !reception.enabled) {
      ctx.addIssue({ code: "custom", message: "A reception ceremony is required.", path: ["ceremonies"] });
      return;
    }
    if (!reception.venueName) {
      ctx.addIssue({ code: "custom", message: "Reception venue name is required.", path: ["ceremonies"] });
    }
    if (!reception.startsAt) {
      ctx.addIssue({ code: "custom", message: "Reception start time is required.", path: ["ceremonies"] });
    }
    for (const c of val.ceremonies) {
      if (c.enabled && c.kind !== "RECEPTION" && !c.venueName) {
        ctx.addIssue({ code: "custom", message: `${c.kind}: venue name required.`, path: ["ceremonies"] });
      }
      if (c.enabled && c.kind !== "RECEPTION" && !c.startsAt) {
        ctx.addIssue({ code: "custom", message: `${c.kind}: start time required.`, path: ["ceremonies"] });
      }
    }
  });

export type StudioSave = z.infer<typeof studioSaveSchema>;
export type CeremonyInput = z.infer<typeof ceremonySchema>;

/** Browser-side draft shape (same as StudioSave minus email). */
export interface StudioDraft {
  groomName: string;
  brideName: string;
  monogram: string;
  monogramEdited: boolean;
  weddingDate: string;
  timezone: string;
  theme: { primary: string; accent: string; heroCrop?: { x: number; y: number; zoom: number } };
  heroImageUrl: string;
  groomSignatureUrl: string;
  brideSignatureUrl: string;
  story: string;
  ceremonies: CeremonyInput[];
  flyer: FlyerInput;
}

export interface FlyerInput {
  hashtag: string;
  invitationMessage: string;
  families: { introLine: string; brideParents: string; groomParents: string };
  palette: Array<{ label: string; hex: string }>;
  scripture: string;
  closingMessage: string;
  rsvpContacts: Array<{ name: string; phone: string }>;
  templateId: string;
  nameFont: string;
}

export function emptyFlyer(): FlyerInput {
  return {
    hashtag: "",
    invitationMessage: "Together with their families, request the honour of your presence",
    families: { introLine: "", brideParents: "", groomParents: "" },
    palette: [],
    scripture: "",
    closingMessage: "",
    rsvpContacts: [],
    templateId: "",
    nameFont: "",
  };
}

export const DEFAULT_TIMEZONES = [
  "Africa/Lagos",
  "Africa/Accra",
  "Africa/Johannesburg",
  "Africa/Nairobi",
  "Africa/Cairo",
  "Africa/Kigali",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "America/Toronto",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Australia/Sydney",
  "UTC",
] as const;

export const CEREMONY_LABELS: Record<CeremonyKind, string> = {
  TRADITIONAL: "Traditional / Engagement",
  COURT: "Court Wedding",
  RELIGIOUS: "Religious Ceremony",
  RECEPTION: "Reception",
};

export function emptyCeremony(kind: CeremonyKind, enabled: boolean): CeremonyInput {
  return { kind, enabled, venueName: "", address: "", mapsUrl: "", startsAt: "", dressCode: "" };
}

export function emptyDraft(): StudioDraft {
  return {
    groomName: "",
    brideName: "",
    monogram: "",
    monogramEdited: false,
    weddingDate: "",
    timezone: "Africa/Lagos",
    theme: { primary: "#D4AF37", accent: "#E8D3C4" },
    heroImageUrl: "",
    groomSignatureUrl: "",
    brideSignatureUrl: "",
    story: "",
    ceremonies: [
      emptyCeremony("RECEPTION", true),
      emptyCeremony("TRADITIONAL", false),
      emptyCeremony("COURT", false),
      emptyCeremony("RELIGIOUS", false),
    ],
    flyer: emptyFlyer(),
  };
}

const DRAFT_KEY = "aravow.draft.v1";

export function loadLocalDraft(): StudioDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StudioDraft;
    return { ...emptyDraft(), ...parsed };
  } catch {
    return null;
  }
}

export function saveLocalDraft(draft: StudioDraft): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // storage full / private mode — non-fatal
  }
}

/** Auto-generate a monogram from first names (first letter of each). */
export function monogramFromNames(groom: string, bride: string): string {
  const g = groom.trim().charAt(0);
  const b = bride.trim().charAt(0);
  return (g + b).toUpperCase();
}
