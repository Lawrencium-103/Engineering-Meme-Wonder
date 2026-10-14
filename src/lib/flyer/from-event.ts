import { ceremonies, events } from "@/db/schema";
import type { FlyerData } from "./types";

/**
 * Shared mapper: an event row (+ `flyer` JSONB + its ceremonies) into
 * template-agnostic FlyerData. Used by BOTH the owner preview
 * (/preview/[id]) and the public guest page (/w/[slug]/card) so the couple
 * and their guests always see the same invitation — content can never
 * drift between the two surfaces again.
 */
export function toFlyerData(
  event: typeof events.$inferSelect,
  rows: (typeof ceremonies.$inferSelect)[],
  tz: string,
  guest?: { firstName: string; lastName: string; side: "GROOM" | "BRIDE" },
): FlyerData {
  const f = event.flyer;
  return {
    monogram: event.monogram,
    hashtag: f?.hashtag || undefined,
    couple: { bride: event.brideName, groom: event.groomName },
    guest: guest ?? undefined,
    families: f?.families
      ? {
          introLine: f.families.introLine || undefined,
          brideParents: f.families.brideParents || undefined,
          groomParents: f.families.groomParents || undefined,
        }
      : undefined,
    invitationMessage: f?.invitationMessage || undefined,
    events: rows.map((c) => ({
      kind: c.kind as FlyerData["events"][number]["kind"],
      date: new Intl.DateTimeFormat("en-NG", {
        timeZone: tz, day: "numeric", month: "short", year: "numeric",
      }).format(c.startsAt),
      time: fmtTime(c.startsAt, tz),
      venue: c.venueName,
    })),
    palette: f?.palette && f.palette.length > 0 ? f.palette : undefined,
    scripture: f?.scripture || undefined,
    closingMessage: f?.closingMessage || undefined,
    rsvpContacts: f?.rsvpContacts && f.rsvpContacts.length > 0 ? f.rsvpContacts : undefined,
    theme: event.theme ?? { primary: "#D4AF37", accent: "#E8D3C4" },
    photoUrl: event.heroImageUrl,
    groomSignatureUrl: event.groomSignatureUrl,
    brideSignatureUrl: event.brideSignatureUrl,
    nameFont: f?.nameFont || undefined,
  };
}

function fmtTime(d: Date | string, tz: string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-NG", {
    timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true,
  }).format(date);
}
