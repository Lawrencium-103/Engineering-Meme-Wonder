import type { Metadata } from "next";
import Link from "next/link";
import { LegalFooter } from "@/components/LegalFooter";

export const metadata: Metadata = {
  title: "Contact Us · Aravow",
  description:
    "Contact Aravow, operated by Dara Initiative Technologies Limited — UI, Sango, Oyo State, Nigeria.",
};

/**
 * Map centred exactly on Sango bus stop (UI area), Oyo Road, Ibadan —
 * coordinates verified against OpenStreetMap/Nominatim:
 * 7.4240991° N, 3.8989269° E.
 */
const MAP_SRC =
  "https://www.openstreetmap.org/export/embed.html?bbox=3.8889269%2C7.4140991%2C3.9089269%2C7.4340991&layer=mapnik&marker=7.4240991%2C3.8989269";
const MAP_LINK =
  "https://www.openstreetmap.org/?mlat=7.4240991&mlon=3.8989269#map=16/7.4240991/3.8989269";

export default function ContactPage() {
  return (
    <main className="flex min-h-dvh flex-col">
      <section className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/aravow-mark.png" alt="Aravow" className="h-24 w-24" />
        <p className="font-script mt-6 text-3xl text-rose-champagne/80">we&apos;re here</p>
        <h1 className="mt-4 font-serif text-4xl font-light text-alabaster md:text-6xl">Contact Us</h1>
        <p className="mt-6 max-w-md text-sm leading-7 text-rose-champagne/60">
          Aravow is built and operated by{" "}
          <span className="text-alabaster">Dara Initiative Technologies Limited</span>. Reach the team
          using the buttons below.
        </p>

        {/* Contact details live behind these buttons — no plain-text details on the page. */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <a
            href="tel:+2349038819790"
            aria-label="Call Aravow on plus two three four, nine zero three, eight eight one, nine seven nine zero"
            className="border border-gold px-10 py-4 text-[0.68rem] uppercase tracking-[0.3em] text-gold transition-colors hover:bg-gold hover:text-onyx"
          >
            Call Us
          </a>
          <a
            href="mailto:contact@aravow.org"
            aria-label="Email Aravow at contact at aravow dot org"
            className="border border-gold px-10 py-4 text-[0.68rem] uppercase tracking-[0.3em] text-gold transition-colors hover:bg-gold hover:text-onyx"
          >
            Email Us
          </a>
        </div>

        {/* Map — centred exactly on UI, Sango, Oyo State. */}
        <div className="mt-16 w-full max-w-2xl text-left">
          <p className="mb-3 text-[0.6rem] uppercase tracking-[0.3em] text-rose-champagne/50">
            Our location
          </p>
          <iframe
            title="Map showing UI, Sango, Oyo State, Nigeria"
            src={MAP_SRC}
            loading="lazy"
            className="h-80 w-full border border-gold/15 bg-white/5"
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-rose-champagne/60">UI, Sango · Oyo State, Nigeria</p>
            <a
              href={MAP_LINK}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-gold underline underline-offset-4"
            >
              Open in maps →
            </a>
          </div>
        </div>
      </section>
      <LegalFooter />
    </main>
  );
}
