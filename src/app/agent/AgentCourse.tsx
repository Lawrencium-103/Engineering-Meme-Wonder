/**
 * Recruitment + training content shown above the agent registration form:
 * what Aravow is, why agents matter, where to sell, a sales script, and
 * exactly how the pay works. Styled to the Aravow design system.
 */

const WHERE_TO_SELL = [
  { place: "Schools", detail: "Final-year students, corps members (NYSC), young lecturers. Engagements start here. Notice boards, class WhatsApp groups." },
  { place: "Offices", detail: "Colleagues planning weddings. Ask HR or the social committee for 5 minutes at staff briefings." },
  { place: "Friends & family", detail: "Your warmest market. Every engaged cousin, sibling, or friend of a friend. Ask for referrals, not just sales." },
  { place: "Churches & mosques", detail: "Marriage committees, youth fellowships, women's groups. Ask the pastor or imam for permission to present after service." },
  { place: "Associations & groups", detail: "Old-boys and old-girls associations, professional bodies, trade unions, cooperatives, estate residents' associations." },
  { place: "Events & networking", detail: "Introductions, traditional weddings, naming ceremonies, owambe parties. Carry your code everywhere. Engaged couples are always in the room." },
];

const COURSE_STEPS = [
  { n: "1", title: "Learn the product in 10 minutes", body: "Open an Aravow invite (ask us for the demo link). Know the pitch by heart: a wedding website plus RSVP list plus guest passes, free up to ₦99,990. No printing, no paper invites, no gate wahala." },
  { n: "2", title: "List 20 names", body: "Write down 20 engaged or soon-to-marry people you can reach this week. Friends, family, colleagues, fellowship members. Your first sales come from this list." },
  { n: "3", title: "Message, don't broadcast", body: "One personal WhatsApp message beats a broadcast to 200 people. Use the script below. End every message with one question: their wedding month. Then help them sign up yourself or send your code." },
  { n: "4", title: "Follow up twice", body: "Day 2: ask if they saw your message. Day 5: ask if you should set up their free page this week. Most sales close on the second follow-up." },
  { n: "5", title: "Collect the code entry", body: "Make sure they type YOUR Customer Service ID (e.g. AV-01-SWT) at sign-up. None means no agent, and no code means no credit for you." },
];

export function AgentCourse() {
  return (
    <div className="mt-12 space-y-14">
      {/* What is Aravow */}
      <section>
        <p className="text-gold tracking-[0.35em] text-xs uppercase">What is Aravow</p>
        <h2 className="mt-2 font-serif text-3xl font-light text-alabaster">
          Weddings run on links now, not paper
        </h2>
        <p className="mt-4 text-sm leading-7 text-rose-champagne/60">
          Aravow gives every couple their own wedding website. Invitation page, online RSVP,
          guest list, gate passes. All inside one link they share on WhatsApp. Plans run from{" "}
          <span className="text-alabaster">FREE</span> (75 guests) to{" "}
          <span className="text-alabaster">Classic ₦24,990</span>,{" "}
          <span className="text-alabaster">Grand ₦49,990</span> and{" "}
          <span className="text-alabaster">Epic ₦99,990</span>. No printing, no lost cards,
          no gate wahala.
        </p>
      </section>

      {/* Why agents */}
      <section>
        <p className="text-gold tracking-[0.35em] text-xs uppercase">Why we need you</p>
        <h2 className="mt-2 font-serif text-3xl font-light text-alabaster">
          Weddings are sold by trust, not adverts
        </h2>
        <p className="mt-4 text-sm leading-7 text-rose-champagne/60">
          A couple will not trust a Facebook ad with the biggest day of their life. But they
          trust <span className="text-alabaster">you</span>. The colleague, the fellowship
          sister, the cousin who showed up with a working demo on their phone. Our agents are
          the face of Aravow in every estate, campus, office and congregation. You bring
          the trust. Aravow brings the product. The couple gets a fine wedding.
        </p>
      </section>

      {/* Short sales course */}
      <section>
        <p className="text-gold tracking-[0.35em] text-xs uppercase">Short sales course</p>
        <h2 className="mt-2 font-serif text-3xl font-light text-alabaster">
          Five steps to your first sale
        </h2>
        <ol className="mt-6 space-y-4">
          {COURSE_STEPS.map((s) => (
            <li key={s.n} className="flex gap-4 border border-white/10 p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gold/40 bg-gold/10 font-serif text-lg text-gold">
                {s.n}
              </span>
              <div>
                <p className="text-sm text-alabaster">{s.title}</p>
                <p className="mt-1 text-sm leading-6 text-rose-champagne/60">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Where to sell */}
      <section>
        <p className="text-gold tracking-[0.35em] text-xs uppercase">Where to sell</p>
        <h2 className="mt-2 font-serif text-3xl font-light text-alabaster">
          Engaged couples are everywhere
        </h2>
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {WHERE_TO_SELL.map((w) => (
            <div key={w.place} className="border border-white/10 p-4">
              <p className="text-sm uppercase tracking-[0.2em] text-gold">{w.place}</p>
              <p className="mt-2 text-sm leading-6 text-rose-champagne/60">{w.detail}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

