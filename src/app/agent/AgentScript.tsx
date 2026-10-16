"use client";

import { useState } from "react";

/** Copy/personalize/send sales script with a copy-to-clipboard button. */
export function AgentScript() {
  const [copied, setCopied] = useState(false);
  const lines = SCRIPT_LINES.map((l) => `${l.who}: ${l.text}`).join("\n\n");
  return (
    <section>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-gold tracking-[0.35em] text-xs uppercase">Your sales script</p>
          <h2 className="mt-2 font-serif text-3xl font-light text-alabaster">
            Copy, personalize, send
          </h2>
        </div>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(lines).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            });
          }}
          className="shrink-0 border border-gold/60 px-4 py-2 text-xs uppercase tracking-[0.2em] text-gold hover:bg-gold/10 transition-colors"
        >
          {copied ? "Copied ✓" : "Copy script"}
        </button>
      </div>
      <div className="mt-6 space-y-3">
        {SCRIPT_LINES.map((l, i) => (
          <div key={i} className="border-l-2 border-gold/40 bg-white/5 px-4 py-3">
            <p className="text-[0.6rem] uppercase tracking-[0.24em] text-gold">{l.who}</p>
            <p className="mt-1 text-sm leading-6 text-alabaster">{l.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

const SCRIPT_LINES = [
  { who: "You", text: "Good morning [Name], congrats on the engagement o! I saw the pictures." },
  { who: "You", text: "Quick one, how are you people handling invites and guest list? Most couples I know are tired of printed cards that just get lost." },
  { who: "You", text: "There is something called Aravow. Your own wedding website with online RSVP and gate passes for guests. It starts free, full package from 24,990. Can I show you sample? 2 minutes only." },
  { who: "Them", text: "Okay send it. / How much is it really?" },
  { who: "You", text: "[Send demo link.] You don see am. Names, photos, venues, everything inside one link you can share on WhatsApp. Which month is the wedding? I can help you set up the free page today. My agent code is [YOUR CODE], abeg type it when you sign up so they will attach me to support you." },
  { who: "Close", text: "If they delay: no wahala. The free page costs nothing and takes 10 minutes. Make we do it now, you can upgrade later if your guest list grows." },
];
