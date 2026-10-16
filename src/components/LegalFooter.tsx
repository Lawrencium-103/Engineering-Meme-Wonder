import Link from "next/link";

const links = [
  { href: "/", label: "Home" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/refunds", label: "Refunds" },
  { href: "/contact", label: "Contact" },
] as const;

/** Shared footer for public policy pages — matches the landing footer style. */
export function LegalFooter() {
  return (
    <footer className="mt-auto border-t border-gold/15">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 text-[0.6rem] uppercase tracking-[0.24em] text-rose-champagne/45 md:flex-row md:px-12">
        <span className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/aravow-mark.png" alt="" className="h-9 w-9" />
          © 2026 Dara Initiative Technologies Limited
        </span>
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="transition-colors hover:text-gold">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
