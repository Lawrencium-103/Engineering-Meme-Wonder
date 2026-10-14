import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { ceremonies, events, guests } from "@/db/schema";
import { RsvpFlow } from "./RsvpFlow";
import { isBranded, normalizeTier } from "@/lib/pricing";

export const dynamic = "force-dynamic";

async function getEvent(slug: string) {
  const [event] = await db
    .select()
    .from(events)
    .where(and(eq(events.slug, slug), eq(events.status, "PUBLISHED")))
    .limit(1);
  if (!event) return null;
  const rows = await db
    .select()
    .from(ceremonies)
    .where(eq(ceremonies.eventId, event.id))
    .orderBy(asc(ceremonies.sortOrder));
  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(guests)
    .where(eq(guests.eventId, event.id));
  return { event, ceremonies: rows, rsvpCount: total };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getEvent(slug);
  if (!data) return { title: "Wedding not found" };
  const { event } = data;
  const title = `${event.groomName} & ${event.brideName}`;
  return {
    title,
    description: `Join us in celebrating the wedding of ${event.groomName} and ${event.brideName}. RSVP at the link inside.`,
    openGraph: {
      title,
      description: `${event.weddingDate} · RSVP inside`,
      images: [{ url: `/w/${slug}/og`, width: 1200, height: 630 }],
    },
  };
}

function fmtDate(d: Date | string, tz: string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-NG", {
    timeZone: tz,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function fmtTime(d: Date | string, tz: string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-NG", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

const CEREMONY_ORDER = ["TRADITIONAL", "COURT", "RELIGIOUS", "RECEPTION"] as const;
const LABELS: Record<string, string> = {
  TRADITIONAL: "Traditional / Engagement",
  COURT: "Court Wedding",
  RELIGIOUS: "Religious Ceremony",
  RECEPTION: "Reception",
};

export default async function WeddingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getEvent(slug);
  if (!data) notFound();

  const { event, ceremonies: rows, rsvpCount } = data;
  const full = rsvpCount >= event.guestCap;
  const theme = event.theme ?? { primary: "#D4AF37", accent: "#E8D3C4" };
  const sorted = [...rows].sort(
    (a, b) =>
      CEREMONY_ORDER.indexOf(a.kind as (typeof CEREMONY_ORDER)[number]) -
      CEREMONY_ORDER.indexOf(b.kind as (typeof CEREMONY_ORDER)[number]),
  );
  const reception = sorted.find((c) => c.kind === "RECEPTION");
  const weddingDate = fmtDate(event.weddingDate, event.timezone);

  return (
    <main className="min-h-dvh">
      {/* Hero — pure CSS, zero JS */}
      <section
        className="relative flex min-h-[85dvh] flex-col items-center justify-center px-6 text-center"
        style={{
          background: event.heroImageUrl
            ? `linear-gradient(rgba(11,12,16,0.55), rgba(11,12,16,0.92)), url(${event.heroImageUrl}) center/cover`
            : undefined,
        }}
      >
        <p className="text-xs uppercase tracking-[0.4em]" style={{ color: theme.accent }}>
          The Wedding Celebration of
        </p>
        <h1 className="font-serif mt-4 text-5xl md:text-7xl font-light italic leading-tight">
          {event.groomName} <span style={{ color: theme.primary }}>&</span> {event.brideName}
        </h1>
        <p className="mt-6 text-sm tracking-widest text-alabaster/80 uppercase">{weddingDate}</p>
        {event.monogram && (
          <p className="font-script mt-8 text-4xl" style={{ color: theme.primary }}>
            {event.monogram}
          </p>
        )}
      </section>

      {/* The invitation card the couple designed in the Studio — same render
          the owner sees in /preview, served from /w/[slug]/card. */}
      <section className="mx-auto max-w-3xl px-6 py-14 text-center">
        <h2 className="font-serif mb-8 text-3xl font-light text-gold">Invitation</h2>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/w/${slug}/card`}
          alt={`${event.groomName} & ${event.brideName} invitation card`}
          className="mx-auto w-full max-w-[420px] shadow-2xl"
        />
      </section>

      {/* Story */}
      {event.story && (
        <section className="mx-auto max-w-xl px-6 py-16 text-center">
          <p className="whitespace-pre-line font-serif text-xl font-light leading-relaxed text-rose-champagne">
            {event.story}
          </p>
        </section>
      )}

      {/* Ceremonies */}
      <section className="mx-auto max-w-xl px-6 pb-16">
        <h2 className="font-serif mb-8 text-center text-3xl font-light text-gold">Ceremonies</h2>
        <div className="space-y-6">
          {sorted.filter((c) => c.kind !== "RECEPTION").map((c) => (
            <CeremonyCard key={c.id} c={c} tz={event.timezone} accent={theme.accent} />
          ))}
          {reception && <CeremonyCard c={reception} tz={event.timezone} accent={theme.accent} highlight />}
        </div>
      </section>

      {/* Flyer-supplied content: families, invitation line, colours, scripture, RSVP contacts.
          Identical to the owner preview so the two surfaces never diverge. */}
      {(() => {
        const f = event.flyer;
        const hasFamilies =
          f?.families &&
          (f.families.introLine || f.families.brideParents || f.families.groomParents);
        const hasAny =
          hasFamilies ||
          f?.invitationMessage ||
          (f?.palette && f.palette.length > 0) ||
          f?.scripture ||
          (f?.closingMessage) ||
          (f?.rsvpContacts && f.rsvpContacts.length > 0) ||
          f?.hashtag;
        if (!hasAny) return null;
        return (
          <section className="mx-auto max-w-xl px-6 pb-16 text-center">
            {f?.hashtag && (
              <p className="mb-6 text-sm tracking-[0.3em] uppercase" style={{ color: theme.accent }}>
                {f.hashtag}
              </p>
            )}
            {/* Canonical hierarchy: hosts first, couple below them, request line last. */}
            {hasFamilies && (
              <div className="mt-6 space-y-3 text-sm text-alabaster/85">
                {f!.families!.brideParents && <p>{f!.families!.brideParents}</p>}
                {f!.families!.groomParents && <p>{f!.families!.groomParents}</p>}
                {f!.families!.introLine && (
                  <p className="text-rose-champagne/70">{f!.families!.introLine}</p>
                )}
              </div>
            )}
            {(hasFamilies || f?.invitationMessage) && (
              <p className="mt-6 font-script text-4xl" style={{ color: theme.primary }}>
                {event.groomName} <span style={{ color: theme.accent }}>&</span>{" "}
                {event.brideName}
              </p>
            )}
            {f?.invitationMessage && (
              <p className="mt-4 font-serif text-xl font-light text-rose-champagne">
                {f.invitationMessage}
              </p>
            )}
            {f?.palette && f.palette.length > 0 && (
              <div className="mt-8">
                <p className="mb-3 text-xs uppercase tracking-wider text-rose-champagne/50">Colours of the day</p>
                <div className="flex flex-wrap justify-center gap-5">
                  {f.palette.map((s, i) => (
                    <div key={i} className="flex flex-col items-center gap-1.5">
                      <span
                        className="inline-block h-7 w-7 rounded-full border border-white/20"
                        style={{ background: s.hex }}
                      />
                      <span className="text-[11px] text-rose-champagne/60">{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {f?.scripture && (
              <p className="mt-8 whitespace-pre-line font-serif text-lg italic text-gold/90">
                &ldquo;{f.scripture}&rdquo;
              </p>
            )}
            {f?.closingMessage && (
              <p className="mt-8 font-script text-3xl" style={{ color: theme.accent }}>
                {f.closingMessage}
              </p>
            )}
            {f?.rsvpContacts && f.rsvpContacts.length > 0 && (
              <div className="mt-8">
                <p className="mb-2 text-xs uppercase tracking-wider text-rose-champagne/50">RSVP</p>
                <p className="text-sm text-alabaster/85">
                  {f.rsvpContacts.map((c) => `${c.name} ${c.phone}`).join(" · ")}
                </p>
              </div>
            )}
          </section>
        );
      })()}

      {/* RSVP */}
      <section className="mx-auto max-w-xl px-6 pb-24" id="rsvp">
        <h2 className="font-serif mb-3 text-center text-3xl font-light text-gold">Are you attending?</h2>
        <p className="mb-8 text-center text-sm text-rose-champagne/60">
          Kindly respond — we would love to celebrate with you.
        </p>
        <RsvpFlow slug={slug} full={full} />
      </section>

      {isBranded(normalizeTier(event.tier)) && (
        <footer className="border-t border-white/5 py-8 text-center text-xs text-rose-champagne/30">
          Crafted with Aravow
        </footer>
      )}
    </main>
  );
}

function CeremonyCard({
  c,
  tz,
  accent,
  highlight,
}: {
  c: typeof ceremonies.$inferSelect;
  tz: string;
  accent: string;
  highlight?: boolean;
}) {
  return (
    <div className={`border p-6 ${highlight ? "border-gold/40 bg-gold/5" : "border-white/10 bg-white/[0.03]"}`}>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-serif text-xl text-gold">{LABELS[c.kind]}</h3>
        <span className="text-xs uppercase tracking-wider" style={{ color: accent }}>
          {fmtDate(c.startsAt, tz)}
        </span>
      </div>
      <p className="mt-2 text-sm text-alabaster/90">{c.venueName}</p>
      {c.address && <p className="mt-1 text-xs text-rose-champagne/50">{c.address}</p>}
      <p className="mt-1 text-xs text-rose-champagne/60">{fmtTime(c.startsAt, tz)}</p>
      {c.dressCode && (
        <p className="mt-3 text-xs text-rose-champagne/70">
          <span className="uppercase tracking-wider text-rose-champagne/40">Dress code · </span>
          {c.dressCode}
        </p>
      )}
      {c.mapsUrl && (
        <a
          href={c.mapsUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-block text-xs text-gold underline underline-offset-4"
        >
          View on Google Maps →
        </a>
      )}
    </div>
  );
}

