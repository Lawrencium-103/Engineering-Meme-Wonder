"use client";

import { useState } from "react";

const inputCls =
  "w-full bg-white/5 border border-white/10 px-4 py-3 text-sm text-alabaster placeholder:text-rose-champagne/30 focus:outline-none focus:border-gold/60";

/**
 * Agent self-registration form. On success we show the generated code
 * immediately (so the agent can start selling even before clicking the
 * magic link) plus the dev-only link fallback when email isn't configured.
 */
export function AgentRegisterForm({ signedInEmail }: { signedInEmail: string | null }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState(signedInEmail ?? "");
  const [phone, setPhone] = useState("");
  const [signupCode, setSignupCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ code: string; devLink?: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/agents/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, signupCode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" && data.error ? data.error : `Registration failed (HTTP ${res.status}).`);
        return;
      }
      setDone({ code: String(data.code ?? ""), devLink: typeof data.devMagicLink === "string" ? data.devMagicLink : undefined });
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="mt-8 border border-gold/40 bg-gold/5 p-6 text-center">
        <p className="text-xs uppercase tracking-[0.24em] text-rose-champagne/60">Your Customer Service ID</p>
        <p className="mt-3 font-mono text-3xl tracking-widest text-gold">{done.code}</p>
        <p className="mt-4 text-sm text-rose-champagne/60">
          We sent a sign-in link to <span className="text-alabaster">{email}</span>. Use it
          to see your sales anytime at <span className="text-alabaster">/agent</span>.
        </p>
        {done.devLink && (
          <div className="mt-4 rounded border border-gold/40 bg-gold/10 p-4 text-left">
            <p className="text-sm text-rose-champagne">No email service in dev — use this link to sign in:</p>
            <p className="mt-2 break-all text-xs text-rose-champagne/70">{done.devLink}</p>
            <a
              href={done.devLink}
              className="mt-3 inline-block bg-gold px-4 py-2 text-sm text-onyx hover:bg-gold/90"
            >
              Open my agent dashboard →
            </a>
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-5">
      <label className="block">
        <span className="mb-1.5 block text-xs uppercase tracking-wider text-rose-champagne/60">Full name</span>
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Adaeze Okonkwo" maxLength={100} required />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs uppercase tracking-wider text-rose-champagne/60">Email</span>
        <input type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required readOnly={Boolean(signedInEmail)} />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs uppercase tracking-wider text-rose-champagne/60">Phone (optional)</span>
        <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0803…" maxLength={30} />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs uppercase tracking-wider text-rose-champagne/60">Team signup code (if you were given one)</span>
        <input className={inputCls} value={signupCode} onChange={(e) => setSignupCode(e.target.value)} maxLength={60} />
      </label>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="w-full bg-gold text-onyx py-4 text-sm tracking-widest uppercase hover:bg-gold/90 transition-colors disabled:opacity-50"
      >
        {busy ? "Creating your code…" : "Get my agent code"}
      </button>
    </form>
  );
}
