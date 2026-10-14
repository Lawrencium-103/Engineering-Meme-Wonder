"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export interface GuestRow {
  id: string;
  side: "GROOM" | "BRIDE";
  guestCode: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  dietary: string | null;
  partySize: number;
  checkedInAt: string | null;
  createdAt: string;
}

interface Stats {
  total: number;
  totalPeople: number;
  totalCheckedIn: number;
  groomPeople: number;
  bridePeople: number;
  groomRsvps: number;
  brideRsvps: number;
}

export function GuestTable({ eventId, eventName }: { eventId: string; eventName: string }) {
  const [guests, setGuests] = useState<GuestRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [guestCap, setGuestCap] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sideFilter, setSideFilter] = useState<"ALL" | "GROOM" | "BRIDE">("ALL");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/guests`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not load guests.");
        return;
      }
      setGuests(data.guests);
      setGuestCap(data.guestCap);
      setStats({
        total: data.total,
        totalPeople: data.totalPeople,
        totalCheckedIn: data.totalCheckedIn,
        groomPeople: data.groomPeople,
        bridePeople: data.bridePeople,
        groomRsvps: data.groomRsvps,
        brideRsvps: data.brideRsvps,
      });
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function removeGuest(guestId: string) {
    setConfirmDelete(null);
    const res = await fetch(`/api/events/${eventId}/guests/${guestId}`, { method: "DELETE" });
    if (res.ok) void load();
    else setError("Could not delete this guest.");
  }

  async function copyCode(g: GuestRow) {
    await navigator.clipboard.writeText(g.guestCode);
    setCopiedId(g.id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return guests.filter((g) => {
      if (sideFilter !== "ALL" && g.side !== sideFilter) return false;
      if (!q) return true;
      return (
        g.guestCode.toLowerCase().includes(q) ||
        `${g.firstName} ${g.lastName}`.toLowerCase().includes(q) ||
        (g.email ?? "").toLowerCase().includes(q) ||
        (g.phone ?? "").includes(q)
      );
    });
  }, [guests, query, sideFilter]);

  const people = stats?.totalPeople ?? 0;
  const pct = guestCap > 0 ? Math.min(100, Math.round((people / guestCap) * 100)) : 0;
  const nearlyFull = people >= guestCap * 0.9 && people < guestCap;
  const isFull = people >= guestCap;

  return (
    <section className="mt-10 border border-white/10 bg-white/[0.02] p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-serif text-2xl text-rose-champagne">Guest manager</h3>
          <p className="text-xs text-rose-champagne/40">{eventName}</p>
        </div>
        <a
          href={`/api/events/${eventId}/guests/export`}
          className="border border-white/20 px-4 py-2 text-xs uppercase tracking-wider hover:border-gold/60 transition-colors"
        >
          Export CSV
        </a>
      </div>

      {/* Stat tiles */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="RSVPs" value={String(stats?.total ?? 0)} sub="guests registered" />
        <StatTile
          label="People expected"
          value={`${people}`}
          sub={`of ${guestCap} seats`}
          highlight={isFull ? "full" : nearlyFull ? "warn" : undefined}
        />
        <StatTile label="Checked in" value={`${stats?.totalCheckedIn ?? 0}`} sub="on the day" />
        <StatTile
          label="Groom / Bride"
          value={`${stats?.groomRsvps ?? 0} / ${stats?.brideRsvps ?? 0}`}
          sub={`${stats?.groomPeople ?? 0} + ${stats?.bridePeople ?? 0} people`}
        />
      </div>

      {/* Cap progress — counts PEOPLE not rows */}
      <div className="mt-4 border border-white/10 p-4">
        <div className="flex items-baseline justify-between text-sm">
          <span className="text-rose-champagne/70">
            {people} of {guestCap} seats filled
          </span>
          <span className={isFull ? "text-red-400" : nearlyFull ? "text-amber-400" : "text-gold"}>
            {pct}%
          </span>
        </div>
        <div className="mt-2 h-1.5 w-full bg-white/10">
          <div
            className={`h-full ${isFull ? "bg-red-500" : nearlyFull ? "bg-amber-400" : "bg-gold"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {(nearlyFull || isFull) && (
          <p className="mt-3 text-xs text-amber-400">
            {isFull
              ? "Your guest list is full — new RSVPs are being declined."
              : "Your guest list is nearly full."}{" "}
            Upgrade below to raise the cap. You only pay the difference.
          </p>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      {loading ? (
        <p className="mt-6 text-sm text-rose-champagne/40">Loading guests…</p>
      ) : guests.length === 0 ? (
        <p className="mt-6 text-sm text-rose-champagne/40">
          No RSVPs yet — share your link to start receiving them.
        </p>
      ) : (
        <>
          {/* Search + filter */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, email, phone or guest ID…"
              className="flex-1 min-w-[220px] bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-alabaster placeholder:text-rose-champagne/30 focus:border-gold/60 focus:outline-none"
            />
            <div className="flex gap-2">
              {(["ALL", "GROOM", "BRIDE"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSideFilter(s)}
                  className={`border px-3 py-1.5 text-xs uppercase tracking-wider transition-colors ${
                    sideFilter === s
                      ? "border-gold bg-gold/10 text-gold"
                      : "border-white/15 text-rose-champagne/50 hover:border-white/40"
                  }`}
                >
                  {s === "ALL" ? "All" : s === "GROOM" ? "Groom" : "Bride"}
                </button>
              ))}
            </div>
          </div>

          <GuestRows
            guests={filtered}
            totalGuests={guests.length}
            confirmDelete={confirmDelete}
            setConfirmDelete={setConfirmDelete}
            removeGuest={removeGuest}
            copyCode={copyCode}
            copiedId={copiedId}
          />
        </>
      )}
    </section>
  );
}

function StatTile({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub: string;
  highlight?: "full" | "warn";
}) {
  return (
    <div
      className={`border p-4 ${
        highlight === "full"
          ? "border-red-400/40 bg-red-400/5"
          : highlight === "warn"
            ? "border-amber-400/40 bg-amber-400/5"
            : "border-white/10 bg-white/[0.02]"
      }`}
    >
      <p className="text-[11px] uppercase tracking-wider text-rose-champagne/50">{label}</p>
      <p
        className={`mt-1 font-serif text-3xl font-light ${
          highlight === "full" ? "text-red-400" : highlight === "warn" ? "text-amber-400" : "text-gold"
        }`}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[11px] text-rose-champagne/40">{sub}</p>
    </div>
  );
}

function GuestRows({
  guests,
  totalGuests,
  confirmDelete,
  setConfirmDelete,
  removeGuest,
  copyCode,
  copiedId,
}: {
  guests: GuestRow[];
  totalGuests: number;
  confirmDelete: string | null;
  setConfirmDelete: (id: string | null) => void;
  removeGuest: (id: string) => void;
  copyCode: (g: GuestRow) => void;
  copiedId: string | null;
}) {
  if (guests.length === 0) {
    return (
      <p className="mt-6 text-sm text-rose-champagne/40">No guests match your search.</p>
    );
  }

  return (
    <div className="mt-5 overflow-x-auto">
      <table className="w-full min-w-[780px] text-left text-sm">
        <thead>
          <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-rose-champagne/50">
            <th className="py-2 pr-4">Guest ID</th>
            <th className="py-2 pr-4">Name</th>
            <th className="py-2 pr-4">Side</th>
            <th className="py-2 pr-4">Party</th>
            <th className="py-2 pr-4">Contact</th>
            <th className="py-2 pr-4">RSVP date</th>
            <th className="py-2 pr-4">Checked in</th>
            <th className="py-2" aria-label="actions" />
          </tr>
        </thead>
        <tbody>
          {guests.map((g) => (
            <tr key={g.id} className="border-b border-white/5 align-top hover:bg-white/[0.02]">
              <td className="py-3 pr-4">
                <button
                  type="button"
                  onClick={() => void copyCode(g)}
                  title="Click to copy guest ID — it matches their invitation card"
                  className="group inline-flex items-center gap-1.5 font-mono text-xs text-gold hover:text-gold/80"
                >
                  {g.guestCode}
                  <span className="text-[10px] text-rose-champagne/40 group-hover:text-gold">
                    {copiedId === g.id ? "✓" : "⧉"}
                  </span>
                </button>
              </td>
              <td className="py-3 pr-4">
                {g.firstName} {g.lastName}
                {g.dietary && (
                  <span className="block text-xs text-rose-champagne/50">dietary: {g.dietary}</span>
                )}
              </td>
              <td className="py-3 pr-4">
                <span
                  className={`text-[11px] uppercase tracking-wider ${
                    g.side === "GROOM" ? "text-sky-300/80" : "text-pink-300/80"
                  }`}
                >
                  {g.side === "GROOM" ? "Groom" : "Bride"}
                </span>
              </td>
              <td className="py-3 pr-4">
                <span className="text-sm text-alabaster">
                  {g.partySize} {g.partySize === 1 ? "person" : "people"}
                </span>
              </td>
              <td className="py-3 pr-4 text-xs text-alabaster/80">
                {g.email && <span className="block break-all">{g.email}</span>}
                {g.phone && <span className="block">{g.phone}</span>}
              </td>
              <td className="py-3 pr-4 text-xs text-rose-champagne/60">
                <span className="block">
                  {new Date(g.createdAt).toLocaleDateString("en-NG", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
                <span className="block text-[11px] text-rose-champagne/35">
                  {new Date(g.createdAt).toLocaleTimeString("en-NG", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </span>
              </td>
              <td className="py-3 pr-4">
                {g.checkedInAt ? (
                  <span className="text-xs text-gold">✓</span>
                ) : (
                  <span className="text-xs text-rose-champagne/30">—</span>
                )}
              </td>
              <td className="py-3 text-right">
                {confirmDelete === g.id ? (
                  <span className="flex justify-end gap-2">
                    <button
                      onClick={() => void removeGuest(g.id)}
                      className="text-xs text-red-400 underline underline-offset-4"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="text-xs text-rose-champagne/50 underline underline-offset-4"
                    >
                      Cancel
                    </button>
                  </span>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(g.id)}
                    title="Permanently delete this guest's data (NDPA)"
                    className="text-xs text-rose-champagne/40 underline underline-offset-4 hover:text-red-400"
                  >
                    Delete
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-rose-champagne/30">
        Showing {guests.length} of {totalGuests} guests · Guest ID matches the code printed on their
        invitation card — use it to identify them at the door. Deleting a guest permanently erases
        their data (NDPA); their ID is never reused.
      </p>
    </div>
  );
}
