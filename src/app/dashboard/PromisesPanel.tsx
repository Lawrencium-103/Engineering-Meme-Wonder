"use client";

import { useState } from "react";
import { formatNaira, promiseLine } from "@/lib/promises";
import type { PromiseItem } from "@/db/schema";

/**
 * Couple's view of gift promises: totals at the top, then each guest with
 * what they pledged. Lazy-loaded on toggle so the dashboard stays light.
 */

interface PromiseRow {
  guestCode: string;
  side: "GROOM" | "BRIDE";
  name: string;
  items: PromiseItem[];
  updatedAt: string;
}

export function PromisesPanel({ eventId }: { eventId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [count, setCount] = useState(0);
  const [totalCash, setTotalCash] = useState(0);
  const [rows, setRows] = useState<PromiseRow[]>([]);

  async function load() {
    if (loaded || loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/events/${eventId}/promises`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not load promises.");
        return;
      }
      setCount(data.count);
      setTotalCash(data.totalCashMinor);
      setRows(data.promises);
      setLoaded(true);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6 border border-[#3FB27F]/30 bg-[#3FB27F]/5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-[#3FB27F]">Gift promises</p>
          {!open && (
            <p className="mt-1 text-xs text-rose-champagne/50">
              What guests pledged to bring to you.
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {loaded && (
            <a
              href={`/api/events/${eventId}/promises/export`}
              className="border border-white/20 px-3 py-1.5 text-xs hover:border-gold/60"
            >
              Export CSV
            </a>
          )}
          <button
            type="button"
            onClick={() => {
              setOpen((v) => !v);
              void load();
            }}
            className="bg-[#3FB27F] px-4 py-1.5 text-xs uppercase tracking-wider text-onyx hover:opacity-90"
          >
            {open ? "Hide" : "Show"} promises
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-4 border-t border-[#3FB27F]/20 pt-4">
          {loading && <p className="text-xs text-rose-champagne/50">Loading…</p>}
          {error && <p className="text-xs text-red-400">{error}</p>}
          {loaded && (
            <>
              <p className="text-sm text-alabaster">
                <span className="font-serif text-xl text-gold">{count}</span>{" "}
                {count === 1 ? "promise" : "promises"}
                {totalCash > 0 && (
                  <>
                    {" · "}
                    <span className="font-serif text-xl text-gold">{formatNaira(totalCash)}</span>{" "}
                    in cash promised
                  </>
                )}
              </p>
              {rows.length === 0 ? (
                <p className="mt-3 text-xs text-rose-champagne/50">
                  No promises yet — share your invitation link so guests can RSVP and bless you.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {rows.map((r) => (
                    <li key={r.guestCode} className="border border-white/10 p-4">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="font-serif text-lg text-alabaster">
                          {r.name}{" "}
                          <span className="font-mono text-xs tracking-widest text-gold">
                            {r.guestCode}
                          </span>
                        </p>
                        <span className="text-[10px] uppercase tracking-wider text-rose-champagne/40">
                          {r.side === "GROOM" ? "Groom's guest" : "Bride's guest"}
                        </span>
                      </div>
                      <ul className="mt-2 flex flex-wrap gap-2">
                        {r.items.map((it, i) => (
                          <li
                            key={i}
                            className="border border-[#3FB27F]/30 bg-[#3FB27F]/10 px-3 py-1.5 text-xs text-alabaster"
                          >
                            {promiseLine(it)}
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
