import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { events } from "@/db/schema";
import { renderOgImage } from "@/lib/og";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  if (!rateLimit(`og:${clientIp(req)}`, 60, 60 * 1000).ok) {
    return new Response("Too many requests", { status: 429 });
  }
  const { slug } = await ctx.params;

  const [event] = await db
    .select({
      groomName: events.groomName,
      brideName: events.brideName,
      weddingDate: events.weddingDate,
      timezone: events.timezone,
      theme: events.theme,
      heroImageUrl: events.heroImageUrl,
    })
    .from(events)
    .where(and(eq(events.slug, slug), eq(events.status, "PUBLISHED")))
    .limit(1);

  if (!event) {
    return new Response("Not found", { status: 404 });
  }

  const png = await renderOgImage({
    groomName: event.groomName,
    brideName: event.brideName,
    weddingDate: new Date(event.weddingDate),
    timezone: event.timezone,
    theme: event.theme ?? { primary: "#D4AF37", accent: "#E8D3C4" },
    heroImageUrl: event.heroImageUrl,
  });

  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      // Deterministic per event — cache hard.
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
