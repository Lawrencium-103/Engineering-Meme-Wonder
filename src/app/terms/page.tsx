import type { Metadata } from "next";
import { LegalFooter } from "@/components/LegalFooter";

export const metadata: Metadata = {
  title: "Terms of Service · Aravow",
  description: "The terms that govern your use of Aravow, operated by Dara Initiative Technologies Limited.",
};

const TIERS = [
  { label: "Free", guests: "Up to 75 guests", price: "₦0", note: "Selected designs · Aravow branding" },
  { label: "Classic", guests: "31–100 guests", price: "₦24,990", note: "All designs · No Aravow branding" },
  { label: "Grand", guests: "101–250 guests", price: "₦49,990", note: "All designs · No Aravow branding" },
  { label: "Epic", guests: "251–500 guests", price: "₦99,990", note: "All designs · No Aravow branding" },
];

export default function TermsPage() {
  return (
    <main className="flex min-h-dvh flex-col">
      <article className="mx-auto w-full max-w-3xl flex-1 px-6 py-16 md:py-24">
        <p className="text-[0.6rem] uppercase tracking-[0.3em] text-rose-champagne/50">Aravow · Legal</p>
        <h1 className="mt-4 font-serif text-4xl font-light text-alabaster md:text-5xl">Terms of Service</h1>
        <p className="mt-3 text-xs uppercase tracking-[0.2em] text-rose-champagne/40">Last updated 15 October 2026</p>

        <div className="mt-12 space-y-10 text-sm leading-7 text-rose-champagne/75">
          <section className="space-y-3">
            <h2 className="font-serif text-2xl font-light text-gold">1. About these terms</h2>
            <p>
              Aravow (&quot;the service&quot;) is operated by Dara Initiative Technologies Limited
              (&quot;Dara&quot;, &quot;we&quot;, &quot;us&quot;), a company registered in Nigeria. These
              terms apply when you create an account, use the Aravow studio, publish an event page, or
              otherwise use the service. By using Aravow you accept these terms. If you do not accept
              them, please do not use the service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-2xl font-light text-gold">2. Who can use Aravow</h2>
            <p>
              You must be at least 18 years old to create an account. You sign in with your email
              address through a one-time sign-in link — there are no passwords. You are responsible for
              all activity that happens through your account, so please keep your sign-in links private.
              You must provide accurate information and keep it up to date.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-2xl font-light text-gold">3. The service</h2>
            <p>
              Aravow lets couples and event hosts design digital wedding invitation suites: an event
              page with your ceremonies and details, RSVP collection, guest management, digital guest
              passes with QR check-in, and flyer design tools. Published event pages are public to
              anyone with the link.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-2xl font-light text-gold">4. Your content</h2>
            <p>
              You keep ownership of everything you upload or create in Aravow — names, dates, photos,
              designs, guest lists and signatures. You give us a licence to store, process and display
              that content solely to operate the service (for example, publishing your invitation page,
              rendering guest passes, and generating share images).
            </p>
            <p>
              You confirm that you have the rights and, where required, the permissions of the people
              whose information you upload — including guest contact details — to share it with us for
              this purpose.
            </p>
          </section>
          <section className="space-y-3">
            <h2 className="font-serif text-2xl font-light text-gold">5. Acceptable use</h2>
            <p>You agree not to use Aravow to:</p>
            <ul className="list-disc space-y-2 pl-5 marker:text-gold/60">
              <li>publish unlawful, infringing, defamatory or harassing content;</li>
              <li>access events, accounts or guest data that are not yours;</li>
              <li>probe, scan or test the security of the service without our written permission;</li>
              <li>
                resell, aggregate or provide the service — or accept payments on behalf of other
                parties — as a payment service provider;
              </li>
              <li>interfere with the normal operation of the service or other users&apos; access to it.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-2xl font-light text-gold">6. Fees and payment</h2>
            <p>
              Aravow is free to try. Paid tiers are a one-time payment per event and raise your guest
              cap and design options. Current pricing:
            </p>
            <div className="overflow-hidden border border-white/10">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/10 text-[0.6rem] uppercase tracking-[0.2em] text-rose-champagne/50">
                  <tr>
                    <th className="px-4 py-3 font-normal">Tier</th>
                    <th className="px-4 py-3 font-normal">Guest cap</th>
                    <th className="px-4 py-3 font-normal">Price</th>
                    <th className="hidden px-4 py-3 font-normal sm:table-cell">Includes</th>
                  </tr>
                </thead>
                <tbody>
                  {TIERS.map((t) => (
                    <tr key={t.label} className="border-b border-white/5 last:border-0">
                      <td className="px-4 py-3 text-alabaster">{t.label}</td>
                      <td className="px-4 py-3">{t.guests}</td>
                      <td className="px-4 py-3 text-gold">{t.price}</td>
                      <td className="hidden px-4 py-3 sm:table-cell">{t.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>
              Payments are processed securely by Paystack on its own checkout page — Aravow never sees
              or stores your card details. When you upgrade from a tier you have already paid for, you
              only pay the difference. Paid features are unlocked once your payment is confirmed.
              Prices are in Nigerian Naira and may change over time; the price shown at checkout is the
              price you pay.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-2xl font-light text-gold">7. Availability</h2>
            <p>
              We work hard to keep Aravow running, but the service is provided &quot;as is&quot; and
              &quot;as available&quot;. We may update, suspend or discontinue features, and we cannot
              guarantee uninterrupted or error-free operation.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-2xl font-light text-gold">8. Suspension and termination</h2>
            <p>
              You may stop using Aravow at any time and may ask us to close your account by emailing
              us. We may suspend or terminate access if you breach these terms, if required by law, or
              to protect the service and its users. Any fees you owe remain payable after termination.
            </p>
          </section>
          <section className="space-y-3">
            <h2 className="font-serif text-2xl font-light text-gold">9. Disclaimers and liability</h2>
            <p>
              Except for warranties that Nigerian law does not allow us to exclude, the service is
              provided without warranties of any kind. To the maximum extent permitted by law, Dara
              Initiative Technologies Limited is not liable for indirect, incidental or consequential
              losses, and our total liability for any claim relating to the service will not exceed the
              amount you paid for the service in question. Nothing in these terms limits rights you
              have under applicable law.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-2xl font-light text-gold">10. Governing law</h2>
            <p>
              These terms are governed by the laws of the Federal Republic of Nigeria, and disputes
              will be resolved in the courts of Nigeria.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-2xl font-light text-gold">11. Changes to these terms</h2>
            <p>
              We may update these terms from time to time. The &quot;Last updated&quot; date at the top
              of this page shows when the current version took effect. Continuing to use Aravow after a
              change means you accept the updated terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-2xl font-light text-gold">12. Contact</h2>
            <p>
              Questions about these terms? Email{" "}
              <a href="mailto:contact@aravow.org" className="text-gold underline underline-offset-4">
                contact@aravow.org
              </a>{" "}
              or use our{" "}
              <a href="/contact" className="text-gold underline underline-offset-4">
                contact page
              </a>
              .
            </p>
          </section>
        </div>
      </article>
      <LegalFooter />
    </main>
  );
}
