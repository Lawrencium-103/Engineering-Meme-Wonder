import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { ceremonies, events } from "@/db/schema";
import { getSessionAccount } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { zonedTimeToUtc } from "@/lib/time";
import { TEMPLATES, getTemplate } from "@/lib/flyer/catalog";

const flyerSchema = z
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
          hex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
        }),
      )
      .max(6)
      .optional()
      .default([]),
    scripture: z.string().trim().max(400).optional().default(""),
    closingMessage: z.string().trim().max(200).optional().default(""),
    rsvpContacts: z
      .array(z.object({ name: z.string().trim().max(60), phone: z.string().trim().max(30) }))
      .max(4)
      .optional()
      .default([]),
    templateId: z.string().trim().max(20).optional().default(""),
  })
  .optional();

/**
 * Edit event details. Allowed in any status, but the SLUG IS IMMUTABLE
 * (spec §4.6) and tier/guestCap changes go through the payment/upgrade flow,
 * never this endpoint.
 */
const patchSchema = z.object({
  groomName: z.string().trim().min(1).max(100).optional(),
  brideName: z.string().trim().min(1).max(100).optional(),
  weddingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  timezone: z.string().min(1).max(64).optional(),
  theme: z
    .object({
      primary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      heroCrop: z
        .object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100), zoom: z.number().min(1).max(3) })
        .optional(),
    })
    .optional(),
  heroImageUrl: z.string().max(600).optional(),
  groomSignatureUrl: z.string().max(600).optional(),
  brideSignatureUrl: z.string().max(600).optional(),
  story: z.string().max(500).optional(),
  monogram: z.string().regex(/^[A-Z]{1,5}$/).optional(),
  flyer: flyerSchema,
  ceremonies: z
    .array(
      z.object({
        kind: z.enum(["TRADITIONAL", "COURT", "RELIGIOUS", "RECEPTION"]),
        enabled: z.boolean().optional().default(false),
        venueName: z.string().trim().max(200).optional().default(""),
        address: z.string().trim().max(300).optional(),
        mapsUrl: z.string().trim().max(600).optional(),
        startsAt: z.string().max(40).optional().default(""),
        dressCode: z.string().trim().max(120).optional(),
      }),
    )
    .max(4)
    .optional(),
})
  .superRefine((val, ctx) => {
    if (!val.ceremonies) return;
    const enabled = val.ceremonies.filter((c) => c.enabled);
    if (enabled.length === 0) {
      ctx.addIssue({ code: "custom", message: "At least one ceremony is required.", path: ["ceremonies"] });
      return;
    }
    const reception = enabled.find((c) => c.kind === "RECEPTION");
    if (!reception) {
      ctx.addIssue({ code: "custom", message: "A reception ceremony is required.", path: ["ceremonies"] });
    }
    for (const c of enabled) {
      if (!c.venueName) {
        ctx.addIssue({ code: "custom", message: `${c.kind}: venue name required.`, path: ["ceremonies"] });
      }
      if (!c.startsAt) {
        ctx.addIssue({ code: "custom", message: `${c.kind}: start time required.`, path: ["ceremonies"] });
      }
    }
  });

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const ip = clientIp(req);
  if (!rateLimit(`event-edit:${ip}`, 30, 60 * 1000).ok) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const session = await getSessionAccount();
  if (!session) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid event." }, { status: 400 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json({ error: first?.message ?? "Invalid input." }, { status: 400 });
  }
  const input = parsed.data;

  // Normalise flyer: unknown template ids fall back to the first catalog entry.
  if (input.flyer && input.flyer.templateId && !getTemplate(input.flyer.templateId)) {
    input.flyer = { ...input.flyer, templateId: TEMPLATES[0].spec.id };
  }

  const [event] = await db
    .select({ id: events.id, timezone: events.timezone })
    .from(events)
    .where(and(eq(events.id, id), eq(events.ownerId, session.id)))
    .limit(1);
  if (!event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  const { ceremonies: ceremonyInput, ...eventFields } = input;

  await db.transaction(async (tx) => {
    if (Object.keys(eventFields).length > 0) {
      await tx.update(events).set(eventFields).where(eq(events.id, id));
    }
    if (ceremonyInput) {
      // Replace ceremonies wholesale (simplest correct semantics for an editor).
      // Only enabled ceremonies are persisted, same as the draft-save route.
      const enabled = ceremonyInput.filter((c) => c.enabled);
      await tx.delete(ceremonies).where(eq(ceremonies.eventId, id));
      const tz = input.timezone ?? event.timezone;
      await tx.insert(ceremonies).values(
        enabled.map((c, idx) => ({
          eventId: id,
          kind: c.kind,
          venueName: c.venueName,
          address: c.address || null,
          mapsUrl: c.mapsUrl || null,
          startsAt: zonedTimeToUtc(c.startsAt, tz),
          dressCode: c.dressCode || null,
          isRequired: c.kind === "RECEPTION",
          sortOrder: idx,
        })),
      );
    }
  });

  return NextResponse.json({ ok: true });
}
