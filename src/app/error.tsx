"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/aravow-mark.png" alt="Aravow" className="h-20 w-20" />
      <p className="font-script mt-6 text-3xl text-rose-champagne/80">oh no</p>
      <h1 className="mt-4 font-serif text-4xl font-light text-alabaster">Something went wrong</h1>
      <p className="mt-4 max-w-sm text-sm leading-7 text-rose-champagne/60">
        An unexpected error occurred while loading this page. Please try again — if it keeps
        happening, contact us at contact@aravow.org.
      </p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <button
          onClick={() => reset()}
          className="border border-gold px-10 py-4 text-[0.68rem] uppercase tracking-[0.3em] text-gold transition-colors hover:bg-gold hover:text-onyx"
        >
          Try again
        </button>
        <a
          href="/"
          className="border border-white/15 px-10 py-4 text-[0.68rem] uppercase tracking-[0.3em] text-rose-champagne/70 transition-colors hover:border-gold/40 hover:text-gold"
        >
          Back home
        </a>
      </div>
    </main>
  );
}
