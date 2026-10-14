import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ceremonies, events, guests } from "@/db/schema";
import { renderPass, type PassData } from "./pass";
import { uploadPassPng } from "./cloudinary-server";
import { isBranded, normalizeTier } from "./pricing";

/**
 * Pass orchestration: called AFTER the RSVP transaction commits (fire-and-forget).
 * Generates the pass PNG once, uploads it to Cloudinary, stores its URL.
 * Never regenerated per view. Failures are logged, never thrown — the guest
 * experience must not break because of rendering.
 */
export async function generateAndStorePass(guestId: string): Promise<void> {
  try {
    const [guest] = await db.select().from(guests).where(eq(guests.id, guestId)).limit(1);
    if (!guest) return;
    const [event] = await db.select().from(events).where(eq(events.id, guest.eventId)).limit(1);
    if (!event) return;

    const allCeremonies = await db.select().from(ceremonies).where(eq(ceremonies.eventId, event.id));
    const reception = allCeremonies.find((c) => c.kind === "RECEPTION");

    const data: PassData = {
      guestFirstName: guest.firstName,
      guestLastName: guest.lastName,
      side: guest.side,
      guestCode: guest.guestCode,
      publicToken: guest.publicToken,
      monogram: event.monogram,
      groomName: event.groomName,
      brideName: event.brideName,
      weddingDate: reception?.startsAt ?? new Date(event.weddingDate),
      timezone: event.timezone,
      receptionVenue: reception?.venueName ?? null,
      heroImageUrl: event.heroImageUrl,
      groomSignatureUrl: event.groomSignatureUrl,
      brideSignatureUrl: event.brideSignatureUrl,
      theme: event.theme ?? { primary: "#D4AF37", accent: "#E8D3C4" },
      templateId: event.flyer?.templateId,
      branded: isBranded(normalizeTier(event.tier)),
      hashtag: event.flyer?.hashtag,
      families: event.flyer?.families
        ? {
            brideParents: event.flyer.families.brideParents || undefined,
            groomParents: event.flyer.families.groomParents || undefined,
            introLine: event.flyer.families.introLine || undefined,
          }
        : undefined,
    };

    const png = await renderPass(data);
    const url = await uploadPassPng(png, `aravow/passes/${event.id}/${guest.guestCode}`);
    await db.update(guests).set({ passImageUrl: url }).where(eq(guests.id, guestId));
  } catch (err) {
    // Never break the guest experience on render/upload failure.
    // Log the error type/message only — never guest PII.
    console.error(
      "pass generation failed:",
      err instanceof Error ? `${err.name}: ${err.message}` : typeof err,
    );
  }
}
