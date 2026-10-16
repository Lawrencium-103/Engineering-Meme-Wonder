import { notFound, redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { ceremonies, events } from "@/db/schema";
import { getSessionAccount } from "@/lib/auth";
import { TEMPLATES, getTemplate } from "@/lib/flyer/catalog";
import { renderFlyer } from "@/lib/flyer/render";
import { toFlyerData } from "@/lib/flyer/from-event";
import { RsvpFlow } from "@/app/w/[slug]/RsvpFlow";

export const dynamic = "force-dynamic";

/** Owner-only preview of a DRAFT event. Same look as public page, gated. */
async function getPreviewEvent(id: string) {
  const session = await getSessionAccount();
  if (!session) return { denied: true as const };
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [event] = await db
    .select()
    .from(events)
    .where(and(eq(events.id, id), eq(events.ownerId, session.id)))
    .limit(1);
  if (!event) return null;
  const rows = await db
    .select()
    .from(ceremonies)
    .where(eq(ceremonies.eventId, event.id))
    .orderBy(asc(ceremonies.sortOrder));
  return { event, rows };
}


const ORDER = ["TRADITIONAL", "COURT", "RELIGIOUS", "RECEPTION"] as const;
const LABELS: Record<string, string> = {
  TRADITIONAL: "Traditional / Engagement",
  COURT: "Court Wedding",
  RELIGIOUS: "Religious Ceremony",
  RECEPTION: "Reception",
};

function fmtDate(d: Date | string, tz: string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-NG", {
    timeZone: tz, weekday: "long", day: "numeric", month: "long", year: "numeric",
  }).format(date);
}

function fmtTime(d: Date | string, tz: string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-NG", {
    timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true,
  }).format(date);
}


export default async function PreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { id } = await params;
  const { t: tParam } = await searchParams;
  const data = await getPreviewEvent(id);
  if (data && "denied" in data) redirect("/auth/check-email");
  if (!data) notFound();
  const { event, rows } = data;
  const theme = event.theme ?? { primary: "#D4AF37", accent: "#E8D3C4" };
  const sorted = [...rows].sort(
    (a, b) =>
      ORDER.indexOf(a.kind as (typeof ORDER)[number]) - ORDER.indexOf(b.kind as (typeof ORDER)[number]),
  );

  // Template choice: ?t= switcher for trying designs, else the saved pick, else catalog default.
  const savedId = event.flyer?.templateId;
  const templateId =
    (tParam && getTemplate(tParam) && tParam) || (savedId && getTemplate(savedId) && savedId) || TEMPLATES[0].spec.id;
  const template = getTemplate(templateId)!;

  // Render the REAL flyer with this event's content through the chosen design.
  let flyerPng: string | null = null;
  try {
    const png = await renderFlyer(template, toFlyerData(event, rows, event.timezone), { scale: 1 });
    flyerPng = `data:image/png;base64,${png.toString("base64")}`;
  } catch (err) {
    console.error("preview flyer render failed", err);
  }
  return (
    <main className="min-h-dvh">
      <div className="bg-gold px-4 py-3 text-center text-sm text-onyx">
        PREVIEW — only you can see this. Your page goes live after payment.{" "}
        <a href="/dashboard" className="underline underline-offset-4">Back to dashboard</a>
      </div>
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
        <p className="mt-6 text-sm tracking-widest text-alabaster/80 uppercase">
          {fmtDate(event.weddingDate, event.timezone)}
        </p>
        {event.monogram && (
          <p className="font-script mt-8 text-4xl" style={{ color: theme.primary }}>{event.monogram}</p>
        )}
      </section>
      {/* The real flyer, rendered through the chosen template with THIS event's content */}
      <section className="mx-auto max-w-3xl px-6 py-14 text-center">
        <h2 className="font-serif mb-2 text-3xl font-light text-gold">Invitation card</h2>
        <p className="mb-6 text-xs text-rose-champagne/50">
          {template.spec.name} · {template.spec.id} — switch designs below
        </p>
        <div className="mb-8 flex flex-wrap justify-center gap-3">
          {TEMPLATES.map((tpl) => {
            const active = tpl.spec.id === templateId;
            return (
              <a
                key={tpl.spec.id}
                href={`/preview/${id}?t=${encodeURIComponent(tpl.spec.id)}`}
                className={`border px-4 py-2 text-xs uppercase tracking-widest ${
                  active
                    ? "border-gold bg-gold/10 text-gold"
                    : "border-white/20 text-rose-champagne/60 hover:border-gold/50"
                }`}
              >
                {tpl.spec.name}
              </a>
            );
          })}
        </div>
        {flyerPng ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={flyerPng}
            alt={`${template.spec.name} invitation card`}
            className="mx-auto w-full max-w-[420px] shadow-2xl"
          />
        ) : (
          <p className="text-sm text-red-400">Card render failed — check the dev server logs.</p>
        )}
        {tParam && tParam !== savedId && (
          <p className="mt-4 text-xs text-rose-champagne/40">
            Trying a design — pick it in the Studio and Save Draft to keep it.
          </p>
        )}
      </section>
      {event.story && (
        <section className="mx-auto max-w-xl px-6 py-16 text-center">
          <p className="whitespace-pre-line font-serif text-xl font-light leading-relaxed text-rose-champagne">
            {event.story}
          </p>
        </section>
      )}
      <section className="mx-auto max-w-xl px-6 pb-16">
        <h2 className="font-serif mb-8 text-center text-3xl font-light text-gold">Ceremonies</h2>
        <div className="space-y-6">
          {sorted.map((c) => (
            <div
              key={c.id}
              className={`border p-6 ${c.kind === "RECEPTION" ? "border-gold/40 bg-gold/5" : "border-white/10 bg-white/[0.03]"}`}
            >
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-serif text-xl text-gold">{LABELS[c.kind]}</h3>
                <span className="text-xs uppercase tracking-wider" style={{ color: theme.accent }}>
                  {fmtDate(c.startsAt, event.timezone)}
                </span>
              </div>
              <p className="mt-2 text-sm text-alabaster/90">{c.venueName}</p>
              {c.address && <p className="mt-1 text-xs text-rose-champagne/50">{c.address}</p>}
              <p className="mt-1 text-xs text-rose-champagne/60">{fmtTime(c.startsAt, event.timezone)}</p>
              {c.dressCode && (
                <p className="mt-3 text-xs text-rose-champagne/70">
                  <span className="uppercase tracking-wider text-rose-champagne/40">Dress code · </span>
                  {c.dressCode}
                </p>
              )}
              {c.mapsUrl && (
                <a href={c.mapsUrl} target="_blank" rel="noreferrer"
                  className="mt-4 inline-block text-xs text-gold underline underline-offset-4">
                  View on Google Maps →
                </a>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Flyer-supplied content: families, invitation line, colours, scripture, RSVP contacts */}
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
          f?.closingMessage ||
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

      <section className="mx-auto max-w-xl px-6 pb-24">
        <h2 className="font-serif mb-3 text-center text-3xl font-light text-gold">Are you attending?</h2>
        <p className="mb-6 text-center text-xs uppercase tracking-wider text-amber-300/80">
          Test mode — try the form below. Nothing you enter here is saved.
        </p>
        <RsvpFlow
          slug=""
          full={false}
          test
          couple={{ groomName: event.groomName, brideName: event.brideName }}
        />
      </section>
      <footer className="border-t border-white/5 py-8 text-center text-xs text-rose-champagne/30">
        Crafted with Aravow
      </footer>
    </main>
  );
}
