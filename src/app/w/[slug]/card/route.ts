import { createHash } from "crypto";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { ceremonies, events, guests } from "@/db/schema";
import { getTemplate, TEMPLATES } from "@/lib/flyer/catalog";
import { toFlyerData } from "@/lib/flyer/from-event";
import { renderFlyer } from "@/lib/flyer/render";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public invitation-card image for a PUBLISHED wedding. This is the SAME
 * card the owner sees in /preview/[id] — same content mapper, same chosen
 * template — so guests always receive the invitation the couple designed.
 *
 * When a guest token is supplied (?g={publicToken}), the card is personalised
 * for that guest: a "Dear {firstName}" line is rendered above the couple's
 * names, matching the access pass. The generic card (no token) has no guest
 * line, so the owner preview and public share link stay generic.
 *
 * Rendering is memoised in-process per content hash (event fields + flyer
 * JSONB + ceremonies + guest): repeat views are free, and any Studio edit
 * changes the hash so the very next view re-renders. HTTP caching mirrors
 * /og in production; dev uses no-store so edits appear immediately.
 */

const cache = new Map<string, Buffer>();
const MAX_CACHE_ENTRIES = 64;

export async function GET(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  if (!rateLimit(`card:${clientIp(req)}`, 30, 60 * 1000).ok) {
    return new Response("Too many requests", { status: 429 });
  }
  const { slug } = await ctx.params;
  const guestToken = new URL(req.url).searchParams.get("g");

  const [event] = await db
    .select()
    .from(events)
    .where(and(eq(events.slug, slug), eq(events.status, "PUBLISHED")))
    .limit(1);
  if (!event) {
    return new Response("Not found", { status: 404 });
  }

  // Resolve the guest (optional). Invalid/unknown tokens fall back to the
  // generic card rather than erroring — a stale QR should still show the
  // invitation.
  let guest: { firstName: string; lastName: string; side: "GROOM" | "BRIDE" } | undefined;
  if (guestToken && /^[0-9a-f]{32}$/i.test(guestToken)) {
    const [row] = await db
      .select({
        firstName: guests.firstName,
        lastName: guests.lastName,
        side: guests.side,
      })
      .from(guests)
      .where(and(eq(guests.publicToken, guestToken.toLowerCase()), eq(guests.eventId, event.id)))
      .limit(1);
    if (row) guest = { firstName: row.firstName, lastName: row.lastName, side: row.side };
  }

  const rows = await db
    .select()
    .from(ceremonies)
    .where(eq(ceremonies.eventId, event.id))
    .orderBy(asc(ceremonies.sortOrder));

  // Saved design, falling back to the catalog default (mirrors Studio save).
  const templateId =
    event.flyer?.templateId && getTemplate(event.flyer.templateId)
      ? event.flyer.templateId
      : TEMPLATES[0].spec.id;
  const template = getTemplate(templateId)!;

  const hash = createHash("sha256")
    .update(
      JSON.stringify([
        event.id,
        event.monogram,
        event.groomName,
        event.brideName,
        event.weddingDate,
        event.theme,
        event.heroImageUrl,
        event.flyer,
        templateId,
        rows.map((c) => [c.kind, c.startsAt, c.venueName]),
        guest ? [guest.firstName, guest.lastName, guest.side] : null,
      ]),
    )
    .digest("hex");

  let png = cache.get(hash);
  if (!png) {
    try {
      png = await renderFlyer(
        template,
        toFlyerData(event, rows, event.timezone, guest),
        { scale: 1 },
      );
    } catch (err) {
      console.error(
        "public card render failed:",
        err instanceof Error ? `${err.name}: ${err.message}` : typeof err,
      );
      return new Response("Card render failed", { status: 500 });
    }
    if (cache.size >= MAX_CACHE_ENTRIES) {
      // Evict oldest entries (Map preserves insertion order).
      const firstKey = cache.keys().next().value;
      if (firstKey !== undefined) cache.delete(firstKey);
    }
    cache.set(hash, png);
  }

  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      // Personalised cards must not be cached across guests.
      "Cache-Control": guest
        ? "private, no-store"
        : process.env.NODE_ENV === "production"
          ? "public, max-age=86400, s-maxage=86400"
          : "no-store",
    },
  });
}
