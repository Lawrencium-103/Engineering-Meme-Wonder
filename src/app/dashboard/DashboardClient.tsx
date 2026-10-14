"use client";

import { useEffect, useState } from "react";
import { TIERS, TIER_ORDER, tierLabel, type TierId } from "@/lib/pricing";

interface EventRow {
  id: string;
  status: string;
  tier: string;
  guestCap: number;
  slug: string | null;
  groomName: string;
  brideName: string;
  monogram: string;
  weddingDate: string;
}

/** Paid tiers that go through checkout (FREE publishes without payment). */
const PAID_TIERS: TierId[] = ["CLASSIC", "GRAND", "EPIC"];

export function DashboardClient({ events: initial }: { events: EventRow[] }) {
  const [events] = useState(initial);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has("ref")) {
      window.history.replaceState({}, "", "/dashboard");
      setTimeout(() => window.location.reload(), 2500);
    }
  }, []);

  async function pay(eventId: string) {
    setError("");
    setBusy(eventId);
    try {
      const tier = normalize(selected[eventId] ?? "FREE");

      // FREE publishes in place — no checkout.
      if (tier === "FREE") {
        const res = await fetch("/api/payments/publish-free", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventId }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Could not publish.");
          return;
        }
        window.location.reload();
        return;
      }

      const res = await fetch("/api/payments/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, tier }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not start payment.");
        return;
      }
      window.location.href = data.checkoutUrl;
    } catch {
      setError("Network error — please try again.");
    } finally {
      setBusy(null);
    }
  }

  if (events.length === 0) {
    return (
      <div className="mt-10 border border-white/10 p-10 text-center">
        <p className="font-serif text-2xl text-rose-champagne">No wedding suite yet</p>
        <a href="/studio" className="mt-4 inline-block bg-gold text-onyx px-6 py-3 text-sm tracking-widest uppercase">
          Craft Your Wedding Suite
        </a>
      </div>
    );
  }

  return (
    <div className="mt-10 space-y-10">
      {error && <p className="text-sm text-red-400">{error}</p>}
      {events.map((ev) => (
        <EventCard key={ev.id} ev={ev} selected={selected} setSelected={setSelected} pay={pay} busy={busy} />
      ))}
    </div>
  );
}

function EventCard({
  ev,
  selected,
  setSelected,
  pay,
  busy,
}: {
  ev: EventRow;
  selected: Record<string, string>;
  setSelected: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  pay: (id: string) => void;
  busy: string | null;
}) {
  const currentTier = normalize(selected[ev.id] ?? ev.tier);
  const branded = currentTier === "FREE";
  return (
    <div className="border border-white/10 p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-serif text-2xl text-rose-champagne">
          {ev.groomName} <span className="font-script text-gold">&</span> {ev.brideName}
        </h2>
        <StatusPill status={ev.status} />
      </div>
      <p className="mt-1 text-xs text-rose-champagne/50">
        {ev.weddingDate} · monogram {ev.monogram} · cap {ev.guestCap}
      </p>
      {ev.status === "PUBLISHED" && ev.slug ? (
        <PublishedPanel ev={ev} />
      ) : ev.status === "ARCHIVED" ? (
        <p className="mt-6 text-sm text-rose-champagne/50">This suite is archived.</p>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a
              href={`/preview/${ev.id}`}
              className="border border-gold/60 px-5 py-2.5 text-xs uppercase tracking-widest text-gold hover:bg-gold/10"
            >
              Preview invitation →
            </a>
            <span className="text-xs text-rose-champagne/40">
              No payment needed to preview — this is what guests will see.
            </span>
          </div>
          <TierPicker ev={ev} currentTier={currentTier} branded={branded} setSelected={setSelected} pay={pay} busy={busy} />
        </>
      )}
    </div>
  );
}

function TierPicker({
  ev,
  currentTier,
  branded,
  setSelected,
  pay,
  busy,
}: {
  ev: EventRow;
  currentTier: TierId;
  branded: boolean;
  setSelected: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  pay: (id: string) => void;
  busy: string | null;
}) {
  return (
    <div className="mt-6">
      <p className="mb-3 text-xs uppercase tracking-wider text-rose-champagne/60">Choose your tier</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {TIER_ORDER.map((id) => {
          const t = TIERS[id];
          const active = currentTier === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setSelected((s) => ({ ...s, [ev.id]: id }))}
              className={`border p-4 text-left transition-colors ${
                active ? "border-gold bg-gold/10" : "border-white/10 hover:border-white/30"
              }`}
            >
              <p className="font-serif text-lg text-gold">
                {t.label}
                {id === "GRAND" && <span className="text-xs text-rose-champagne/50"> · popular</span>}
              </p>
              <p className="mt-1 text-xs text-rose-champagne/60">Up to {t.maxGuests} guests</p>
              <p className="mt-2 text-sm text-alabaster">
                {t.basePriceMinor === 0 ? "Free" : `₦${(t.basePriceMinor / 100).toLocaleString("en-NG")}`}
              </p>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => pay(ev.id)}
        disabled={busy === ev.id}
        className="mt-5 bg-gold text-onyx px-8 py-3 text-sm tracking-widest uppercase hover:bg-gold/90 disabled:opacity-50"
      >
        {busy === ev.id ? "Redirecting…" : currentTier === "FREE" ? "Publish free" : "Pay to publish"}
      </button>
      <p className="mt-2 text-xs text-rose-champagne/40">
        {branded
          ? "Free tier shows Aravow branding and is capped at 30 guests."
          : "Secure checkout · your page goes live the moment payment is confirmed."}
      </p>
    </div>
  );
}

function normalize(raw: string): TierId {
  if (raw === "FREE" || raw === "CLASSIC" || raw === "GRAND" || raw === "EPIC") return raw;
  if (raw === "INTIMATE") return "FREE";
  return "CLASSIC";
}

function StatusPill({ status }: { status: string }) {
  const color =
    status === "PUBLISHED"
      ? "text-gold border-gold/50"
      : status === "PENDING_PAYMENT"
        ? "text-amber-400 border-amber-400/50"
        : "text-rose-champagne/60 border-white/20";
  return <span className={`border px-3 py-1 text-xs uppercase tracking-wider ${color}`}>{status}</span>;
}

function PublishedPanel({ ev }: { ev: EventRow }) {
  const slug = ev.slug!;
  const eventId = ev.id;
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const [upgradeTo, setUpgradeTo] = useState<TierId | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const currentTier = normalize(ev.tier);
  const paidSoFar = PAID_TIERS.includes(currentTier); // coarse: we just need upgrade targets
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);
  const url = `${origin}/w/${slug}`;

  const upgradeTargets = TIER_ORDER.filter((id) => orderIndex(id) > orderIndex(currentTier));

  async function upgrade(tier: TierId) {
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/payments/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, tier }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not start upgrade.");
        return;
      }
      window.location.href = data.checkoutUrl;
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 border border-gold/30 bg-gold/5 p-5">
      <p className="text-xs uppercase tracking-wider text-gold mb-2">Your invitation is live</p>
      <div className="flex flex-wrap items-center gap-3">
        <code className="text-sm text-alabaster break-all">{url}</code>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="border border-white/20 px-3 py-1.5 text-xs hover:border-gold/60"
        >
          {copied ? "Copied ✓" : "Copy link"}
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(
            `You are cordially invited! 💛 View the invitation: ${url}`,
          )}`}
          target="_blank"
          rel="noreferrer"
          className="border border-white/20 px-3 py-1.5 text-xs hover:border-gold/60"
        >
          Share on WhatsApp
        </a>
        <a
          href={`/studio?event=${eventId}`}
          className="border border-white/20 px-3 py-1.5 text-xs hover:border-gold/60"
        >
          Edit details
        </a>
        <a
          href={`/gate/${eventId}`}
          className="bg-gold px-3 py-1.5 text-xs uppercase tracking-wider text-onyx hover:bg-gold/90"
        >
          Gate check-in →
        </a>
      </div>

      <div className="mt-4 border-t border-gold/20 pt-4">
        {upgradeTargets.length === 0 ? (
          <p className="text-xs text-rose-champagne/50">You are on our top tier.</p>
        ) : upgradeTo === null ? (
          <button
            type="button"
            onClick={() => setUpgradeTo(upgradeTargets[0])}
            className="text-xs text-gold underline underline-offset-4"
          >
            Upgrade tier (pay only the difference)
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs text-rose-champagne/60">
              New tier
              <select
                value={upgradeTo}
                onChange={(e) => setUpgradeTo(e.target.value as TierId)}
                className="ml-2 bg-white/5 border border-white/10 px-3 py-2 text-sm text-alabaster"
              >
                {upgradeTargets.map((id) => (
                  <option key={id} value={id}>
                    {tierLabel(id)} — up to {TIERS[id].maxGuests} guests
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => void upgrade(upgradeTo)}
              disabled={busy}
              className="bg-gold px-5 py-2 text-xs uppercase tracking-widest text-onyx hover:bg-gold/90 disabled:opacity-50"
            >
              {busy ? "Redirecting…" : "Pay difference"}
            </button>
            <button
              type="button"
              onClick={() => setUpgradeTo(null)}
              className="text-xs text-rose-champagne/50 underline underline-offset-4"
            >
              Cancel
            </button>
          </div>
        )}
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
        <p className="mt-2 text-xs text-rose-champagne/40">
          Existing payments are deducted automatically.
          {!paidSoFar && " Free tier upgrades pay the full tier price."}
        </p>
      </div>
    </div>
  );
}

function orderIndex(id: TierId): number {
  return TIER_ORDER.indexOf(id);
}
