import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { giftPromises, guests, type PromiseItem } from "@/db/schema";
import { CASH_LABEL } from "@/lib/promises";
import { rateLimit, clientIp } from "@/lib/rate-limit";

/**
 * Submit (or update) a guest's gift promise. Authenticated by the guest's
 * public token — one promise per guest (UNIQUE guest_id); resubmit updates.
 */

const itemSchema = z
  .object({
    kind: z.enum(["CASH", "ITEM"]),
    label: z.string().trim().min(1).max(80),
    amountMinor: z.number().int().min(100).max(100_000_000).optional(),
    note: z.string().trim().min(1).max(120).optional(),
  })
  .refine((it) => it.kind !== "CASH" || (it.amountMinor != null && it.amountMinor > 0), {
    message: "Cash promises need an amount.",
  });

const bodySchema = z.object({
  publicToken: z.string().regex(/^[0-9a-f]{32}$/),
  items: z.array(itemSchema).min(1).max(15),
});

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!rateLimit(`promise:${ip}`, 15, 10 * 60 * 1000).ok) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  const { publicToken, items } = parsed.data;

  const [guest] = await db
    .select({ id: guests.id, eventId: guests.eventId })
    .from(guests)
    .where(eq(guests.publicToken, publicToken))
    .limit(1);
  if (!guest) {
    return NextResponse.json({ error: "Guest not found." }, { status: 404 });
  }

  // Normalise: cash carries the canonical label; strips empty notes.
  const clean: PromiseItem[] = items.map((it) => ({
    kind: it.kind,
    label: it.kind === "CASH" ? CASH_LABEL : it.label,
    ...(it.kind === "CASH" ? { amountMinor: it.amountMinor } : {}),
    ...(it.note ? { note: it.note } : {}),
  }));

  await db
    .insert(giftPromises)
    .values({
      eventId: guest.eventId,
      guestId: guest.id,
      items: clean,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: giftPromises.guestId,
      set: { items: clean, updatedAt: new Date() },
    });

  return NextResponse.json({ ok: true, items: clean });
}
