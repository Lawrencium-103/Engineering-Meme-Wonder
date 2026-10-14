import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { ceremonies, events } from "@/db/schema";
import { generateSlug } from "@/lib/slug";
import { getSessionAccount } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { FREE_GUEST_CAP, isTemplateFree } from "@/lib/pricing";

/**
 * Publish an event on the FREE tier — no checkout involved.
 * Mirrors the webhook's fulfil block: one transaction that sets
 * status=PUBLISHED, tier=FREE, guestCap=FREE_GUEST_CAP and claims a slug,
 * retrying the whole transaction on slug collision (a failed UPDATE aborts
 * a PG transaction — never continue it).
 *
 * Guards: authenticated owner, not ARCHIVED, at least one enabled
 * RECEPTION ceremony, and (for free-tier events) a free template only.
 */
export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!rateLimit(`publish:${ip}`, 10, 10 * 60 * 1000).ok) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const eventId = (json as { eventId?: unknown })?.eventId;
  if (typeof eventId !== "string" || !eventId) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const session = await getSessionAccount();
  if (!session) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const [event] = await db
    .select()
    .from(events)
    .where(and(eq(events.id, eventId), eq(events.ownerId, session.id)))
    .limit(1);
  if (!event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }
  if (event.status === "ARCHIVED") {
    return NextResponse.json({ error: "This event is archived." }, { status: 400 });
  }

  // A reception ceremony is required to publish (the pass + RSVP need it).
  const [reception] = await db
    .select({ id: ceremonies.id })
    .from(ceremonies)
    .where(and(eq(ceremonies.eventId, eventId), eq(ceremonies.kind, "RECEPTION")))
    .limit(1);
  if (!reception) {
    return NextResponse.json(
      { error: "Add a reception ceremony before publishing." },
      { status: 400 },
    );
  }

  // Free tier may only use the free templates (paid templates need a paid tier).
  const templateId = event.flyer?.templateId;
  if (templateId && !isTemplateFree(templateId)) {
    return NextResponse.json(
      { error: "That design needs a paid tier. Choose a free design or upgrade." },
      { status: 400 },
    );
  }

  type Outcome = { result: "published"; slug: string } | { result: "failed" };
  let outcome: Outcome = { result: "failed" };

  for (let attempt = 0; attempt < 5 && outcome.result === "failed"; attempt++) {
    try {
      outcome = await db.transaction(async (tx): Promise<Outcome> => {
        const [fresh] = await tx
          .select({ status: events.status, slug: events.slug, groomName: events.groomName, brideName: events.brideName })
          .from(events)
          .where(eq(events.id, eventId))
          .limit(1);
        if (!fresh) throw new Error("unknown-event");

        const newSlug = fresh.slug ?? generateSlug(fresh.groomName, fresh.brideName);

        if (fresh.status !== "PUBLISHED") {
          await tx
            .update(events)
            .set({ status: "PUBLISHED", tier: "FREE", guestCap: FREE_GUEST_CAP, slug: newSlug })
            .where(eq(events.id, eventId));
        }

        return { result: "published", slug: fresh.slug ?? newSlug };
      });
    } catch {
      // Slug unique-violation (or transient) → retry the transaction.
      console.error("publish-free tx retry");
      outcome = { result: "failed" };
    }
  }

  if (outcome.result === "failed") {
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, slug: outcome.slug, tier: "FREE" });
}
