import Image from "next/image";
import Link from "next/link";
import { TIERS, TIER_ORDER, formatNaira } from "@/lib/pricing";

/** Hero slideshow. Each slide holds for 7s in a 21s CSS cycle. */
const SLIDES = [
  "/marketing/hero-01.webp",
  "/marketing/hero-02.webp",
  "/marketing/hero-03.webp",
];

const TICKER = [
  "An Invitation Worth Keeping Forever",
  "Personalised Access Passes",
  "Instant RSVP",
  "Champagne Gold, Always",
  "Lagos · Abuja · Port Harcourt",
];

const STEPS = [
  {
    n: "01",
    title: "Craft the suite",
    body: "Names, monogram, wedding date, every ceremony, dress codes and your story — set in an editorial template with your own pre-wedding photograph.",
  },
  {
    n: "02",
    title: "Choose your tier",
    body: "Pay by guest count. Each tier is a guest cap, so you only pay for the seats you actually need.",
  },
  {
    n: "03",
    title: "Guests receive a pass",
    body: "Every guest RSVPs in seconds and receives a personalised 9:16 access pass with their own guest ID, QR code and both of your signatures.",
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-dvh bg-onyx">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-gold/15 bg-onyx/92 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-12">
          <Link
            href="/"
            className="text-[0.68rem] font-light uppercase tracking-[0.42em] text-alabaster"
          >
            Aura<span className="text-gold">Vows</span>
          </Link>
          <div className="flex items-center gap-5">
            <Link
              href="/dashboard"
              className="hidden text-[0.66rem] uppercase tracking-[0.24em] text-rose-champagne/70 transition-colors hover:text-gold sm:block"
            >
              Couple sign in
            </Link>
            <Link
              href="/studio"
              className="border border-gold/40 px-4 py-2 text-[0.62rem] uppercase tracking-[0.24em] text-gold transition-colors hover:bg-gold hover:text-onyx"
            >
              Open the Studio
            </Link>
          </div>
        </div>
        <span
          className="scroll-progress absolute inset-x-0 bottom-0 h-px origin-left bg-gold/70"
          aria-hidden="true"
        />
      </header>
      {/* Scrolled content dissolves into onyx before it reaches the chrome, so
          nothing ever smears through the fixed header. */}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-40 h-24 bg-gradient-to-b from-onyx via-onyx/55 to-transparent"
        aria-hidden="true"
      />

      {/* Hero */}
      <section className="relative isolate flex min-h-dvh flex-col justify-center overflow-hidden px-6 pb-20 pt-28 md:px-12 lg:px-16">
        <div className="hero-stage" aria-hidden="true">
          {SLIDES.map((src, i) => (
            <Image
              key={src}
              src={src}
              alt=""
              fill
              priority={i === 0}
              quality={80}
              sizes="100vw"
              className={`hero-slide hero-pos-${i} object-cover`}
              style={{ animationDelay: `${i * 7}s` }}
            />
          ))}
          <div className="hero-scrim absolute inset-0" />
          <div className="hero-vignette absolute inset-0" />
          <div className="hero-grain absolute inset-0" />
          <div className="hero-sheen absolute inset-0" />
        </div>
        <div className="hero-frame" aria-hidden="true" />

        <div className="hero-rise mx-auto w-full max-w-7xl">
          <div className="max-w-3xl">
            <div className="hero-in hero-in-1 flex items-center gap-4">
              <span className="h-px w-12 bg-gold/70" />
              <p className="text-[0.66rem] uppercase tracking-[0.42em] text-gold">
                Aravow · Lagos
              </p>
            </div>

            <h1 className="mt-8 font-serif text-[3.05rem] font-light leading-[1.03] text-alabaster sm:text-6xl md:text-7xl lg:text-[5.4rem]">
              <span className="mask">
                <span className="mask-line">An Invitation Worth</span>
              </span>
              <span className="mask">
                <span className="mask-line italic text-gold">
                  Keeping Forever.
                </span>
              </span>
            </h1>

            <div className="draw-x mt-9 h-px w-40 bg-gold/50" />
            <p className="hero-in hero-in-2 mt-8 max-w-xl text-base font-light leading-relaxed text-rose-champagne/85 md:text-lg">
              A luxury digital wedding invitation, RSVP and guest access pass —
              crafted for your celebration and delivered to every guest, on
              their phone, in under a second.
            </p>

            <div className="hero-in hero-in-3 mt-11 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
              <Link href="/studio" className="group relative inline-flex">
                <span className="cta-halo pointer-events-none absolute -inset-4 -z-10 rounded-full bg-gold/25 blur-2xl" />
                <span className="cta-sheen relative z-10 bg-gold px-9 py-4 text-[0.68rem] font-medium uppercase tracking-[0.3em] text-onyx transition-colors duration-300 group-hover:bg-alabaster">
                  Craft Your Wedding Suite
                </span>
              </Link>
              <Link
                href="/w/demo-wedding-9kumu"
                className="group inline-flex items-center gap-3 text-[0.68rem] uppercase tracking-[0.3em] text-rose-champagne/75 transition-colors hover:text-gold"
              >
                See a live invitation
                <span className="transition-transform duration-300 group-hover:translate-x-1.5">
                  →
                </span>
              </Link>
            </div>
          </div>

          <div className="hero-in hero-in-4 mt-20 flex items-end justify-between gap-8">
            <div className="flex items-center gap-4">
              <span className="relative block h-16 w-px overflow-hidden bg-gold/25">
                <span className="cue-dot absolute inset-x-0 h-6 bg-gold" />
              </span>
              <span className="text-[0.58rem] uppercase tracking-[0.34em] text-rose-champagne/50">
                Scroll
              </span>
            </div>
            <div className="flex items-center gap-2" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="block h-px w-10 overflow-hidden bg-gold/20 md:w-14"
                >
                  <span
                    className={`hero-bar hero-bar-${i} block h-px w-full bg-gold`}
                  />
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Editorial ticker */}
      <div
        className="marquee border-y border-gold/15 bg-onyx py-7"
        aria-hidden="true"
      >
        <div className="marquee-track">
          {[0, 1].map((group) => (
            <div key={group} className="flex shrink-0 items-center">
              {TICKER.map((item) => (
                <span
                  key={item}
                  className="flex items-center whitespace-nowrap font-serif text-xl font-light italic text-rose-champagne/70 md:text-2xl"
                >
                  {item}
                  <span className="mx-8 text-sm not-italic text-gold/60">✦</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
      {/* The suite */}
      <section className="mx-auto max-w-7xl px-6 py-24 md:px-12 md:py-32">
        <div className="reveal max-w-2xl">
          <p className="text-[0.62rem] uppercase tracking-[0.42em] text-gold">
            The Suite
          </p>
          <h2 className="mt-6 font-serif text-4xl font-light leading-tight text-alabaster md:text-5xl">
            Three steps from{" "}
            <em className="italic text-rose-champagne">yes</em> to a live
            invitation.
          </h2>
        </div>

        <div
          className="rule-draw mt-16 h-px bg-gradient-to-r from-gold/55 via-gold/25 to-transparent"
          aria-hidden="true"
        />
        <div className="grid md:grid-cols-3">
          {STEPS.map((step, i) => (
            <div
              key={step.n}
              className={`reveal border-gold/15 py-10 md:px-10 md:py-14 ${
                i === 1 ? "reveal-d1" : i === 2 ? "reveal-d2" : ""
              } ${i > 0 ? "border-t md:border-l md:border-t-0" : ""}`}
            >
              <span className="font-serif text-3xl font-light italic text-gold">
                {step.n}
              </span>
              <h3 className="mt-6 font-serif text-2xl font-light text-alabaster">
                {step.title}
              </h3>
              <p className="mt-4 text-sm font-light leading-relaxed text-rose-champagne/70">
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* The pass */}
      <section className="border-y border-gold/15 bg-[#08090c]">
        <div className="mx-auto grid max-w-7xl items-center gap-16 px-6 py-24 md:grid-cols-2 md:px-12 md:py-32">
          <div className="reveal">
            <p className="text-[0.62rem] uppercase tracking-[0.42em] text-gold">
              The Access Pass
            </p>
            <h2 className="mt-6 font-serif text-4xl font-light leading-tight text-alabaster md:text-5xl">
              Every guest leaves with a{" "}
              <em className="italic text-rose-champagne">keepsake</em>.
            </h2>
            <p className="mt-6 max-w-lg text-base font-light leading-relaxed text-rose-champagne/75">
              The moment a guest RSVPs we render a personalised pass: their
              name, their side, their own guest ID, and a QR code belonging to
              them alone.
            </p>

            <ul className="mt-10 space-y-4 text-sm font-light text-rose-champagne/75">
              <li className="flex gap-5">
                <span className="font-serif italic text-gold">01</span>
                A guest ID for the door — G-DA-001, B-DA-014.
              </li>
              <li className="flex gap-5">
                <span className="font-serif italic text-gold">02</span>
                A private QR code, printed only on their pass.
              </li>
              <li className="flex gap-5">
                <span className="font-serif italic text-gold">03</span>
                Both of your signatures, set beneath their name.
              </li>
              <li className="flex gap-5">
                <span className="font-serif italic text-gold">04</span>
                1080 × 1920 — ready to download, share or print.
              </li>
            </ul>
          </div>

          <div className="reveal reveal-d1">
            <div className="parallax-soft flex justify-center">
              <div className="float-soft relative w-[68%] max-w-[290px]">
                <span className="pointer-events-none absolute -inset-8 -z-10 rounded-full bg-gold/12 blur-3xl" />
                <div className="border border-gold/35 bg-onyx p-2 shadow-2xl shadow-black/60">
                  <Image
                    src="/marketing/sample-pass.webp"
                    width={820}
                    height={1458}
                    alt="A sample Aravow guest access pass: a 1080 by 1920 card carrying the guest name, their guest ID and a personal QR code."
                    className="h-auto w-full"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Tiers */}
      <section className="mx-auto max-w-7xl px-6 pt-24 pb-14 md:px-12 md:pt-32 md:pb-16">
        <div className="reveal max-w-2xl">
          <p className="text-[0.62rem] uppercase tracking-[0.42em] text-gold">
            Guest Tiers
          </p>
          <h2 className="mt-6 font-serif text-4xl font-light leading-tight text-alabaster md:text-5xl">
            Priced by <em className="italic text-rose-champagne">seats</em>,
            never by surprises.
          </h2>
          <p className="mt-6 text-base font-light leading-relaxed text-rose-champagne/75">
            One RSVP is one seat. If your list grows afterwards, you pay only
            the difference.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {TIER_ORDER.map((id, i) => {
            const tier = TIERS[id];
            const featured = id === "CLASSIC";
            const range = `Up to ${tier.maxGuests} guests`;

            return (
              <div
                key={tier.id}
                className={`tier-card reveal relative flex flex-col border p-8 md:p-10 ${
                  featured
                    ? `reveal-d${i === 0 ? "" : i + 1} border-gold/60 bg-gold/[0.06]`
                    : `reveal-d${i === 0 ? "" : i + 1} border-gold/15 bg-onyx`
                }`}
              >
                {featured && (
                  <span className="absolute -top-3 left-8 bg-gold px-3 py-1 text-[0.55rem] uppercase tracking-[0.26em] text-onyx">
                    Most chosen
                  </span>
                )}
                <h3 className="font-serif text-3xl font-light text-alabaster">
                  {tier.label}
                </h3>
                <p className="mt-3 text-[0.6rem] uppercase tracking-[0.3em] text-rose-champagne/60">
                  {range}
                </p>
                <p className="mt-8 font-serif text-4xl font-light text-gold">
                  {tier.basePriceMinor === 0 ? "Free" : formatNaira(tier.basePriceMinor)}
                </p>
                <p className="mt-3 text-xs font-light leading-relaxed text-rose-champagne/60">
                  {tier.branded
                    ? "One payment-free publish. Shows Aravow branding."
                    : "One payment. Unbranded. Live immediately."}
                </p>
                <Link
                  href="/studio"
                  className={`mt-10 inline-block border px-6 py-3 text-center text-[0.6rem] uppercase tracking-[0.26em] transition-colors ${
                    featured
                      ? "cta-sheen border-gold bg-gold text-onyx hover:bg-alabaster"
                      : "border-gold/40 text-gold hover:bg-gold hover:text-onyx"
                  }`}
                >
                  Choose {tier.label}
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* Closing */}
      <section className="relative overflow-hidden border-t border-gold/15 px-6 pt-20 pb-28 text-center md:pt-24 md:pb-36">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 flex justify-center"
          aria-hidden="true"
        >
          <span className="parallax-drift h-72 w-72 rounded-full bg-gold/10 blur-3xl" />
        </div>
        <div className="reveal mx-auto max-w-2xl">
          <p className="font-script text-3xl text-rose-champagne/80">with love</p>
          <h2 className="mt-8 font-serif text-4xl font-light leading-tight text-alabaster md:text-6xl">
            Your guests will keep it.
            <br />
            <em className="italic text-gold">Long after the dancing.</em>
          </h2>
          <Link
            href="/studio"
            className="mt-12 inline-block border border-gold px-10 py-4 text-[0.68rem] uppercase tracking-[0.3em] text-gold transition-colors hover:bg-gold hover:text-onyx"
          >
            Start Your Suite
          </Link>
        </div>
      </section>

      <footer className="border-t border-gold/15">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 text-[0.6rem] uppercase tracking-[0.24em] text-rose-champagne/45 md:flex-row md:px-12">
          <span>Aravow · Crafted for Nigerian weddings</span>
          <div className="flex items-center gap-6">
            <Link href="/studio" className="transition-colors hover:text-gold">
              The Studio
            </Link>
            <Link
              href="/dashboard"
              className="transition-colors hover:text-gold"
            >
              Couple sign in
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
