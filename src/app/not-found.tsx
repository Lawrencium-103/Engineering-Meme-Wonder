import type { Metadata } from "next";
import Link from "next/link";
import { LegalFooter } from "@/components/LegalFooter";

export const metadata: Metadata = {
  title: "Page not found · Aravow",
};

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col">
      <section className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/aravow-mark.png" alt="Aravow" className="h-24 w-24" />
        <p className="font-serif text-6xl font-light text-gold md:text-7xl">404</p>
        <h1 className="mt-6 font-serif text-3xl font-light text-alabaster md:text-4xl">
          This page has wandered off the aisle
        </h1>
        <p className="mt-4 max-w-sm text-sm leading-7 text-rose-champagne/60">
          The page you are looking for does not exist or has moved.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/"
            className="border border-gold px-10 py-4 text-[0.68rem] uppercase tracking-[0.3em] text-gold transition-colors hover:bg-gold hover:text-onyx"
          >
            Back home
          </Link>
          <Link
            href="/studio"
            className="border border-white/15 px-10 py-4 text-[0.68rem] uppercase tracking-[0.3em] text-rose-champagne/70 transition-colors hover:border-gold/40 hover:text-gold"
          >
            The Studio
          </Link>
        </div>
      </section>
      <LegalFooter />
    </main>
  );
}
