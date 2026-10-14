import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { ceremonies, events } from "@/db/schema";
import { getSessionAccount } from "@/lib/auth";

/** Return the owner's latest DRAFT event — or a specific event via ?event=<id> (any status). */
export async function GET(req: Request) {
  const session = await getSessionAccount();
  // Anonymous visitors are expected — return signedIn:false rather than a 401
  // so the Studio doesn't log a console error on first load.
  if (!session) return NextResponse.json({ draft: null, signedIn: false });

  const requestedId = new URL(req.url).searchParams.get("event");
  const validId = requestedId && /^[0-9a-f-]{36}$/i.test(requestedId) ? requestedId : null;

  const [event] = validId
    ? await db
        .select()
        .from(events)
        .where(and(eq(events.id, validId), eq(events.ownerId, session.id)))
        .limit(1)
    : await db
        .select()
        .from(events)
        .where(and(eq(events.ownerId, session.id), eq(events.status, "DRAFT")))
        .orderBy(desc(events.createdAt))
        .limit(1);

  if (!event) return NextResponse.json({ draft: null, signedIn: true });

  const rows = await db.select().from(ceremonies).where(eq(ceremonies.eventId, event.id));
  rows.sort((a, b) => a.sortOrder - b.sortOrder);

  return NextResponse.json({
    draft: { event, ceremonies: rows },
    signedIn: true,
    // The Studio uses these to decide between creating a draft (POST) and
    // editing an existing/published event (PATCH).
    eventId: event.id,
    status: event.status,
  });
}
