import Image from "next/image";
import Link from "next/link";
import { TIERS, TIER_ORDER, formatNaira } from "@/lib/pricing";
import HeroDemo from "@/components/HeroDemo";
import { SiteMenu } from "@/components/SiteMenu";
import "./hero-demo.css";

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
  "No App Needed",
  "Made in Nigeria",
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
    body: "Free for up to 75 guests. Above that, pay once by guest count — a tier is just a seat cap, so you only pay for the seats you actually need.",
  },
  {
    n: "03",
    title: "Send one link on WhatsApp",
    body: "Every guest who opens it RSVPs in seconds — no app, no sign-up — and receives a personal pass with their own guest ID and QR code.",
  },
];

/** One line per tier answering "is this for me?" */
const FOR_WHO: Record<string, string> = {
  FREE: "For small celebrations.",
  CLASSIC: "For intimate weddings.",
  GRAND: "For the full owambe — most Lagos weddings.",
  EPIC: "For the grand owambe — 250 guests and above.",
};

export default function LandingPage() {
  return (
    <main className="min-h-dvh bg-onyx">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-gold/15 bg-onyx/92 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-12">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-[0.68rem] font-light uppercase tracking-[0.42em] text-alabaster transition-colors hover:text-gold"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/aravow-mark.png" alt="" className="h-8 w-8" />
            Aravow
          </Link>
          <SiteMenu />
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

        <div className="hero-rise mx-auto grid w-full max-w-7xl items-center lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-x-16">
          <div className="max-w-3xl">
            <div className="hero-in hero-in-1 flex items-center gap-4">
              <span className="h-px w-12 bg-gold/70" />
              <p className="text-[0.66rem] uppercase tracking-[0.42em] text-gold">
                Aravow · Nigeria
              </p>
            </div>

            <h1 className="mt-8 font-serif text-[3.05rem] font-light leading-[1.03] text-alabaster sm:text-6xl md:text-7xl lg:text-5xl xl:text-[4.8rem] 2xl:text-[5.4rem]">
              <span className="mask">
                <span className="mask-line">Know exactly</span>
              </span>
              <span className="mask">
                <span className="mask-line italic text-gold">
                  who&rsquo;s coming.
                </span>
              </span>
            </h1>

            <div className="draw-x mt-9 h-px w-40 bg-gold/50" />
            <p className="hero-in hero-in-2 mt-8 max-w-xl text-base font-light leading-relaxed text-rose-champagne/85 md:text-lg">
              One beautiful link on WhatsApp. Every guest RSVPs in seconds and
              gets a personal pass — and you see the full guest list live. No
              app to download, nothing to print.
            </p>

            <div className="hero-in hero-in-3 mt-11 flex flex-col items-start gap-6 sm:flex-row sm:flex-wrap sm:items-center">
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

          <HeroDemo />

          <div className="hero-in hero-in-4 mt-20 flex items-end justify-between gap-8 lg:col-span-full">
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
        className="marquee border-y border-gold/15 bg-onyx py-6"
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
      {/* The problem */}
      <section className="mx-auto max-w-7xl px-6 py-8 md:px-12 md:py-10">
        <div className="reveal max-w-3xl">
          <p className="text-[0.62rem] uppercase tracking-[0.42em] text-gold">
            Why This Exists
          </p>
          <h2 className="mt-6 font-serif text-4xl font-light leading-tight text-alabaster md:text-5xl">
            Paper cards, forwarded flyers, and{" "}
            <em className="italic text-rose-champagne">a number nobody knows</em>.
          </h2>
        </div>
        <div
          className="rule-draw mt-10 h-px bg-gradient-to-r from-gold/55 via-gold/25 to-transparent"
          aria-hidden="true"
        />
        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {[
            "Paper cards cost ₦250,000 and end up on the floor.",
            "A flyer on WhatsApp gets forwarded to people you've never met.",
            "And two days before the wedding, you still don't know if 150 or 400 people are coming.",
          ].map((line, i) => (
            <p
              key={line}
              className={`reveal font-serif text-2xl font-light leading-snug text-rose-champagne/85 md:text-3xl ${
                i === 1 ? "reveal-d1" : i === 2 ? "reveal-d2" : ""
              }`}
            >
              {line}
            </p>
          ))}
        </div>
      </section>
      {/* The suite */}
      <section className="mx-auto max-w-7xl px-6 py-8 md:px-12 md:py-10">
        <div className="reveal max-w-2xl">
          <p className="text-[0.62rem] uppercase tracking-[0.42em] text-gold">
            How It Works
          </p>
          <h2 className="mt-6 font-serif text-4xl font-light leading-tight text-alabaster md:text-5xl">
            Three steps from{" "}
            <em className="italic text-rose-champagne">yes</em> to a live
            invitation.
          </h2>
        </div>

        <div
          className="rule-draw mt-10 h-px bg-gradient-to-r from-gold/55 via-gold/25 to-transparent"
          aria-hidden="true"
        />
        <div className="grid md:grid-cols-3">
          {STEPS.map((step, i) => (
            <div
              key={step.n}
              className={`reveal border-gold/15 py-8 md:px-10 md:py-10 ${
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
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-8 md:grid-cols-2 md:px-12 md:py-10">
          <div className="reveal">
            <p className="text-[0.62rem] uppercase tracking-[0.42em] text-gold">
              For Your Guests
            </p>
            <h2 className="mt-6 font-serif text-4xl font-light leading-tight text-alabaster md:text-5xl">
              Every guest gets a{" "}
              <em className="italic text-rose-champagne">personal pass</em>.
            </h2>
            <p className="mt-6 max-w-lg text-base font-light leading-relaxed text-rose-champagne/75">
              The moment a guest RSVPs we render a personalised pass: their
              name, their side, their own guest ID, and a QR code belonging to
              them alone.
            </p>

            <ul className="mt-10 space-y-4 text-sm font-light text-rose-champagne/75">
              <li className="flex gap-5">
                <span className="font-serif italic text-gold">01</span>
                A guest ID for the door: G-DA-001, B-DA-014.
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
                1080 × 1920, ready to download, share or print.
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
      {/* For you — the dashboard */}
      <section className="border-b border-gold/15 bg-[#08090c]">
        <div className="mx-auto max-w-7xl px-6 py-8 md:px-12 md:py-10">
          <div className="reveal max-w-2xl">
            <p className="text-[0.62rem] uppercase tracking-[0.42em] text-gold">
              For You, the Couple
            </p>
            <h2 className="mt-6 font-serif text-4xl font-light leading-tight text-alabaster md:text-5xl">
              Control is what you&rsquo;re{" "}
              <em className="italic text-rose-champagne">actually</em> paying for.
            </h2>
            <p className="mt-6 text-base font-light leading-relaxed text-rose-champagne/75">
              Watch your guest list fill in real time, split by groom&rsquo;s side
              and bride&rsquo;s side. Know your numbers before you pay the caterer.
              Download the full list for your planner and gate in one tap. Change a
              venue or time and every guest sees it instantly.
            </p>
          </div>
          <div className="mt-10 grid gap-px border border-gold/15 bg-gold/15 md:grid-cols-4">
            {[
              {
                t: "Live guest list",
                d: "Every RSVP as it lands — split by the groom's side and the bride's side.",
              },
              {
                t: "A capacity meter",
                d: "RSVPs counted against your cap, so feeding and seating are never a guess.",
              },
              {
                t: "One-tap CSV",
                d: "The full list for your caterer, planner and gate team, downloaded in one tap.",
              },
              {
                t: "Edit anything, anytime",
                d: "Move the venue or change the time — every guest sees it the same second.",
              },
            ].map((f, i) => (
              <div
                key={f.t}
                className={`reveal bg-onyx p-8 ${
                  i === 1 ? "reveal-d1" : i === 2 ? "reveal-d2" : i === 3 ? "reveal-d2" : ""
                }`}
              >
                <h3 className="font-serif text-xl font-light text-gold">{f.t}</h3>
                <p className="mt-3 text-sm font-light leading-relaxed text-rose-champagne/70">
                  {f.d}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* The comparison */}
      <section className="mx-auto max-w-7xl px-6 py-8 md:px-12 md:py-10">
        <div className="reveal max-w-2xl">
          <p className="text-[0.62rem] uppercase tracking-[0.42em] text-gold">
            The Honest Comparison
          </p>
          <h2 className="mt-6 font-serif text-4xl font-light leading-tight text-alabaster md:text-5xl">
            The other ways to do it — and{" "}
            <em className="italic text-rose-champagne">what they cost you</em>.
          </h2>
        </div>
        <div className="reveal mt-10 grid gap-6 md:grid-cols-3">
          {[
            {
              name: "Paper cards",
              price: "From ₦250,000",
              featured: false,
              points: [
                "No RSVPs — you never know who is coming",
                "No guest list for the caterer or the gate",
                "Printed weeks ahead; details can't change",
                "Ends up on the floor",
              ],
            },
            {
              name: "A flyer on WhatsApp",
              price: "Free",
              featured: false,
              points: [
                "Forwarded to people you've never met",
                "Replies scatter across a dozen chats",
                "No guest list, no numbers, no passes",
                "Anything changed? Send another flyer",
              ],
            },
            {
              name: "Aravow",
              price: "Free to ₦99,990 — one payment",
              featured: true,
              points: [
                "Every RSVP counted, live, by groom's and bride's side",
                "Capacity meter and one-tap CSV for caterer and gate",
                "Change the venue once — every guest sees it",
                "Every guest gets a personal pass with a QR code",
              ],
            },
          ].map((c) => (
            <div
              key={c.name}
              className={`reveal flex flex-col border p-8 md:p-10 ${
                c.featured
                  ? "border-gold/60 bg-gold/[0.06]"
                  : "border-gold/15 bg-onyx"
              }`}
            >
              <h3
                className={`font-serif text-3xl font-light ${
                  c.featured ? "text-gold" : "text-alabaster"
                }`}
              >
                {c.name}
              </h3>
              <p className="mt-2 text-[0.62rem] uppercase tracking-[0.3em] text-rose-champagne/60">
                {c.price}
              </p>
              <ul className="mt-8 space-y-4 text-sm font-light text-rose-champagne/75">
                {c.points.map((p) => (
                  <li key={p} className="flex gap-4">
                    <span
                      className={`mt-0.5 shrink-0 ${
                        c.featured ? "text-gold" : "text-rose-champagne/40"
                      }`}
                    >
                      {c.featured ? "✓" : "✗"}
                    </span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
      {/* Tiers */}
      <section className="mx-auto max-w-7xl px-6 pt-8 pb-6 md:px-12 md:pt-10 md:pb-8">
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

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
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
                    Best for most weddings
                  </span>
                )}
                <h3 className="font-serif text-3xl font-light text-alabaster">
                  {tier.label}
                </h3>
                <p className="mt-3 text-[0.6rem] uppercase tracking-[0.3em] text-rose-champagne/60">
                  {range}
                </p>
                <p className="mt-2 font-serif text-base italic text-rose-champagne/80">
                  {FOR_WHO[id]}
                </p>
                <p className="mt-8 font-serif text-4xl font-light text-gold">
                  {tier.basePriceMinor === 0 ? "Free" : formatNaira(tier.basePriceMinor)}
                </p>
                <p className="mt-3 text-xs font-light leading-relaxed text-rose-champagne/60">
                  {tier.branded
                    ? "Free forever for small celebrations, with Aravow branding."
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

        <div className="reveal mx-auto mt-10 max-w-xl border border-gold/25 bg-gold/[0.04] px-8 py-7 text-center">
          <p className="text-sm font-light text-rose-champagne/75">
            <span className="text-alabaster">Secure checkout by Paystack.</span>{" "}
            We never see your card details.
          </p>
          <p className="mt-3 text-[0.64rem] uppercase tracking-[0.26em]">
            <Link
              href="/refunds"
              className="text-gold underline underline-offset-4 transition-colors hover:text-alabaster"
            >
              Refund policy
            </Link>
          </p>
        </div>
        <p className="reveal mx-auto mt-10 max-w-2xl text-center font-serif text-lg italic leading-relaxed text-gold/90 md:text-xl">
          &ldquo;If your invitation isn&rsquo;t live and beautiful within 24 hours
          of payment, we&rsquo;ll refund you in full.&rdquo;
        </p>
      </section>

      {/* The transformation */}
      <section className="border-y border-gold/15 bg-[#08090c]">
        <div className="reveal mx-auto max-w-3xl px-6 py-8 text-center md:py-10">
          <p className="text-[0.62rem] uppercase tracking-[0.42em] text-gold">
            The Transformation
          </p>
          <h2 className="mt-6 font-serif text-4xl font-light leading-tight text-alabaster md:text-5xl">
            You stop managing your wedding. You get to{" "}
            <em className="italic text-rose-champagne">attend</em> it.
          </h2>
        </div>
        <div className="reveal mx-auto mt-10 grid max-w-5xl gap-6 px-6 md:grid-cols-2">
          <div className="border border-white/10 bg-white/[0.02] p-8 text-left">
            <p className="text-[0.6rem] uppercase tracking-[0.3em] text-rose-champagne/50">
              Without Aravow
            </p>
            <ul className="mt-6 space-y-3 text-sm font-light leading-relaxed text-rose-champagne/70">
              {[
                "Counting heads from scattered WhatsApp replies",
                "Giving the caterer a guess, not a number",
                "An aunty calling at midnight for the venue address",
                "A card that ends up on the floor",
              ].map((line) => (
                <li key={line} className="flex gap-4">
                  <span className="mt-0.5 shrink-0 text-rose-champagne/40">✗</span>
                  {line}
                </li>
              ))}
            </ul>
          </div>
          <div className="border border-gold/50 bg-gold/[0.05] p-8 text-left">
            <p className="text-[0.6rem] uppercase tracking-[0.3em] text-gold">
              With Aravow
            </p>
            <ul className="mt-6 space-y-3 text-sm font-light leading-relaxed text-rose-champagne/80">
              {[
                "One live list — who is coming, by the groom's side and the bride's side",
                "Real numbers for the caterer, a real list for the gate",
                "Change the venue once; every guest simply knows",
                "Every guest arrives feeling personally invited",
              ].map((line) => (
                <li key={line} className="flex gap-4">
                  <span className="mt-0.5 shrink-0 text-gold">✓</span>
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="reveal mx-auto mt-10 max-w-2xl px-6 text-center font-serif text-xl italic leading-relaxed text-gold/90 md:text-2xl">
          So by the time the day arrives, the only thing left to do is celebrate.
        </p>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-6 py-8 md:py-10">
        <div className="reveal text-center">
          <p className="text-[0.62rem] uppercase tracking-[0.42em] text-gold">
            Questions
          </p>
          <h2 className="mt-6 font-serif text-4xl font-light text-alabaster md:text-5xl">
            Before you ask your{" "}
            <em className="italic text-rose-champagne">fiancé</em>.
          </h2>
        </div>
        <div className="reveal mt-10">
          {[
            {
              q: "Will my aunties and uncles manage it?",
              a: "If they can open WhatsApp, they can RSVP. They tap your link, type their name, and they're done — no app, no sign-up, no password.",
            },
            {
              q: "Does it need an app?",
              a: "No. The invitation, the RSVP and the passes all work in the phone's browser. There is nothing to download.",
            },
            {
              q: "Will it work on a cheap Android phone?",
              a: "Yes. Aravow is built light for Nigerian networks — the page loads fast and an RSVP takes seconds, even on an old phone.",
            },
            {
              q: "Is my payment safe?",
              a: "Payments are processed by Paystack, and we never see or store your card details. Our refund policy is clear and public — read it here.",
              link: { href: "/refunds", label: "Refund & payment policy" },
            },
            {
              q: "Can I change the date if the venue moves?",
              a: "Yes. Edit the ceremony in your studio and every guest sees the new details the same second — nothing to reprint, nothing to resend.",
            },
            {
              q: "What happens to our guests' data?",
              a: "Your guests' details are used only to run your wedding. They are never sold, and everything is handled under Nigeria's data protection law.",
              link: { href: "/privacy", label: "Privacy policy" },
            },
          ].map((f) => (
            <details key={f.q} className="group border-b border-white/10 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 font-serif text-lg font-light text-alabaster [&::-webkit-details-marker]:hidden">
                {f.q}
                <span className="text-gold transition-transform duration-300 group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm font-light leading-relaxed text-rose-champagne/70">
                {f.a}{" "}
                {"link" in f && f.link && (
                  <a
                    href={f.link.href}
                    className="text-gold underline underline-offset-4"
                  >
                    {f.link.label}
                  </a>
                )}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* Closing */}
      <section className="relative overflow-hidden border-t border-gold/15 px-6 pt-10 pb-12 text-center md:pt-12 md:pb-16">
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
            className="mt-10 inline-block border border-gold px-10 py-4 text-[0.68rem] uppercase tracking-[0.3em] text-gold transition-colors hover:bg-gold hover:text-onyx"
          >
            Start Your Suite
          </Link>
        </div>
      </section>

      <footer className="border-t border-gold/15">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 text-[0.6rem] uppercase tracking-[0.24em] text-rose-champagne/45 md:flex-row md:px-12">
          <span className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/aravow-mark.png" alt="" className="h-7 w-7" />
            Aravow · Crafted for Nigerian weddings
          </span>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <Link href="/studio" className="transition-colors hover:text-gold">
              The Studio
            </Link>
            <Link
              href="/dashboard"
              className="transition-colors hover:text-gold"
            >
              Couple sign in
            </Link>
            <Link href="/terms" className="transition-colors hover:text-gold">
              Terms
            </Link>
            <Link href="/privacy" className="transition-colors hover:text-gold">
              Privacy
            </Link>
            <Link href="/refunds" className="transition-colors hover:text-gold">
              Refunds
            </Link>
            <Link href="/contact" className="transition-colors hover:text-gold">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
