"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * Landing header navigation.
 * Desktop: Couple sign in · Make money · Open the Studio.
 * Mobile: hamburger opening the same three links (sign-in is hidden on
 * small screens otherwise, so the menu is the only route to it).
 */
export function SiteMenu() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open ]);

  return (
    <div className="flex items-center gap-5">
      <nav className="hidden items-center gap-5 sm:flex" aria-label="Primary">
        <Link
          href="/dashboard"
          className="text-[0.66rem] uppercase tracking-[0.24em] text-rose-champagne/70 transition-colors hover:text-gold"
        >
          Couple sign in
        </Link>
        <Link
          href="/agent"
          className="text-[0.66rem] uppercase tracking-[0.24em] text-gold transition-colors hover:text-alabaster"
        >
          Make money
        </Link>
        <Link
          href="/studio"
          className="border border-gold/40 px-4 py-2 text-[0.62rem] uppercase tracking-[0.24em] text-gold transition-colors hover:bg-gold hover:text-onyx"
        >
          Open the Studio
        </Link>
      </nav>

      <button
        type="button"
        className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 sm:hidden"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span
          className={`block h-px w-6 bg-alabaster transition-transform ${open ? "translate-y-[3.5px] rotate-45" : ""}`}
          aria-hidden="true"
        />
        <span
          className={`block h-px w-6 bg-alabaster transition-transform ${open ? "-translate-y-[3.5px] -rotate-45" : ""}`}
          aria-hidden="true"
        />
        <span
          className={`block h-px w-6 bg-gold transition-opacity ${open ? "opacity-0" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <nav
          className="absolute inset-x-0 top-full border-b border-gold/15 bg-onyx/97 px-6 py-6 backdrop-blur-xl sm:hidden"
          aria-label="Mobile"
        >
          <ul className="space-y-1">
            {/* NB: no onClick closers here — the header is page-local, so any
                navigation unmounts it anyway. Closing state on click unmounts
                the <nav> mid-click and cancels client-side navigation. */}
            <li>
              <Link
                href="/agent"
                className="flex items-center justify-between border border-gold/40 bg-gold/10 px-4 py-4 text-[0.68rem] uppercase tracking-[0.24em] text-gold"
              >
                Make money
                <span aria-hidden="true">→</span>
              </Link>
            </li>
            <li>
              <Link
                href="/studio"
                className="flex items-center justify-between px-4 py-4 text-[0.68rem] uppercase tracking-[0.24em] text-alabaster"
              >
                Open the Studio
                <span aria-hidden="true">→</span>
              </Link>
            </li>
            <li>
              <Link
                href="/dashboard"
                className="flex items-center justify-between px-4 py-4 text-[0.68rem] uppercase tracking-[0.24em] text-rose-champagne/70"
              >
                Couple sign in
                <span aria-hidden="true">→</span>
              </Link>
            </li>
          </ul>
          <p className="mt-4 px-4 text-xs text-rose-champagne/40">
            Sell Aravow in your school, office, church or estate — earn 15% + a ₦40,000 bonus.
          </p>
        </nav>
      )}
    </div>
  );
}
