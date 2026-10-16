import type { Metadata } from "next";
import { LegalFooter } from "@/components/LegalFooter";

export const metadata: Metadata = {
  title: "Refunds & Payments · Aravow",
  description:
    "How payments, upgrades and refunds work on Aravow, operated by Dara Initiative Technologies Limited.",
};

const TIERS = [
  { label: "Free", guests: "Up to 75 guests", price: "₦0" },
  { label: "Classic", guests: "31–100 guests", price: "₦24,990" },
  { label: "Grand", guests: "101–250 guests", price: "₦49,990" },
  { label: "Epic", guests: "251–500 guests", price: "₦99,990" },
];

export default function RefundsPage() {
  return (
    <main className="flex min-h-dvh flex-col">
      <article className="mx-auto w-full max-w-3xl flex-1 px-6 py-16 md:py-24">
        <p className="text-[0.6rem] uppercase tracking-[0.3em] text-rose-champagne/50">Aravow · Legal</p>
        <h1 className="mt-4 font-serif text-4xl font-light text-alabaster md:text-5xl">Refunds &amp; Payments</h1>
        <p className="mt-3 text-xs uppercase tracking-[0.2em] text-rose-champagne/40">Last updated 15 October 2026</p>

        <div className="mt-12 space-y-10 text-sm leading-7 text-rose-champagne/75">
          <section className="space-y-3">
            <h2 className="font-serif text-2xl font-light text-gold">1. What you pay for</h2>
            <p>
              Aravow is free to try — the Free tier publishes an event for up to 75 guests using our
              selected free designs, with Aravow branding shown on the page and passes. Paid tiers are
              a <span className="text-alabaster">one-time payment per event</span> that raise your
              guest cap and unlock all designs with Aravow branding removed:
            </p>
            <div className="overflow-hidden border border-white/10">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/10 text-[0.6rem] uppercase tracking-[0.2em] text-rose-champagne/50">
                  <tr>
                    <th className="px-4 py-3 font-normal">Tier</th>
                    <th className="px-4 py-3 font-normal">Guest cap</th>
                    <th className="px-4 py-3 font-normal">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {TIERS.map((t) => (
                    <tr key={t.label} className="border-b border-white/5 last:border-0">
                      <td className="px-4 py-3 text-alabaster">{t.label}</td>
                      <td className="px-4 py-3">{t.guests}</td>
                      <td className="px-4 py-3 text-gold">{t.price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>
              When you upgrade from a tier you have already paid for, you only pay the difference — you
              are never charged twice for the same value.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-2xl font-light text-gold">2. How payment works</h2>
            <p>
              Payments are processed by Paystack on its secure checkout page. Aravow never sees or
              stores your card details. Your paid features are unlocked once Paystack confirms the
              payment to us, and a receipt is provided by Paystack for every successful transaction.
            </p>
          </section>
          <section className="space-y-3">
            <h2 className="font-serif text-2xl font-light text-gold">3. Our refund position</h2>
            <p>
              Because Aravow is a digital service that is delivered the moment your payment is
              confirmed and your event is upgraded,{" "}
              <span className="text-alabaster">
                payments are non-refundable once the paid features have been activated for your event
              </span>
              . This lets us keep prices low and is why a free tier exists — try Aravow first, and only
              pay when you are ready to publish.
            </p>
            <p>We will always make an exception where:</p>
            <ul className="list-disc space-y-2 pl-5 marker:text-gold/60">
              <li>you were charged more than once for the same payment (a duplicate charge) — we refund the duplicate in full;</li>
              <li>your payment succeeded but your paid features were never delivered — we either deliver them or refund you in full;</li>
              <li>Nigerian consumer law requires a refund.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-2xl font-light text-gold">4. How to request a refund</h2>
            <p>
              Email{" "}
              <a href="mailto:contact@aravow.org" className="text-gold underline underline-offset-4">
                contact@aravow.org
              </a>{" "}
              with your Paystack payment reference (references start with{" "}
              <span className="font-mono text-xs">AV-</span>), the event name, and a short description
              of the issue. We review every request and respond as soon as we reasonably can.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-2xl font-light text-gold">5. How refunds are paid</h2>
            <p>
              Approved refunds are sent back through Paystack to the original payment method. The time
              it takes to appear in your account depends on your bank. Where Paystack has charged
              processing fees on the original transaction, those charges may be deducted from the
              refund.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-2xl font-light text-gold">6. Failed or interrupted payments</h2>
            <p>
              If money left your account but your event was not upgraded, contact us with your payment
              reference. We will verify the transaction with Paystack and either complete the upgrade
              or refund you in full.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-2xl font-light text-gold">7. Downgrades</h2>
            <p>
              Tiers are designed around your guest count, and upgrades only charge the difference.
              Moving to a lower guest count does not create a refund of amounts already paid — the
              higher cap stays available to your event.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-2xl font-light text-gold">8. Questions</h2>
            <p>
              Anything unclear? Reach us through the{" "}
              <a href="/contact" className="text-gold underline underline-offset-4">
                contact page
              </a>{" "}
              — we are happy to explain any charge before you pay.
            </p>
          </section>
        </div>
      </article>
      <LegalFooter />
    </main>
  );
}
