import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts, ceremonies, events } from "@/db/schema";
import { getSessionAccount, establishSession, createMagicToken, appUrl } from "@/lib/auth";
import { sendMagicLinkEmail, emailConfigured } from "@/lib/email";
import { studioSaveSchema } from "@/lib/studio-schema";
import { zonedTimeToUtc } from "@/lib/time";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { DEFAULT_TIER, FREE_GUEST_CAP } from "@/lib/pricing";
import { TEMPLATES, getTemplate } from "@/lib/flyer/catalog";

/**
 * Save the Studio as a DRAFT event.
 * - Signed in: upserts the latest DRAFT event owned by the account.
 * - Not signed in: requires email; creates the account + event, then emails a
 *   magic link so the couple can claim the draft.
 */
export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!rateLimit(`save:${ip}`, 10, 10 * 60 * 1000).ok) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = studioSaveSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues.map((i) => ({ path: i.path, message: i.message })) },
      { status: 400 },
    );
  }
  const input = parsed.data;

  // Unknown template ids fall back to the first catalog entry (never 400 —
  // the picker only sends catalog ids, so anything else is stale client state).
  const templateId =
    input.flyer.templateId && getTemplate(input.flyer.templateId)
      ? input.flyer.templateId
      : TEMPLATES[0].spec.id;

  try {
    const session = await getSessionAccount();
  if (!session && !input.email) {
    return NextResponse.json({ error: "Email is required to save." }, { status: 401 });
  }
  const email = session?.email ?? input.email!.toLowerCase();

  // Resolve or create the account.
  let [account] = await db.select().from(accounts).where(eq(accounts.email, email)).limit(1);
  if (!account) {
    [account] = await db.insert(accounts).values({ email }).returning();
  }

  // Convert ceremony local times to UTC instants using the event timezone.
  // NB: validate here and return 400 JSON — never throw, or Next.js serves an
  // HTML 500 page that the Studio client cannot parse (shows as "Network error").
  const ceremonyRows: Array<{
    kind: (typeof input.ceremonies)[number]["kind"];
    venueName: string;
    address: string | null;
    mapsUrl: string | null;
    startsAt: Date;
    dressCode: string | null;
    isRequired: boolean;
    sortOrder: number;
  }> = [];
  {
    let idx = 0;
    for (const c of input.ceremonies.filter((c) => c.enabled)) {
      let startsAt: Date | null = null;
      try {
        startsAt = c.startsAt
          ? zonedTimeToUtc(c.startsAt.replace(/Z$/, ""), input.timezone)
          : null;
      } catch {
        startsAt = null;
      }
      if (!startsAt) {
        return NextResponse.json(
          { error: `${c.kind}: start time is invalid. Use the date picker.` },
          { status: 400 },
        );
      }
      ceremonyRows.push({
        kind: c.kind,
        venueName: c.venueName,
        address: c.address || null,
        mapsUrl: c.mapsUrl || null,
        startsAt,
        dressCode: c.dressCode || null,
        isRequired: c.kind === "RECEPTION",
        sortOrder: idx++,
      });
    }
  }

  const eventValues = {
    ownerId: account.id,
    status: "DRAFT" as const,
    monogram: input.monogram,
    groomName: input.groomName,
    brideName: input.brideName,
    weddingDate: input.weddingDate,
    timezone: input.timezone,
    guestCap: FREE_GUEST_CAP, // draft placeholder; publish sets the tier cap
    tier: DEFAULT_TIER,
    theme: {
      primary: input.theme.primary,
      accent: input.theme.accent,
      ...(input.theme.heroCrop ? { heroCrop: input.theme.heroCrop } : {}),
    },
    heroImageUrl: input.heroImageUrl || null,
    groomSignatureUrl: input.groomSignatureUrl || null,
    brideSignatureUrl: input.brideSignatureUrl || null,
    story: input.story || null,
    flyer: {
      hashtag: input.flyer.hashtag || undefined,
      invitationMessage: input.flyer.invitationMessage || undefined,
      families:
        input.flyer.families.introLine || input.flyer.families.brideParents || input.flyer.families.groomParents
          ? {
              introLine: input.flyer.families.introLine || undefined,
              brideParents: input.flyer.families.brideParents || undefined,
              groomParents: input.flyer.families.groomParents || undefined,
            }
          : undefined,
      palette: input.flyer.palette.length > 0 ? input.flyer.palette : undefined,
      scripture: input.flyer.scripture || undefined,
      closingMessage: input.flyer.closingMessage || undefined,
      rsvpContacts: input.flyer.rsvpContacts.length > 0 ? input.flyer.rsvpContacts : undefined,
      templateId,
    },
  };

  const eventId = await db.transaction(async (tx) => {
    // Latest DRAFT event for this owner (publishing/editing flows come later).
    const [existing] = await tx
      .select({ id: events.id })
      .from(events)
      .where(and(eq(events.ownerId, account.id), eq(events.status, "DRAFT")))
      .orderBy(desc(events.createdAt))
      .limit(1);

    let id: string;
    if (existing) {
      id = existing.id;
      await tx.update(events).set(eventValues).where(eq(events.id, id));
      await tx.delete(ceremonies).where(eq(ceremonies.eventId, id));
    } else {
      const [created] = await tx.insert(events).values(eventValues).returning({ id: events.id });
      id = created.id;
    }

    await tx.insert(ceremonies).values(ceremonyRows.map((r) => ({ ...r, eventId: id })));
    return id;
  });

  // Not signed in? Send the magic link so the couple can claim the draft.
  let magicLinkSent = false;
  if (!session) {
    const token = await createMagicToken(email);
    const url = `${appUrl()}/auth/verify?token=${encodeURIComponent(token)}&next=/dashboard`;
    try {
      await sendMagicLinkEmail(email, url);
      magicLinkSent = true;
    } catch {
      console.error("magic link email failed on draft save");
      // Dev convenience: when email isn't configured, return the link so the
      // couple can still claim their draft. Never enabled in production.
      if (process.env.NODE_ENV !== "production" && !emailConfigured()) {
        return NextResponse.json({ ok: true, eventId, magicLinkSent: false, devMagicLink: url, signedIn: Boolean(session) });
      }
    }
  }

  return NextResponse.json({ ok: true, eventId, magicLinkSent, signedIn: Boolean(session) });
  } catch (err) {
    // DB down (e.g. embedded postgres not started) or any other server fault:
    // always answer JSON so the Studio shows the reason instead of
    // "Network error — please try again."
    console.error("studio save failed:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Could not save right now — the database is unreachable. Start it with `node scripts/dev-db.mjs`, then try again." },
      { status: 503 },
    );
  }
}
