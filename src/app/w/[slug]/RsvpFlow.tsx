"use client";

import { useEffect, useState } from "react";
import { LazyMotion, domAnimation, m } from "framer-motion";
import { PromisePicker } from "@/components/PromisePicker";

type Step = "choose" | "form" | "done";

export function RsvpFlow({
  slug,
  full,
  test = false,
  couple,
}: {
  slug: string;
  full: boolean;
  test?: boolean;
  couple: { groomName: string; brideName: string };
}) {
  const [step, setStep] = useState<Step>("choose");
  const [side, setSide] = useState<"GROOM" | "BRIDE">("GROOM");

  useEffect(() => {
    // Hydration sentinel for tests.
    document.documentElement.setAttribute("data-av-ready", "1");
    // Load Turnstile script once if configured.
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (siteKey && !document.querySelector("script[data-av-turnstile]")) {
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
      s.async = true;
      s.defer = true;
      s.setAttribute("data-av-turnstile", "1");
      document.head.appendChild(s);
    }
  }, []);

  if (full) {
    return (
      <div className="border border-white/10 bg-white/[0.03] p-10 text-center">
        <p className="font-serif text-2xl text-rose-champagne">RSVPs are full for this wedding</p>
        <p className="mt-2 text-sm text-rose-champagne/60">
          The couple has reached their guest limit. Please contact them directly.
        </p>
      </div>
    );
  }

  return (
    <LazyMotion features={domAnimation} strict>
      {step === "choose" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              setSide("GROOM");
              setStep("form");
            }}
            className="border border-gold/40 bg-gold/5 p-8 text-center transition-colors hover:bg-gold/15"
          >
            <span className="font-serif text-xl text-gold">I&apos;m celebrating with the</span>
            <span className="mt-2 block font-serif text-3xl italic text-alabaster">Groom</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setSide("BRIDE");
              setStep("form");
            }}
            className="border border-gold/40 bg-gold/5 p-8 text-center transition-colors hover:bg-gold/15"
          >
            <span className="font-serif text-xl text-gold">I&apos;m celebrating with the</span>
            <span className="mt-2 block font-serif text-3xl italic text-alabaster">Bride</span>
          </button>
        </div>
      )}

      {step === "form" && (
        <m.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <RsvpForm
            slug={slug}
            side={side}
            test={test}
            onDone={() => setStep("done")}
            onBack={() => setStep("choose")}
          />
        </m.div>
      )}

      {step === "done" && <Celebration test={test} couple={couple} slug={slug} />}
    </LazyMotion>
  );
}

const inputCls =
  "w-full bg-white/5 border border-white/10 px-4 py-3 text-sm text-alabaster placeholder:text-rose-champagne/30 focus:border-gold/60 focus:outline-none";

function RsvpForm({
  slug,
  side,
  test = false,
  onDone,
  onBack,
}: {
  slug: string;
  side: "GROOM" | "BRIDE";
  test?: boolean;
  onDone: () => void;
  onBack: () => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dietary, setDietary] = useState("");
  const [partySize, setPartySize] = useState(1);
  const [consent, setConsent] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (window as unknown as Record<string, unknown>).onAvTurnstileToken = (t: string) =>
      setTurnstileToken(t);
    return () => {
      delete (window as unknown as Record<string, unknown>).onAvTurnstileToken;
    };
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    void (async () => {
      // Preview test mode: simulate success without touching the API or DB.
      if (test) {
        const fakeCode = `${side === "GROOM" ? "G" : "B"}-TEST-${String(Math.floor(Math.random() * 900) + 100)}`;
        window.sessionStorage.setItem(
          "av.pass",
          JSON.stringify({ guestCode: fakeCode, publicToken: "", test: true, slug }),
        );
        setBusy(false);
        onDone();
        return;
      }
      try {
        const res = await fetch(`/api/rsvp?slug=${encodeURIComponent(slug)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            side,
            firstName,
            lastName,
            email: email || "",
            phone: phone || "",
            dietary: dietary || "",
            partySize,
            consent: true,
            turnstileToken: turnstileToken || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Something went wrong.");
          return;
        }
        window.sessionStorage.setItem(
          "av.pass",
          JSON.stringify({ guestCode: data.guestCode, publicToken: data.publicToken, slug }),
        );
        onDone();
      } catch {
        setError("Network error — please try again.");
      } finally {
        setBusy(false);
      }
    })();
  }

  return (
    <form onSubmit={submit} className="space-y-4 border border-white/10 bg-white/[0.03] p-6">
      <button type="button" onClick={onBack} className="text-xs text-rose-champagne/50 underline underline-offset-4">
        ← Back
      </button>
      <p className="text-xs uppercase tracking-wider text-rose-champagne/50">
        Celebrating with the {side === "GROOM" ? "Groom" : "Bride"}
      </p>
      <input className={inputCls} placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required maxLength={100} />
      <input className={inputCls} placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} required maxLength={100} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <input type="email" className={inputCls} placeholder="Email (or phone below)" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} />
        <input type="tel" className={inputCls} placeholder="Phone (or email above)" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} />
      </div>
      <input className={inputCls} placeholder="Dietary note (optional)" value={dietary} onChange={(e) => setDietary(e.target.value)} maxLength={300} />
      <label className="block">
        <span className="text-xs uppercase tracking-wider text-rose-champagne/50">
          How many of you are coming?
        </span>
        <select
          value={partySize}
          onChange={(e) => setPartySize(Number(e.target.value))}
          className={`${inputCls} mt-2`}
        >
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <option key={n} value={n} className="bg-onyx text-alabaster">
              {n} {n === 1 ? "person" : "people"}
            </option>
          ))}
        </select>
        <span className="mt-1 block text-[11px] text-rose-champagne/40">
          Includes you. Please only include plus-ones you have confirmed with the couple.
        </span>
      </label>
      <label className="flex items-start gap-3 text-xs text-rose-champagne/60">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} required className="mt-0.5 accent-[#D4AF37]" />
        <span>
          I consent to the couple storing my details for this wedding only, in line with the
          Nigeria Data Protection Act 2023. You may request deletion at any time.
        </span>
      </label>
      {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ? (
        <div className="cf-turnstile" data-sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY} data-callback="onAvTurnstileToken" />
      ) : null}
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={busy || !consent}
        className="w-full bg-gold py-4 text-sm uppercase tracking-widest text-onyx transition-colors hover:bg-gold/90 disabled:opacity-50"
      >
        {busy ? "Sending…" : "Confirm RSVP"}
      </button>
    </form>
  );
}

function Celebration({
  test = false,
  couple,
  slug,
}: {
  test?: boolean;
  couple: { groomName: string; brideName: string };
  slug: string;
}) {
  const [pass, setPass] = useState<{ guestCode: string; publicToken: string } | null>(null);
  const [passUrl, setPassUrl] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem("av.pass");
      if (raw) setPass(JSON.parse(raw));
    } catch {
      /* noop */
    }
  }, []);

  // Poll until the generated PNG is ready, then swap it in.
  // Skipped in preview test mode — there is no real pass to render.
  useEffect(() => {
    if (!pass || test || !pass.publicToken) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch(`/api/pass/${pass.publicToken}`);
        if (res.ok) {
          const data = await res.json();
          if (data.ready && !cancelled) {
            setPassUrl(data.passImageUrl);
            return;
          }
        }
      } catch {
        /* retry */
      }
      if (!cancelled) setTimeout(tick, 2500);
    };
    const t = setTimeout(tick, 1500);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [pass]);

  return (
    <Confetti>
      <m.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="border border-gold/40 bg-gold/5 p-8 text-center"
      >
        <p className="font-serif text-3xl italic text-gold">Thank you!</p>
        <p className="mt-2 text-sm text-rose-champagne/70">
          {test
            ? "This is exactly what your guests will see after they RSVP."
            : "Your RSVP has been received. This is your access pass."}
        </p>
        {test && (
          <p className="mt-4 border border-amber-400/40 bg-amber-400/10 px-4 py-2 text-xs uppercase tracking-wider text-amber-300">
            Preview test — nothing was saved
          </p>
        )}

        {pass && (
          <div className="mt-6">
            {passUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={passUrl} alt="Your access pass" className="mx-auto max-h-[60dvh] w-auto" />
            ) : (
              <div className="mx-auto flex max-w-xs aspect-[9/16] items-center justify-center border border-gold/30 bg-onyx p-6">
                <div>
                  <p className="text-xs uppercase tracking-widest text-rose-champagne/40">Access pass</p>
                  <p className="mt-2 font-mono text-lg tracking-widest text-gold">{pass.guestCode}</p>
                  <p className="mt-4 text-xs text-rose-champagne/40">Rendering your luxury pass…</p>
                </div>
              </div>
            )}
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              {passUrl && (
                <a
                  href={passUrl}
                  download={`Aravow-${pass.guestCode}.png`}
                  className="bg-gold px-5 py-2.5 text-xs uppercase tracking-widest text-onyx hover:bg-gold/90"
                >
                  Download PNG
                </a>
              )}
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `I just RSVP'd! 🎉 My access pass: ${pass.guestCode}${passUrl ? ` ${passUrl}` : ""}`,
                )}`}
                target="_blank"
                rel="noreferrer"
                className="border border-white/20 px-5 py-2.5 text-xs uppercase tracking-widest hover:border-gold/60"
              >
                Share on WhatsApp
              </a>
              {slug && (
                <a
                  href={`/w/${slug}/calendar`}
                  download="invitation.ics"
                  className="border border-white/20 px-5 py-2.5 text-xs uppercase tracking-widest hover:border-gold/60"
                >
                  Add to Calendar
                </a>
              )}
            </div>
          </div>
        )}

        {!test && pass?.publicToken && (
          <PromisePicker
            publicToken={pass.publicToken}
            guestCode={pass.guestCode}
            groomName={couple.groomName}
            brideName={couple.brideName}
          />
        )}
      </m.div>
    </Confetti>
  );
}

/** Soft gold confetti; disabled under prefers-reduced-motion. */
function Confetti({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    void (async () => {
      const confetti = (await import("canvas-confetti")).default;
      const golds = ["#D4AF37", "#E8D3C4", "#F9F8F6"];
      confetti({
        particleCount: 90,
        spread: 75,
        startVelocity: 38,
        scalar: 0.9,
        ticks: 220,
        colors: golds,
        origin: { y: 0.6 },
        disableForReducedMotion: true,
      });
    })();
  }, []);
  return <>{children}</>;
}
