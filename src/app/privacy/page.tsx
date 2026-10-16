import type { Metadata } from "next";
import { LegalFooter } from "@/components/LegalFooter";

export const metadata: Metadata = {
  title: "Privacy Policy · Aravow",
  description:
    "How Aravow, operated by Dara Initiative Technologies Limited, collects, uses and protects your personal data.",
};

export default function PrivacyPage() {
  return (
    <main className="flex min-h-dvh flex-col">
      <article className="mx-auto w-full max-w-3xl flex-1 px-6 py-16 md:py-24">
        <p className="text-[0.6rem] uppercase tracking-[0.3em] text-rose-champagne/50">Aravow · Legal</p>
        <h1 className="mt-4 font-serif text-4xl font-light text-alabaster md:text-5xl">Privacy Policy</h1>
        <p className="mt-3 text-xs uppercase tracking-[0.2em] text-rose-champagne/40">Last updated 15 October 2026</p>

        <div className="mt-12 space-y-10 text-sm leading-7 text-rose-champagne/75">
          <section className="space-y-3">
            <h2 className="font-serif text-2xl font-light text-gold">1. Who we are</h2>
            <p>
              Aravow is operated by Dara Initiative Technologies Limited (&quot;we&quot;, &quot;us&quot;),
              a company registered in Nigeria. This policy explains what personal data we collect when
              you use Aravow, why we collect it, and the choices you have. For any privacy question,
              email{" "}
              <a href="mailto:contact@aravow.org" className="text-gold underline underline-offset-4">
                contact@aravow.org
              </a>
              .
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-2xl font-light text-gold">2. What we collect</h2>
            <ul className="list-disc space-y-2 pl-5 marker:text-gold/60">
              <li>
                <span className="text-alabaster">Account email.</span> When you sign in, we collect
                your email address to create and manage your account.
              </li>
              <li>
                <span className="text-alabaster">Event content.</span> The details you enter in the
                studio — couple&apos;s names, wedding date, ceremony venues and times, themes, designs
                and uploaded images.
              </li>
              <li>
                <span className="text-alabaster">Guest information.</span> Guest lists that hosts
                upload (names and contact details), and the responses guests submit on an RSVP form
                (their name, attendance response and any message or contact details they choose to
                share).
              </li>
              <li>
                <span className="text-alabaster">Signatures and passes.</span> Signatures guests add to
                their digital guest passes, and the pass tokens used for check-in.
              </li>
              <li>
                <span className="text-alabaster">Payment records.</span> Transaction references,
                amounts, tiers and payment status that Paystack reports to us when you pay for a tier.
                We never receive or store your full card details.
              </li>
              <li>
                <span className="text-alabaster">Technical information.</span> Information such as IP
                addresses, used for security and to limit abuse (for example, rate-limiting sign-in
                and payment requests).
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-2xl font-light text-gold">3. How we use it</h2>
            <ul className="list-disc space-y-2 pl-5 marker:text-gold/60">
              <li>to provide the service — publish your event page, issue guest passes, run check-in and collect RSVPs;</li>
              <li>to send service emails, such as your one-time sign-in link;</li>
              <li>to process payments and unlock the tier you paid for;</li>
              <li>to protect the service against fraud, abuse and unauthorised access;</li>
              <li>to respond to support and privacy requests.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-2xl font-light text-gold">4. Our legal bases</h2>
            <p>
              We process personal data to deliver the service you (or the host organising the event)
              have asked for, for legitimate interests such as security and abuse prevention, and where
              consent is required by law. Hosts are responsible for having the right to upload guest
              contact details to Aravow, and guests choose what they submit on an RSVP form.
            </p>
          </section>
          <section className="space-y-3">
            <h2 className="font-serif text-2xl font-light text-gold">5. Sharing</h2>
            <p>We share personal data only with the service providers that help us run Aravow:</p>
            <ul className="list-disc space-y-2 pl-5 marker:text-gold/60">
              <li>
                <span className="text-alabaster">Paystack</span> — payment processing. Their privacy
                policy governs how they handle payment data.
              </li>
              <li>
                <span className="text-alabaster">Resend</span> — delivery of transactional emails such
                as sign-in links.
              </li>
              <li>
                <span className="text-alabaster">Cloudinary</span> — storage of images and media you
                upload.
              </li>
            </ul>
            <p>
              We may also disclose data where the law requires it. We do{" "}
              <span className="text-alabaster">not</span> sell personal data.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-2xl font-light text-gold">6. Cookies</h2>
            <p>
              Aravow uses a single essential cookie (
              <span className="font-mono text-xs">av_session</span>) to keep you signed in. It lasts up
              to 30 days and is not used for advertising. We do not use advertising or tracking
              cookies.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-2xl font-light text-gold">7. Retention and deletion</h2>
            <p>
              We keep personal data while your account is active and for as long as needed to provide
              the service. You can ask us to delete your account and its data by emailing us. Some
              records — such as payment records — may be kept where we are legally required to retain
              them.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-2xl font-light text-gold">8. Security</h2>
            <p>
              Connections to Aravow are encrypted in transit, sessions are stored in a cookie that
              scripts cannot read (HttpOnly), and sign-in is by one-time email link, so there are no
              passwords to leak. Card payments are handled entirely on Paystack&apos;s checkout — we
              never see or store full card details.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-2xl font-light text-gold">9. Your rights</h2>
            <p>
              Under the Nigeria Data Protection Act 2023 (NDPA) you have rights over your personal
              data, including the right to access it, correct it, delete it, object to or restrict
              certain processing, and withdraw consent. To exercise any of these rights, email{" "}
              <a href="mailto:contact@aravow.org" className="text-gold underline underline-offset-4">
                contact@aravow.org
              </a>
              . You also have the right to lodge a complaint with the Nigeria Data Protection
              Commission.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-2xl font-light text-gold">10. Children</h2>
            <p>
              Aravow is for event hosts and guests aged 18 and over. We do not knowingly create
              accounts for children.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-2xl font-light text-gold">11. Changes to this policy</h2>
            <p>
              We may update this policy from time to time. The &quot;Last updated&quot; date at the top
              shows when the current version took effect.
            </p>
          </section>
        </div>
      </article>
      <LegalFooter />
    </main>
  );
}
