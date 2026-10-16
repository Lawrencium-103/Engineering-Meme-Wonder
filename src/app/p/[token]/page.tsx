import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { ceremonies, events, guests } from "@/db/schema";
import { getTemplate, TEMPLATES } from "@/lib/flyer/catalog";
import { renderFlyer } from "@/lib/flyer/render";
import { toFlyerData } from "@/lib/flyer/from-event";
import { isBranded, normalizeTier } from "@/lib/pricing";

export const dynamic = "force-dynamic";

/**
 * Guest landing page — the QR / personal-link target (/p/{publicToken}).
 *
 * A guest who scans their pass QR (or opens a share link) lands here and sees
 * an invitation card personalised with their own name ("Dear Amara,"), plus
 * their access pass and a WhatsApp share button. This is the surface that
 * makes the invitation feel like it was made for THEM, not a generic card.
 *
 * The page is public-by-token: knowing the 32-char token is the only auth.
 * Tokens are unguessable and rate-limited at the card/pass API layer.
 */

async function getGuestPage(token: string) {
  if (!/^[0-9a-f]{32}$/i.test(token)) return null;
  const [guest] = await db
    .select()
    .from(guests)
    .where(eq(guests.publicToken, token.toLowerCase()))
    .limit(1);
  if (!guest) return null;
  const [event] = await db
    .select()
    .from(events)
    .where(and(eq(events.id, guest.eventId), eq(events.status, "PUBLISHED")))
    .limit(1);
  if (!event) return null;
  const rows = await db
    .select()
    .from(ceremonies)
    .where(eq(ceremonies.eventId, event.id))
    .orderBy(asc(ceremonies.sortOrder));
  return { guest, event, rows };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const data = await getGuestPage(token);
  if (!data) return { title: "Invitation not found" };
  const { guest, event } = data;
  return {
    title: `${guest.firstName}, you're invited · ${event.groomName} & ${event.brideName}`,
    description: `You are warmly invited to the wedding of ${event.groomName} and ${event.brideName}. View your personal invitation and access pass.`,
    openGraph: {
      title: `${guest.firstName}, you're invited`,
      description: `${event.groomName} & ${event.brideName} · ${event.weddingDate}`,
      images: [{ url: `/w/${event.slug}/card?g=${token}`, width: 1080, height: 1920 }],
    },
  };
}

export default async function GuestPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await getGuestPage(token);
  if (!data) notFound();
  const { guest, event, rows } = data;

  const theme = event.theme ?? { primary: "#D4AF37", accent: "#E8D3C4" };
  const branded = isBranded(normalizeTier(event.tier));

  // Personalised card: render the couple's chosen template WITH this guest's
  // name so the "Dear {firstName}" line appears. Memoised in-process by the
  // card route's cache; this is the same render pipeline.
  const templateId =
    event.flyer?.templateId && getTemplate(event.flyer.templateId)
      ? event.flyer.templateId
      : TEMPLATES[0].spec.id;
  const template = getTemplate(templateId)!;
  let cardPng: string | null = null;
  try {
    const png = await renderFlyer(
      template,
      toFlyerData(event, rows, event.timezone, {
        firstName: guest.firstName,
        lastName: guest.lastName,
        side: guest.side,
      }),
      { scale: 1 },
    );
    cardPng = `data:image/png;base64,${png.toString("base64")}`;
  } catch (err) {
    console.error("guest card render failed", err);
  }

  const sideLabel = guest.side === "GROOM" ? "Groom's Guest" : "Bride's Guest";
  const shareText = encodeURIComponent(
    `I'm invited to ${event.groomName} & ${event.brideName}'s wedding! 💍`,
  );
  const shareUrl = encodeURIComponent(
    typeof process.env.APP_URL === "string" && process.env.APP_URL
      ? `${process.env.APP_URL}/p/${token}`
      : `/p/${token}`,
  );

  return (
    <main className="min-h-dvh">
      {/* Personal greeting header */}
      <section className="px-6 pt-14 pb-6 text-center">
        <p className="text-xs uppercase tracking-[0.4em]" style={{ color: theme.accent }}>
          {sideLabel}
        </p>
        <h1 className="font-serif mt-4 text-4xl md:text-5xl font-light italic text-alabaster">
          Dear {guest.firstName},
        </h1>
        <p className="mt-3 font-serif text-lg text-rose-champagne/80">
          You&apos;re warmly invited to the wedding of
        </p>
        <p className="font-script mt-2 text-4xl" style={{ color: theme.primary }}>
          {event.groomName} & {event.brideName}
        </p>
      </section>

      {/* Personalised invitation card */}
      {cardPng && (
        <section className="px-6 pb-10 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cardPng}
            alt={`${guest.firstName}'s invitation card`}
            className="mx-auto w-full max-w-[380px] shadow-2xl"
          />
        </section>
      )}

      {/* Access pass (if already generated) */}
      {guest.passImageUrl && (
        <section className="px-6 pb-10 text-center">
          <h2 className="font-serif mb-4 text-2xl font-light text-gold">Your Access Pass</h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={guest.passImageUrl}
            alt={`${guest.firstName}'s access pass`}
            className="mx-auto w-full max-w-[320px] shadow-2xl"
          />
          <p className="mt-3 font-mono text-sm tracking-widest text-gold">{guest.guestCode}</p>
        </section>
      )}

      {/* Actions */}
      <section className="px-6 pb-16 text-center">
        <div className="flex flex-wrap justify-center gap-3">
          <a
            href={`https://wa.me/?text=${shareText}%20${shareUrl}`}
            target="_blank"
            rel="noreferrer"
            className="bg-gold px-6 py-3 text-xs uppercase tracking-widest text-onyx hover:bg-gold/90"
          >
            Share on WhatsApp
          </a>
          {guest.passImageUrl && (
            <a
              href={guest.passImageUrl}
              download={`Aravow-${guest.guestCode}.png`}
              className="border border-white/20 px-6 py-3 text-xs uppercase tracking-widest hover:border-gold/60"
            >
              Download Pass
            </a>
          )}
        </div>
      </section>

      {branded && (
        <footer className="border-t border-white/5 py-8 text-center text-xs text-rose-champagne/30">
          <Link
            href="/"
            className="inline-flex items-center gap-2 transition-colors hover:text-gold"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/aravow-mark.png" alt="" className="h-6 w-6" />
            Crafted with Aravow
          </Link>
        </footer>
      )}
    </main>
  );
}
