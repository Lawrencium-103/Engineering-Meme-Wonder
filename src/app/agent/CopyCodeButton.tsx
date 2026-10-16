"use client";

import { useState } from "react";

/** Small copy-to-clipboard button for the agent code display. */
export function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(code).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }}
      className="mt-4 border border-gold/60 px-5 py-2 text-xs uppercase tracking-[0.24em] text-gold hover:bg-gold/10 transition-colors"
    >
      {copied ? "Copied ✓" : "Copy code"}
    </button>
  );
}
