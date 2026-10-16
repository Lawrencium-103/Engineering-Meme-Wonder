"use client";

import { useEffect, useMemo, useState } from "react";
import { GIFT_PRESETS, CASH_LABEL, promiseSummary, formatNaira } from "@/lib/promises";
import type { PromiseItem } from "@/db/schema";

/**
 * Gift promise picker: tick Cash/Transfer (with an amount), typical wedding
 * gifts, or write in their own — then one green summary button submits. After
 * submitting, two downloads: the invitation pass (when rendered) and the
 * promise card (regenerated on the fly so edits always show).
 */

const GREEN = "#3FB27F";

export function PromisePicker({
  publicToken,
  guestCode,
  groomName,
  brideName,
}: {
  publicToken: string;
  guestCode: string;
  groomName: string;
  brideName: string;
}) {
  const [loading, setLoading] = useState(true);
  const [cashOn, setCashOn] = useState(false);
  const [cashNaira, setCashNaira] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [customs, setCustoms] = useState<PromiseItem[]>([]);
  const [customInput, setCustomInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [passUrl, setPassUrl] = useState<string | null>(null);

  // Prefill an existing promise; also grab the pass PNG if it's ready.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [p, pass] = await Promise.all([
          fetch(`/api/promises/${publicToken}`),
          fetch(`/api/pass/${publicToken}`),
        ]);
        if (cancelled) return;
        if (p.ok) {
          const data = await p.json();
          const items: PromiseItem[] = data.promise?.items ?? [];
          if (items.length > 0) {
            setSubmitted(true);
            for (const it of items) {
              if (it.kind === "CASH") {
                setCashOn(true);
                setCashNaira(String((it.amountMinor ?? 0) / 100));
              } else if (GIFT_PRESETS.includes(it.label)) {
                setSelected((s) => ({ ...s, [it.label]: true }));
                if (it.note) setNotes((n) => ({ ...n, [it.label]: it.note! }));
              } else {
                setCustoms((c) => [...c, it]);
              }
            }
          }
        }
        if (pass.ok) {
          const passData = await pass.json();
          if (passData.ready) setPassUrl(passData.passImageUrl);
        }
      } catch {
        /* first visit — nothing to prefill */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [publicToken]);

  const items = useMemo<PromiseItem[]>(() => {
    const list: PromiseItem[] = [];
    const naira = Number(cashNaira.replace(/,/g, ""));
    if (cashOn && Number.isFinite(naira) && naira > 0) {
      list.push({ kind: "CASH", label: CASH_LABEL, amountMinor: Math.round(naira * 100) });
    }
    for (const label of GIFT_PRESETS) {
      if (selected[label]) {
        const note = notes[label]?.trim();
        list.push({ kind: "ITEM", label, ...(note ? { note } : {}) });
      }
    }
    list.push(...customs);
    return list;
  }, [cashOn, cashNaira, selected, notes, customs]);

  const summary = items.length > 0 ? promiseSummary(items) : "";

  function addCustom() {
    const label = customInput.trim();
    if (!label || customs.length >= 10) return;
    setCustoms((c) => [...c, { kind: "ITEM", label: label.slice(0, 80) }]);
    setCustomInput("");
  }

  async function submit() {
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/promises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicToken, items }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save your promise.");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return null;

  return (
    <div className="mt-10 border border-[#3FB27F]/40 bg-[#3FB27F]/5 p-6 text-left">
      <p className="text-xs uppercase tracking-wider text-[#3FB27F]">A gift promise</p>
      <h3 className="mt-2 font-serif text-2xl font-light text-alabaster">
        Bless {groomName} &amp; {brideName}
      </h3>
      <p className="mt-2 text-sm text-rose-champagne/60">
        Select what you&rsquo;ll present to the couple on the big day. Only you and the couple
        will see this.
      </p>

      {/* Cash / Transfer */}
      <div className={`mt-5 border p-4 transition-colors ${cashOn ? "border-[#3FB27F]/60 bg-[#3FB27F]/10" : "border-white/10"}`}>
        <button
          type="button"
          onClick={() => setCashOn((v) => !v)}
          className="flex w-full items-center gap-3 text-left"
        >
          <span
            className="grid h-5 w-5 shrink-0 place-items-center rounded-sm border text-[10px]"
            style={{
              borderColor: cashOn ? GREEN : "rgba(255,255,255,0.3)",
              backgroundColor: cashOn ? GREEN : "transparent",
              color: "#0B0C10",
            }}
          >
            {cashOn ? "✓" : ""}
          </span>
          <span className="font-serif text-lg text-gold">Cash / Transfer</span>
        </button>
        {cashOn && (
          <label className="mt-3 block">
            <span className="text-xs uppercase tracking-wider text-rose-champagne/50">Amount (₦)</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={1_000_000}
              value={cashNaira}
              onChange={(e) => setCashNaira(e.target.value)}
              placeholder="20000"
              className="mt-2 w-full bg-white/5 border border-white/10 px-4 py-3 text-sm text-alabaster placeholder:text-rose-champagne/30 focus:border-[#3FB27F]/60 focus:outline-none"
            />
          </label>
        )}
      </div>

      {/* Preset gifts */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {GIFT_PRESETS.map((label) => {
          const on = Boolean(selected[label]);
          return (
            <div key={label}>
              <button
                type="button"
                onClick={() => setSelected((s) => ({ ...s, [label]: !s[label] }))}
                className={`w-full border px-3 py-3 text-left text-xs transition-colors ${
                  on ? "border-[#3FB27F]/60 bg-[#3FB27F]/10 text-alabaster" : "border-white/10 text-rose-champagne/70 hover:border-white/30"
                }`}
              >
                <span className="flex items-start gap-2">
                  <span
                    className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-sm border text-[9px]"
                    style={{
                      borderColor: on ? GREEN : "rgba(255,255,255,0.3)",
                      backgroundColor: on ? GREEN : "transparent",
                      color: "#0B0C10",
                    }}
                  >
                    {on ? "✓" : ""}
                  </span>
                  {label}
                </span>
              </button>
              {on && (
                <input
                  value={notes[label] ?? ""}
                  onChange={(e) => setNotes((n) => ({ ...n, [label]: e.target.value }))}
                  placeholder="Size, colour, message…"
                  maxLength={120}
                  className="mt-1 w-full bg-white/5 border border-white/10 px-2.5 py-2 text-[11px] text-alabaster placeholder:text-rose-champagne/30 focus:border-[#3FB27F]/60 focus:outline-none"
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Custom gifts */}
      {customs.length > 0 && (
        <div className="mt-4 space-y-2">
          {customs.map((c, i) => (
            <div key={`${c.label}-${i}`} className="flex items-center justify-between border border-white/10 px-3 py-2 text-sm text-alabaster">
              <span>{c.label}</span>
              <button
                type="button"
                onClick={() => setCustoms((list) => list.filter((_, j) => j !== i))}
                className="ml-3 text-xs text-rose-champagne/50 hover:text-red-400"
                aria-label={`Remove ${c.label}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="mt-3 flex gap-2">
        <input
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustom();
            }
          }}
          placeholder="Add another gift…"
          maxLength={80}
          className="flex-1 bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-alabaster placeholder:text-rose-champagne/30 focus:border-[#3FB27F]/60 focus:outline-none"
        />
        <button
          type="button"
          onClick={addCustom}
          disabled={!customInput.trim() || customs.length >= 10}
          className="border border-white/20 px-4 text-xs uppercase tracking-widest text-rose-champagne/70 hover:border-[#3FB27F]/60 disabled:opacity-40"
        >
          Add
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      {/* Green summary button */}
      <button
        type="button"
        onClick={submit}
        disabled={busy || items.length === 0}
        className="mt-5 w-full py-4 text-sm uppercase tracking-widest text-onyx transition-opacity disabled:opacity-40"
        style={{ backgroundColor: GREEN }}
      >
        {busy
          ? "Saving…"
          : items.length === 0
            ? "Select something to present"
            : submitted
              ? `Update my promise · ${summary}`
              : `Present ${summary}`}
      </button>

      {/* Downloads after submitting */}
      {submitted && (
        <div className="mt-5 border-t border-[#3FB27F]/30 pt-5">
          <p className="text-xs uppercase tracking-wider text-[#3FB27F]">Your downloads</p>
          <p className="mt-1 text-xs text-rose-champagne/50">
            Two keepsakes, {guestCode} — your invitation and your promise, regenerated fresh each
            time you download.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <a
              href={`/api/promise/${publicToken}/card`}
              className="px-5 py-2.5 text-xs uppercase tracking-widest text-onyx"
              style={{ backgroundColor: GREEN }}
            >
              Download promise card
            </a>
            {passUrl ? (
              <a
                href={passUrl}
                download={`Aravow-${guestCode}.png`}
                className="border border-white/20 px-5 py-2.5 text-xs uppercase tracking-widest hover:border-gold/60"
              >
                Download invitation
              </a>
            ) : (
              <span className="border border-white/10 px-5 py-2.5 text-xs uppercase tracking-widest text-rose-champagne/40">
                Invitation still rendering…
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
