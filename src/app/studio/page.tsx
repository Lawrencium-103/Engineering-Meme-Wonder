"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_TIMEZONES,
  CEREMONY_LABELS,
  emptyDraft,
  emptyFlyer,
  loadLocalDraft,
  saveLocalDraft,
  monogramFromNames,
  type StudioDraft,
  type CeremonyKind,
} from "@/lib/studio-schema";
import { meetsAA, ALABASTER } from "@/lib/contrast";
import { TEMPLATE_SPECS } from "@/lib/flyer/catalog-meta";
import { isTemplateFree } from "@/lib/pricing";
import { COLOUR_PRESETS } from "@/lib/flyer/presets";
import { HeroUpload } from "@/components/HeroUpload";
import { SignaturePad } from "@/components/SignaturePad";
import { LivePreview } from "@/components/LivePreview";
import Link from "next/link";

const OPTIONAL: CeremonyKind[] = ["TRADITIONAL", "COURT", "RELIGIOUS"];

export default function StudioPage() {
  const [draft, setDraft] = useState<StudioDraft>(emptyDraft);
  const [email, setEmail] = useState("");
  /** Agent's Customer Service ID given to the couple ("" = None). */
  const [agentCode, setAgentCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  /** Dev-only sign-in link (returned as devMagicLink when email isn't configured). */
  const [devLink, setDevLink] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  /** When set, the Studio is editing an existing event (PATCH) rather than a draft (POST). */
  const [editEventId, setEditEventId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<string | null>(null);

  useEffect(() => {
    // Hydration sentinel: tests (and slow devices) can wait for this before
    // interacting with controlled inputs.
    document.documentElement.setAttribute("data-av-ready", "1");
  }, []);

  useEffect(() => {
    const local = loadLocalDraft();
    if (local) setDraft({ ...local, flyer: { ...emptyFlyer(), ...(local.flyer ?? {}) } });
    void (async () => {
      const params = new URLSearchParams(window.location.search);
      const requested = params.get("event");
      // Only prefill from the server when explicitly editing an event —
      // otherwise browser-local draft state wins.
      const res = await fetch(
        requested ? `/api/studio/draft?event=${encodeURIComponent(requested)}` : "/api/studio/draft",
      );
      if (res.ok) {
        const data = await res.json();
        setSignedIn(Boolean(data.signedIn));
        if (data.draft) {
          setDraft(draftFromServer(data.draft));
          setEditEventId(data.eventId ?? data.draft.event.id ?? null);
          setEditStatus(data.status ?? data.draft.event.status ?? null);
        } else if (requested) {
          setErrors(["You do not have access to that wedding suite."]);
        }
      } else {
        setSignedIn(false);
      }
    })();
  }, []);

  useEffect(() => {
    saveLocalDraft(draft);
  }, [draft]);

  function update<K extends keyof StudioDraft>(key: K, value: StudioDraft[K]) {
    setDraft((d) => {
      const next = { ...d, [key]: value };
      if (key === "groomName" || key === "brideName") {
        if (!next.monogramEdited) {
          next.monogram = monogramFromNames(next.groomName, next.brideName);
        }
      }
      return next;
    });
  }

  /** Patch just the flyer sub-object (invitation details / template choice). */
  function patchFlyer(p: Partial<StudioDraft["flyer"]>) {
    setDraft((d) => ({ ...d, flyer: { ...d.flyer, ...p } }));
  }

  const storyChars = draft.story.length;
  const textOnPrimaryOk = useMemo(
    () => meetsAA(ALABASTER, draft.theme.primary),
    [draft.theme.primary],
  );

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setErrors([]);
    setSaved(false);
    setDevLink(null);
    setSaving(true);
    try {
      const payload = {
        groomName: draft.groomName,
        brideName: draft.brideName,
        monogram: draft.monogram,
        weddingDate: draft.weddingDate,
        timezone: draft.timezone,
        theme: draft.theme,
        heroImageUrl: draft.heroImageUrl,
        groomSignatureUrl: draft.groomSignatureUrl,
        brideSignatureUrl: draft.brideSignatureUrl,
        story: draft.story,
        ceremonies: draft.ceremonies,
        flyer: draft.flyer,
        ...(signedIn ? {} : { email }),
        // Only sent on the anonymous sign-up path; the signed-in PATCH ignores it.
        ...(signedIn || !agentCode.trim() ? {} : { agentCode: agentCode.trim().toUpperCase() }),
      };

      // Editing an existing event (including a PUBLISHED one): PATCH it.
      // The slug is never part of this payload, so it can't change.
      // NB: anonymous users always POST (upsert by email) — PATCH requires a
      // session and returns 401 "Sign in first", which would strand a couple
      // who saved once (editEventId set) but hasn't clicked the magic link yet.
      const isEditing = Boolean(editEventId) && signedIn === true && editStatus !== "DRAFT";
      const res = isEditing
        ? await fetch(`/api/events/${editEventId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/studio/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      const data = await res.json().catch(() => ({} as Record<string, unknown>));
      if (!res.ok) {
        const issues = (data as { issues?: Array<{ message?: string }> }).issues;
        const errText = (data as { error?: unknown }).error;
        setErrors(
          issues?.map((i) => i.message ?? "Invalid input.") ?? [
            typeof errText === "string" && errText ? errText : `Save failed (HTTP ${res.status}) — please try again.`,
          ],
        );
        return;
      }
      setSaved(true);
      const link = (data as { devMagicLink?: unknown }).devMagicLink;
      if (typeof link === "string" && link) setDevLink(link);
    } catch {
      setErrors(["Could not reach the server — is it running? Then try again."]);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <main className="min-h-dvh px-5 py-14 max-w-2xl mx-auto pb-40">
        <nav className="mb-12 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-[0.62rem] uppercase tracking-[0.3em] text-rose-champagne/70 transition-colors hover:text-gold"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/aravow-mark.png" alt="" className="h-9 w-9" />
            Aravow
          </Link>
          <Link
            href="/dashboard"
            className="text-[0.62rem] uppercase tracking-[0.24em] text-rose-champagne/70 transition-colors hover:text-gold"
          >
            Dashboard
          </Link>
        </nav>
        <p className="text-gold tracking-[0.35em] text-xs uppercase">Aravow Studio</p>
        <h1 className="font-serif text-4xl md:text-5xl font-light mt-4 leading-tight">
          Craft Your <em className="italic text-gold">Wedding Suite</em>
        </h1>
        <p className="mt-3 text-sm text-rose-champagne/70">
          Your draft saves automatically in this browser.
        </p>
        {/* Live card preview: sits above the form on all normal screens; on
            xl+ it becomes a fixed overlay in the bottom-right corner. */}
        <div className="mx-auto mt-10 w-full max-w-[300px] xl:pointer-events-none xl:fixed xl:bottom-6 xl:right-6 xl:z-40 xl:mx-0 xl:mt-0 xl:w-[300px] xl:max-w-none">
          <div className="pointer-events-auto max-h-[80vh] overflow-y-auto">
            <LivePreview draft={draft} />
          </div>
        </div>
        <form onSubmit={handleSave} className="mt-12 space-y-12">
          <NamesSection draft={draft} setDraft={setDraft} update={update} />
          <DaySection draft={draft} update={update} />
          <DesignSection draft={draft} patchFlyer={patchFlyer} />
          <InvitationSection draft={draft} patchFlyer={patchFlyer} />
          <Section title="Hero Photo">
            <HeroUpload value={draft.heroImageUrl} onChange={(url) => update("heroImageUrl", url)} />
          </Section>
          <ColorsSection draft={draft} setDraft={setDraft} textOnPrimaryOk={textOnPrimaryOk} />
          <Section title="Ceremonies">
            <p className="-mt-6 mb-6 text-xs text-rose-champagne/50">
              Reception is required. Add any other events you are hosting.
            </p>
            {draft.ceremonies.map((c, idx) => (
              <CeremonyEditor
                key={c.kind}
                index={idx}
                draft={draft}
                setDraft={setDraft}
                optional={OPTIONAL.includes(c.kind)}
              />
            ))}
          </Section>
          <Section title="Your Story">
            <textarea
              className={inputCls + " min-h-32"}
              maxLength={500}
              value={draft.story}
              onChange={(e) => update("story", e.target.value)}
              placeholder="How you met, the proposal, what this day means…"
            />
            <p className={`mt-1 text-xs ${storyChars >= 500 ? "text-amber-400" : "text-rose-champagne/40"}`}>
              {storyChars}/500
            </p>
          </Section>
          <Section title="Signatures">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <SignaturePad
                label="Groom"
                value={draft.groomSignatureUrl}
                onChange={(url) => update("groomSignatureUrl", url)}
              />
              <SignaturePad
                label="Bride"
                value={draft.brideSignatureUrl}
                onChange={(url) => update("brideSignatureUrl", url)}
              />
            </div>
          </Section>
          <SaveSection
            signedIn={signedIn}
            email={email}
            setEmail={setEmail}
            agentCode={agentCode}
            setAgentCode={setAgentCode}
            saving={saving}
            saved={saved}
            devLink={devLink}
            errors={errors}
          />
        </form>
      </main>
    </>
  );
}

const inputCls =
  "w-full bg-white/5 border border-white/10 px-4 py-3 text-sm text-alabaster placeholder:text-rose-champagne/30 focus:outline-none focus:border-gold/60";

/** CSS-only scroll reveal — no framer on server-rendered markup (no hydration race). */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="reveal">
      <h2 className="font-serif text-2xl font-light mb-5 text-rose-champagne">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs uppercase tracking-wider text-rose-champagne/60">
        {label}
      </span>
      {children}
    </label>
  );
}

type UpdateFn = <K extends keyof StudioDraft>(key: K, value: StudioDraft[K]) => void;

function NamesSection({
  draft,
  setDraft,
  update,
}: {
  draft: StudioDraft;
  setDraft: React.Dispatch<React.SetStateAction<StudioDraft>>;
  update: UpdateFn;
}) {
  return (
    <Section title="The Couple">
      <div className="space-y-5">
        <Field label="Groom's full name">
          <input
            className={inputCls}
            value={draft.groomName}
            onChange={(e) => update("groomName", e.target.value)}
            placeholder="Chidi Okafor"
            required
          />
        </Field>
        <Field label="Bride's full name">
          <input
            className={inputCls}
            value={draft.brideName}
            onChange={(e) => update("brideName", e.target.value)}
            placeholder="Amara Nwosu"
            required
          />
        </Field>
        <Field label="Monogram (max 5 letters)">
          <input
            className={inputCls + " w-32 tracking-[0.3em] uppercase"}
            value={draft.monogram}
            maxLength={5}
            onChange={(e) => {
              const v = e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 5);
              setDraft((d) => ({ ...d, monogram: v, monogramEdited: true }));
            }}
            placeholder="CO"
          />
          <p className="mt-1 text-xs text-rose-champagne/40">
            Auto-generated from your names — edit freely. It appears on guest passes (e.g. G-CO-001).
          </p>
        </Field>
      </div>
    </Section>
  );
}

function DaySection({ draft, update }: { draft: StudioDraft; update: UpdateFn }) {
  return (
    <Section title="The Day">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="Wedding date">
          <input
            type="date"
            className={inputCls}
            value={draft.weddingDate}
            onChange={(e) => update("weddingDate", e.target.value)}
            required
          />
        </Field>
        <Field label="Time zone">
          <select
            className={inputCls}
            value={draft.timezone}
            onChange={(e) => update("timezone", e.target.value)}
          >
            {DEFAULT_TIMEZONES.map((tz) => (
              <option key={tz} value={tz} className="bg-onyx">
                {tz}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </Section>
  );
}

function ColorsSection({
  draft,
  setDraft,
  textOnPrimaryOk,
}: {
  draft: StudioDraft;
  setDraft: React.Dispatch<React.SetStateAction<StudioDraft>>;
  textOnPrimaryOk: boolean;
}) {
  return (
    <Section title="Color Theme">
      <p className="mb-3 text-xs text-rose-champagne/50">
        Start from an aso-ebi palette, then fine-tune below.
      </p>
      <div className="mb-5 flex flex-wrap gap-2">
        {COLOUR_PRESETS.map((p) => {
          const active = draft.theme.primary === p.primary && draft.theme.accent === p.accent;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() =>
                setDraft((d) => ({
                  ...d,
                  theme: { ...d.theme, primary: p.primary, accent: p.accent },
                  flyer: {
                    ...d.flyer,
                    palette: p.swatches.map((s) => ({ ...s })),
                  },
                }))
              }
              className={`flex items-center gap-2 border px-3 py-2 text-xs transition-colors ${
                active ? "border-gold bg-gold/10 text-gold" : "border-white/10 text-rose-champagne/70 hover:border-gold/40"
              }`}
            >
              <span className="flex">
                {[p.primary, p.accent, ...p.swatches.slice(1, 2).map((s) => s.hex)].map((hex, i) => (
                  <span
                    key={i}
                    className="inline-block h-4 w-4 rounded-full border border-white/20"
                    style={{ background: hex, marginLeft: i === 0 ? 0 : -6 }}
                  />
                ))}
              </span>
              {p.name}
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-5">
        <Field label="Primary">
          <div className="flex items-center gap-3">
            <input
              type="color"
              className="h-10 w-14 cursor-pointer bg-transparent"
              value={draft.theme.primary}
              onChange={(e) =>
                setDraft((d) => ({ ...d, theme: { ...d.theme, primary: e.target.value } }))
              }
            />
            <span className="font-mono text-xs text-rose-champagne/60">{draft.theme.primary}</span>
          </div>
        </Field>
        <Field label="Accent">
          <div className="flex items-center gap-3">
            <input
              type="color"
              className="h-10 w-14 cursor-pointer bg-transparent"
              value={draft.theme.accent}
              onChange={(e) =>
                setDraft((d) => ({ ...d, theme: { ...d.theme, accent: e.target.value } }))
              }
            />
            <span className="font-mono text-xs text-rose-champagne/60">{draft.theme.accent}</span>
          </div>
        </Field>
      </div>
      <div className="mt-4 p-4 text-sm" style={{ background: draft.theme.primary, color: ALABASTER }}>
        Preview — <span style={{ color: draft.theme.accent }}>accent text</span> on your primary color.
      </div>
      {!textOnPrimaryOk && (
        <p className="mt-2 text-xs text-amber-400 reveal">
          ⚠ Contrast warning: light text on this primary color is below 4.5:1 (WCAG AA).
          Choose a darker primary for better legibility.
        </p>
      )}
    </Section>
  );
}

/**
 * Template picker — the curated flyer designs (NG-001…). Spec metadata only;
 * thumbnails are palette swatches so we don't bundle the render engine client-side.
 */
function DesignSection({
  draft,
  patchFlyer,
}: {
  draft: StudioDraft;
  patchFlyer: (p: Partial<StudioDraft["flyer"]>) => void;
}) {
  const selected = draft.flyer.templateId || TEMPLATE_SPECS[0].id;
  return (
    <Section title="Design">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {TEMPLATE_SPECS.map((t) => {
          const active = t.id === selected;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => patchFlyer({ templateId: t.id })}
              className={`border p-3 text-left transition-colors ${
                active ? "border-gold bg-gold/10" : "border-white/10 hover:border-gold/40"
              }`}
            >
              <div
                className="relative mb-3 flex h-32 w-full items-center justify-center overflow-hidden"
                style={{ background: t.palette.background }}
              >
                <span
                  className="flex h-full w-full items-center justify-center gap-2"
                  style={{ background: t.palette.background }}
                  aria-hidden="true"
                >
                  <span className="font-serif text-lg italic" style={{ color: t.palette.primary }}>
                    Aa
                  </span>
                  <span className="inline-block h-3 w-3" style={{ background: t.palette.accent }} />
                </span>
                {/* Real rendered thumbnail (npm run thumbnails); sits over the
                    swatch and hides itself if the PNG is not present yet. */}
                <img
                  src={`/templates/${t.id}.png`}
                  alt={t.name}
                  className="absolute inset-0 h-full w-full object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>
              <p className="text-sm text-alabaster">{t.name}</p>
              <p className="mt-1 text-xs text-rose-champagne/50">{t.category}</p>
              <p
                className="mt-2 text-xs uppercase tracking-widest"
                style={{ color: active ? "#D4AF37" : "rgba(232,211,196,0.35)" }}
              >
                {active ? "✓ Selected" : isTemplateFree(t.id) ? "Free tier" : "Paid tier"}
              </p>
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-rose-champagne/40">
        The invitation-flyer design used for your save-the-date card and share image.
      </p>
    </Section>
  );
}

/** Rich invitation content the flyer templates render (families, colours, scripture, RSVP). */
function InvitationSection({
  draft,
  patchFlyer,
}: {
  draft: StudioDraft;
  patchFlyer: (p: Partial<StudioDraft["flyer"]>) => void;
}) {
  const f = draft.flyer;
  return (
    <Section title="Invitation Details">
      <div className="space-y-5">
        <Field label="Hashtag (optional)">
          <input
            className={inputCls}
            value={f.hashtag}
            onChange={(e) => patchFlyer({ hashtag: e.target.value })}
            placeholder="#OladejiWedsLawrence"
            maxLength={60}
          />
        </Field>
        <Field label="Invitation line">
          <input
            className={inputCls}
            value={f.invitationMessage}
            onChange={(e) => patchFlyer({ invitationMessage: e.target.value })}
            placeholder="Together with their families, request the honour of your presence"
            maxLength={300}
          />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="Bride's parents">
            <input
              className={inputCls}
              value={f.families.brideParents}
              onChange={(e) => patchFlyer({ families: { ...f.families, brideParents: e.target.value } })}
              placeholder="Mr. & Mrs. Lawrence"
              maxLength={200}
            />
          </Field>
          <Field label="Groom's parents">
            <input
              className={inputCls}
              value={f.families.groomParents}
              onChange={(e) => patchFlyer({ families: { ...f.families, groomParents: e.target.value } })}
              placeholder="Mr. & Mrs. Oladeji"
              maxLength={200}
            />
          </Field>
        </div>
        <Field label="Family intro line">
          <input
            className={inputCls}
            value={f.families.introLine}
            onChange={(e) => patchFlyer({ families: { ...f.families, introLine: e.target.value } })}
            placeholder="Joyfully invite you to the Wedding Ceremony of their children"
            maxLength={200}
          />
        </Field>
        <Field label="Scripture or quote (optional)">
          <textarea
            className={inputCls}
            rows={2}
            value={f.scripture}
            onChange={(e) => patchFlyer({ scripture: e.target.value })}
            placeholder="And now these three remain: faith, hope and love…"
            maxLength={400}
          />
        </Field>
        <Field label="Closing line (optional)">
          <input
            className={inputCls}
            value={f.closingMessage}
            onChange={(e) => patchFlyer({ closingMessage: e.target.value })}
            placeholder="Can't wait to celebrate with you!"
            maxLength={200}
          />
        </Field>
        <div>
          <p className="mb-2 text-xs uppercase tracking-wider text-rose-champagne/60">RSVP contacts (name + phone)</p>
          <div className="space-y-2">
            {f.rsvpContacts.map((c, i) => (
              <div key={i} className="flex gap-2">
                <input
                  className={inputCls}
                  value={c.name}
                  placeholder="Name"
                  maxLength={60}
                  onChange={(e) => {
                    const next = [...f.rsvpContacts];
                    next[i] = { ...next[i], name: e.target.value };
                    patchFlyer({ rsvpContacts: next });
                  }}
                />
                <input
                  className={inputCls}
                  value={c.phone}
                  placeholder="0803…"
                  maxLength={30}
                  onChange={(e) => {
                    const next = [...f.rsvpContacts];
                    next[i] = { ...next[i], phone: e.target.value };
                    patchFlyer({ rsvpContacts: next });
                  }}
                />
                <button
                  type="button"
                  className="border border-white/15 px-3 text-xs text-rose-champagne/50 hover:border-red-400/50"
                  onClick={() => patchFlyer({ rsvpContacts: f.rsvpContacts.filter((_, j) => j !== i) })}
                  aria-label="Remove contact"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          {f.rsvpContacts.length < 4 && (
            <button
              type="button"
              className="mt-2 text-xs text-gold underline underline-offset-4"
              onClick={() => patchFlyer({ rsvpContacts: [...f.rsvpContacts, { name: "", phone: "" }] })}
            >
              + Add contact
            </button>
          )}
        </div>
        <div>
          <p className="mb-2 text-xs uppercase tracking-wider text-rose-champagne/60">Colours of the day (optional)</p>
          <div className="space-y-2">
            {f.palette.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="color"
                  value={s.hex}
                  onChange={(e) => {
                    const next = [...f.palette];
                    next[i] = { ...next[i], hex: e.target.value };
                    patchFlyer({ palette: next });
                  }}
                  className="h-10 w-12 border border-white/15 bg-transparent"
                  aria-label={`Swatch ${i + 1} colour`}
                />
                <input
                  className={inputCls}
                  value={s.label}
                  placeholder="Champagne Gold"
                  maxLength={40}
                  onChange={(e) => {
                    const next = [...f.palette];
                    next[i] = { ...next[i], label: e.target.value };
                    patchFlyer({ palette: next });
                  }}
                />
                <button
                  type="button"
                  className="border border-white/15 px-3 text-xs text-rose-champagne/50 hover:border-red-400/50"
                  onClick={() => patchFlyer({ palette: f.palette.filter((_, j) => j !== i) })}
                  aria-label="Remove swatch"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          {f.palette.length < 6 && (
            <button
              type="button"
              className="mt-2 text-xs text-gold underline underline-offset-4"
              onClick={() => patchFlyer({ palette: [...f.palette, { label: "", hex: "#D4AF37" }] })}
            >
              + Add colour
            </button>
          )}
        </div>
      </div>
    </Section>
  );
}


function CeremonyEditor({
  index,
  draft,
  setDraft,
  optional,
}: {
  index: number;
  draft: StudioDraft;
  setDraft: React.Dispatch<React.SetStateAction<StudioDraft>>;
  optional: boolean;
}) {
  const c = draft.ceremonies[index];
  const patch = (p: Partial<typeof c>) =>
    setDraft((d) => {
      const ceremonies = [...d.ceremonies];
      ceremonies[index] = { ...ceremonies[index], ...p };
      return { ...d, ceremonies };
    });

  return (
    <div className="mb-8 border border-white/10 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-serif text-lg text-gold">{CEREMONY_LABELS[c.kind]}</h3>
        {optional ? (
          <label className="flex items-center gap-2 text-xs text-rose-champagne/60">
            <input
              type="checkbox"
              checked={c.enabled}
              onChange={(e) => patch({ enabled: e.target.checked })}
              className="accent-[#D4AF37]"
            />
            include
          </label>
        ) : (
          <span className="text-xs text-rose-champagne/40">required</span>
        )}
      </div>
      {(c.enabled || !optional) && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Venue name">
              <input className={inputCls} value={c.venueName} onChange={(e) => patch({ venueName: e.target.value })} />
            </Field>
            <Field label="Start time">
              <input
                type="datetime-local"
                className={inputCls}
                value={c.startsAt}
                onChange={(e) => patch({ startsAt: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Address">
            <input className={inputCls} value={c.address} onChange={(e) => patch({ address: e.target.value })} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Google Maps link">
              <input
                className={inputCls}
                value={c.mapsUrl}
                onChange={(e) => patch({ mapsUrl: e.target.value })}
                placeholder="https://maps.app.goo.gl/…"
              />
            </Field>
            <Field label="Dress code (optional)">
              <input
                className={inputCls}
                value={c.dressCode}
                onChange={(e) => patch({ dressCode: e.target.value })}
                placeholder="Aso-ebi: Gold & Ivory"
              />
            </Field>
          </div>
        </div>
      )}
    </div>
  );
}

function SaveSection({
  signedIn,
  email,
  setEmail,
  agentCode,
  setAgentCode,
  saving,
  saved,
  devLink,
  errors,
}: {
  signedIn: boolean | null;
  email: string;
  setEmail: (v: string) => void;
  agentCode: string;
  setAgentCode: (v: string) => void;
  saving: boolean;
  saved: boolean;
  devLink: string | null;
  errors: string[];
}) {
  return (
    <div className="border-t border-white/10 pt-8">
      {signedIn === false && (
        <>
          <Field label="Your email — we'll send a sign-in link to claim this draft">
            <input
              type="email"
              className={inputCls}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </Field>
          <div className="mt-5">
            <Field label="Customer Service ID (if an agent signed you up)">
              <div className="flex gap-2">
                <input
                  className={inputCls + " uppercase"}
                  value={agentCode}
                  onChange={(e) => setAgentCode(e.target.value.toUpperCase())}
                  placeholder="AV-01-SWT"
                  maxLength={20}
                  autoComplete="off"
                  aria-label="Customer Service ID"
                />
                <button
                  type="button"
                  onClick={() => setAgentCode("")}
                  disabled={!agentCode}
                  className={`shrink-0 border px-4 text-xs uppercase tracking-[0.2em] transition-colors ${
                    !agentCode
                      ? "border-gold/60 bg-gold/10 text-gold"
                      : "border-white/15 text-rose-champagne/50 hover:border-gold/60 hover:text-gold"
                  }`}
                  aria-pressed={!agentCode}
                >
                  None
                </button>
              </div>
              {!agentCode && (
                <p className="mt-1.5 text-xs text-rose-champagne/40">
                  No agent — that&apos;s fine. Tap None to confirm.
                </p>
              )}
            </Field>
          </div>
        </>
      )}
      {errors.length > 0 && (
        <ul className="mb-4 space-y-1 text-sm text-red-400">
          {errors.map((m, i) => (
            <li key={i}>• {m}</li>
          ))}
        </ul>
      )}
      {saved && (
        <>
          <p className="mb-4 text-sm text-gold">
            ✓ Draft saved.{" "}
            {signedIn === false && !devLink ? "Check your email for a sign-in link." : ""}
            {signedIn === true ? "You're signed in — this draft is on your account." : ""}
          </p>
          {devLink && (
            <div className="mb-4 rounded border border-gold/40 bg-gold/10 p-4">
              <p className="text-sm text-rose-champagne">
                No email service in dev — use this sign-in link to claim your draft:
              </p>
              <p className="mt-2 break-all text-xs text-rose-champagne/70">{devLink}</p>
              <div className="mt-3 flex gap-3">
                <a
                  href={devLink}
                  className="inline-block bg-gold px-4 py-2 text-sm text-onyx hover:bg-gold/90"
                >
                  Sign in and claim my draft →
                </a>
                <button
                  type="button"
                  onClick={() => void navigator.clipboard?.writeText(devLink)}
                  className="border border-gold/60 px-4 py-2 text-sm text-gold hover:bg-gold/10"
                >
                  Copy link
                </button>
              </div>
            </div>
          )}
        </>
      )}
      <button
        type="submit"
        disabled={saving}
        className="w-full bg-gold text-onyx py-4 text-sm tracking-widest uppercase hover:bg-gold/90 transition-colors disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save Draft"}
      </button>
      <p className="mt-3 text-center text-xs text-rose-champagne/40">
        Next: choose your tier and pay to publish.
      </p>
    </div>
  );
}

function draftFromServer(data: {
  event: {
    groomName: string;
    brideName: string;
    monogram: string;
    weddingDate: string;
    timezone: string;
    theme: { primary: string; accent: string; heroCrop?: { x: number; y: number; zoom: number } } | null;
    heroImageUrl: string | null;
    groomSignatureUrl: string | null;
    brideSignatureUrl: string | null;
    story: string | null;
    flyer?: {
      hashtag?: string;
      invitationMessage?: string;
      families?: { introLine?: string; brideParents?: string; groomParents?: string };
      palette?: Array<{ label: string; hex: string }>;
      scripture?: string;
      rsvpContacts?: Array<{ name: string; phone: string }>;
      templateId?: string;
      nameFont?: string;
    } | null;
  };
  ceremonies: Array<{
    kind: CeremonyKind;
    venueName: string;
    address: string | null;
    mapsUrl: string | null;
    startsAt: Date | string;
    dressCode: string | null;
  }>;
}): StudioDraft {
  const base = emptyDraft();
  return {
    ...base,
    groomName: data.event.groomName,
    brideName: data.event.brideName,
    monogram: data.event.monogram,
    monogramEdited: true,
    weddingDate: data.event.weddingDate,
    timezone: data.event.timezone,
    theme: data.event.theme
      ? { primary: data.event.theme.primary, accent: data.event.theme.accent, heroCrop: data.event.theme.heroCrop }
      : base.theme,
    heroImageUrl: data.event.heroImageUrl ?? "",
    groomSignatureUrl: data.event.groomSignatureUrl ?? "",
    brideSignatureUrl: data.event.brideSignatureUrl ?? "",
    story: data.event.story ?? "",
    flyer: {
      ...emptyFlyer(),
      ...(data.event.flyer ?? {}),
      families: { ...emptyFlyer().families, ...(data.event.flyer?.families ?? {}) },
      palette: data.event.flyer?.palette ?? [],
      rsvpContacts: data.event.flyer?.rsvpContacts ?? [],
    },
    ceremonies: base.ceremonies.map((bc) => {
      const found = data.ceremonies.find((sc) => sc.kind === bc.kind);
      if (!found) return bc;
      return {
        ...bc,
        enabled: true,
        venueName: found.venueName,
        address: found.address ?? "",
        mapsUrl: found.mapsUrl ?? "",
        startsAt: toLocalInput(found.startsAt, data.event.timezone),
        dressCode: found.dressCode ?? "",
      };
    }),
  };
}

function toLocalInput(startsAt: Date | string, timezone: string): string {
  const d = typeof startsAt === "string" ? new Date(startsAt) : startsAt;
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(d);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
    const hour = get("hour") === "24" ? "00" : get("hour");
    return `${get("year")}-${get("month")}-${get("day")}T${hour}:${get("minute")}`;
  } catch {
    return d.toISOString().slice(0, 16);
  }
}
