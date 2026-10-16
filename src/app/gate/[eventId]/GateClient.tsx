"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface GateGuest {
  id: string;
  guestCode: string;
  firstName: string;
  lastName: string;
  side: "GROOM" | "BRIDE";
  partySize: number;
  dietary: string | null;
  checkedInAt: string | null;
}

interface Counts {
  totalPeople: number;
  checkedInPeople: number;
  totalRsvps: number;
  checkedInRsvps: number;
}

export function GateClient({
  eventId,
  groomName,
  brideName,
  monogram,
  weddingDate,
  published,
}: {
  eventId: string;
  groomName: string;
  brideName: string;
  monogram: string;
  weddingDate: string;
  published: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GateGuest[]>([]);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [toast, setToast] = useState<{ text: string; kind: "ok" | "err" } | null>(null);
  const scannerRef = useRef<unknown>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((text: string, kind: "ok" | "err" = "ok") => {
    setToast({ text, kind });
    setTimeout(() => setToast(null), 2500);
  }, []);

  const lookup = useCallback(
    async (params: URLSearchParams) => {
      setLoading(true);
      try {
        const res = await fetch(`/api/events/${eventId}/gate/lookup?${params}`);
        const data = await res.json();
        if (!res.ok) {
          showToast(data.error ?? "Lookup failed.", "err");
          return;
        }
        setResults(data.guests ?? []);
        setCounts(data.counts);
      } catch {
        showToast("Network error.", "err");
      } finally {
        setLoading(false);
      }
    },
    [eventId, showToast],
  );

  // Debounced search as the user types.
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    searchTimer.current = setTimeout(() => {
      void lookup(new URLSearchParams({ q }));
    }, 250);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [query, lookup]);

  // Load initial counts so the counter is live from the start.
  useEffect(() => {
    void lookup(new URLSearchParams({ q: "" }));
  }, [lookup]);

  async function checkIn(g: GateGuest, undo = false) {
    try {
      const res = await fetch(`/api/events/${eventId}/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestId: g.id, undo }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error ?? "Failed.", "err");
        return;
      }
      setCounts(data.counts);
      // Update the row in place.
      setResults((prev) =>
        prev.map((r) =>
          r.id === g.id
            ? { ...r, checkedInAt: data.guest.checkedInAt }
            : r,
        ),
      );
      if (undo) {
        showToast(`${g.firstName} unchecked.`);
      } else if (data.alreadyInState) {
        showToast(`${g.firstName} was already checked in.`);
      } else {
        showToast(`${g.firstName} checked in · +${g.partySize}`);
      }
    } catch {
      showToast("Network error.", "err");
    }
  }

  async function handleToken(token: string) {
    // Extract token from a scanned /p/{token} URL, or accept a bare hex token.
    const m = token.match(/\/p\/([0-9a-f]{32})/i) ?? token.match(/^([0-9a-f]{32})$/i);
    if (!m) {
      showToast("That QR is not an Aravow pass.", "err");
      return;
    }
    await lookup(new URLSearchParams({ token: m[1] }));
    setQuery("");
  }

  async function startScanner() {
    setScanning(true);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      // Wait a frame so the video container is in the DOM.
      await new Promise((r) => setTimeout(r, 50));
      const scanner = new Html5Qrcode("av-gate-qr");
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          void handleToken(decodedText);
          void stopScanner();
        },
        () => {
          /* frame miss — ignore */
        },
      );
    } catch (err) {
      console.error("scanner failed", err);
      showToast("Camera unavailable — enter the code instead.", "err");
      setScanning(false);
    }
  }

  async function stopScanner() {
    const scanner = scannerRef.current as
      | { stop: () => Promise<void>; clear: () => void }
      | undefined;
    try {
      await scanner?.stop();
      scanner?.clear();
    } catch {
      /* already stopped */
    }
    scannerRef.current = null;
    setScanning(false);
  }

  useEffect(() => {
    return () => {
      void stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pct =
    counts && counts.totalPeople > 0
      ? Math.min(100, Math.round((counts.checkedInPeople / counts.totalPeople) * 100))
      : 0;

  return (
    <main className="min-h-dvh bg-onyx px-4 pb-16 pt-6 text-alabaster">
      {/* Header + live counter */}
      <header className="mx-auto max-w-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-gold">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/aravow-mark.png" alt="" className="h-7 w-7" />
              Aravow Gate
            </p>
            <h1 className="mt-1 font-serif text-2xl font-light">
              {groomName} <span className="text-gold">&</span> {brideName}
            </h1>
          </div>
          <a
            href="/dashboard"
            className="border border-white/20 px-3 py-1.5 text-[11px] uppercase tracking-wider text-rose-champagne/60 hover:border-gold/60"
          >
            Exit
          </a>
        </div>

        <div className="mt-5 border border-gold/30 bg-gold/5 p-5 text-center">
          <p className="font-serif text-5xl font-light text-gold">
            {counts?.checkedInPeople ?? 0}
            <span className="text-2xl text-rose-champagne/50"> / {counts?.totalPeople ?? 0}</span>
          </p>
          <p className="mt-1 text-[11px] uppercase tracking-widest text-rose-champagne/50">
            people checked in
          </p>
          <div className="mt-3 h-1.5 w-full bg-white/10">
            <div className="h-full bg-gold transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-2 text-[11px] text-rose-champagne/40">
            {counts?.checkedInRsvps ?? 0} of {counts?.totalRsvps ?? 0} RSVPs · {pct}%
          </p>
        </div>

        {!published && (
          <p className="mt-4 border border-amber-400/40 bg-amber-400/10 px-4 py-2 text-center text-xs text-amber-300">
            This event is not published yet — guest list may be incomplete.
          </p>
        )}
      </header>

      {/* Search + scan */}
      <section className="mx-auto mt-6 max-w-lg">
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, phone, or guest code…"
            autoCapitalize="characters"
            autoCorrect="off"
            className="flex-1 border border-white/15 bg-white/5 px-4 py-4 text-lg text-alabaster placeholder:text-rose-champagne/30 focus:border-gold/60 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => (scanning ? void stopScanner() : void startScanner())}
            className={`flex w-16 items-center justify-center border text-xl ${
              scanning
                ? "border-red-400/60 bg-red-400/10 text-red-300"
                : "border-gold/40 bg-gold/10 text-gold hover:bg-gold/20"
            }`}
            title={scanning ? "Stop scanner" : "Scan QR"}
          >
            {scanning ? "✕" : "▦"}
          </button>
        </div>

        {scanning && (
          <div className="mt-3 border border-white/10 bg-black p-3">
            <div id="av-gate-qr" className="mx-auto max-w-sm overflow-hidden rounded" />
            <p className="mt-2 text-center text-xs text-rose-champagne/50">
              Point the camera at the guest&apos;s pass QR code.
            </p>
          </div>
        )}
      </section>

      {/* Results */}
      <section className="mx-auto mt-6 max-w-lg space-y-3">
        {loading && <p className="text-center text-sm text-rose-champagne/40">Searching…</p>}
        {!loading && query.trim() && results.length === 0 && (
          <p className="text-center text-sm text-rose-champagne/40">No guests match.</p>
        )}
        {results.map((g) => (
          <GuestRow key={g.id} g={g} onCheckIn={() => void checkIn(g)} onUndo={() => void checkIn(g, true)} />
        ))}
      </section>

      {/* Print link */}
      <section className="mx-auto mt-10 max-w-lg text-center">
        <a
          href={`/gate/${eventId}/print`}
          target="_blank"
          rel="noreferrer"
          className="inline-block border border-white/20 px-5 py-2.5 text-xs uppercase tracking-widest text-rose-champagne/60 hover:border-gold/60"
        >
          Print gate list (backup)
        </a>
      </section>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 border px-5 py-3 text-sm ${
            toast.kind === "ok"
              ? "border-gold/50 bg-onyx text-gold"
              : "border-red-400/50 bg-onyx text-red-300"
          }`}
        >
          {toast.text}
        </div>
      )}
    </main>
  );
}

function GuestRow({
  g,
  onCheckIn,
  onUndo,
}: {
  g: GateGuest;
  onCheckIn: () => void;
  onUndo: () => void;
}) {
  const inState = g.checkedInAt !== null;
  return (
    <div
      className={`flex items-center justify-between gap-3 border p-4 ${
        inState ? "border-gold/30 bg-gold/5" : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <div className="min-w-0">
        <p className="truncate font-serif text-lg">
          {g.firstName} {g.lastName}
        </p>
        <p className="mt-0.5 text-xs text-rose-champagne/50">
          <span className="font-mono text-gold">{g.guestCode}</span>
          {" · "}
          {g.side === "GROOM" ? "Groom" : "Bride"}
          {" · "}
          {g.partySize} {g.partySize === 1 ? "person" : "people"}
        </p>
        {g.dietary && <p className="mt-0.5 text-[11px] text-amber-300/80">🍽 {g.dietary}</p>}
        {inState && (
          <p className="mt-0.5 text-[11px] text-gold">
            ✓ In at{" "}
            {new Date(g.checkedInAt!).toLocaleTimeString("en-NG", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            })}
          </p>
        )}
      </div>
      {inState ? (
        <button
          type="button"
          onClick={onUndo}
          className="shrink-0 border border-white/20 px-4 py-2.5 text-xs uppercase tracking-wider text-rose-champagne/50 hover:border-red-400/50 hover:text-red-300"
        >
          Undo
        </button>
      ) : (
        <button
          type="button"
          onClick={onCheckIn}
          className="shrink-0 bg-gold px-5 py-2.5 text-xs uppercase tracking-widest text-onyx hover:bg-gold/90"
        >
          Check in
        </button>
      )}
    </div>
  );
}
