import Link from "next/link";
import { desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { accounts, events, payments } from "@/db/schema";
import { getSessionAccount } from "@/lib/auth";
import { findAgentByEmail } from "@/lib/agents";
import { formatNaira, tierLabel, normalizeTier, type TierId } from "@/lib/pricing";
import { AgentRegisterForm } from "./AgentRegisterForm";
import { CopyCodeButton } from "./CopyCodeButton";
import { AgentCourse } from "./AgentCourse";
import { AgentScript } from "./AgentScript";
import { AgentEarnings } from "./AgentEarnings";
import { AgentEarningsPanel } from "./AgentEarningsPanel";
import { pointsForTier, payoutFor, formatPoints } from "@/lib/agent-comp";

export const metadata = { title: "Sales Agents · Aravow" };

/**
 * Sales-agent hub.
 * - Not signed in / not an agent yet: registration form (gets you a code).
 * - Signed in as an agent: your code to hand out + full sales ledger
 *   (every couple you referred and what they bought).
 */
export default async function AgentPage() {
  const account = await getSessionAccount();
  const agent = account ? await findAgentByEmail(account.email) : null;

  if (!agent) {
    return (
      <main className="min-h-dvh px-6 py-16 max-w-xl mx-auto">
        <nav className="mb-12">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 text-[0.62rem] uppercase tracking-[0.3em] text-rose-champagne/70 transition-colors hover:text-gold"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/aravow-mark.png" alt="" className="h-9 w-9" />
            Aravow
          </Link>
        </nav>
        <p className="text-gold tracking-[0.35em] text-xs uppercase">Aravow Sales Team</p>
        <h1 className="mt-2 font-serif text-4xl font-light text-alabaster">
          Sell weddings. Earn real money.
        </h1>
        <p className="mt-4 text-sm leading-7 text-rose-champagne/60">
          Register free and get your personal Customer Service ID, a code like{" "}
          <span className="font-mono text-gold">AV-01-SWT</span>. You earn{" "}
          <span className="text-alabaster">15% commission on everything you sell</span> plus a{" "}
          <span className="text-gold">₦40,000 bonus at 10 points</span>. Read the crash course
          below, then grab your code.
        </p>

        <AgentCourse />

        <div className="mt-14">
          <AgentScript />
        </div>

        <div className="mt-14">
          <AgentEarnings />
        </div>

        <div className="mt-14 border-t border-white/10 pt-10">
          <h2 className="font-serif text-3xl font-light text-alabaster">Get your agent code</h2>
          <AgentRegisterForm signedInEmail={account?.email ?? null} />
        </div>
      </main>
    );
  }
  return <AgentDashboard agent={agent} />;
}

/**
 * Agent view: the code to hand out, headline stats, and a per-couple ledger
 * of everything the referred accounts have bought.
 */
async function AgentDashboard({
  agent,
}: {
  agent: { id: string; code: string; name: string; createdAt: Date };
}) {
  const referred = await db
    .select({ accountId: accounts.id, email: accounts.email, joinedAt: accounts.createdAt })
    .from(accounts)
    .where(eq(accounts.referredByAgentId, agent.id))
    .orderBy(desc(accounts.createdAt));

  const eventRows =
    referred.length === 0
      ? []
      : await db
          .select({
            ownerId: events.ownerId,
            eventId: events.id,
            groomName: events.groomName,
            brideName: events.brideName,
            tier: events.tier,
          })
          .from(events)
          .where(
            inArray(
              events.ownerId,
              referred.map((r) => r.accountId),
            ),
          );

  const paidRows =
    eventRows.length === 0
      ? []
      : await db
          .select({
            eventId: payments.eventId,
            total: sql<string>`coalesce(sum(${payments.amountMinor}), 0)`,
          })
          .from(payments)
          .where(
            inArray(
              payments.eventId,
              eventRows.map((e) => e.eventId),
            ),
          )
          .groupBy(payments.eventId);
  const paidMap = new Map(paidRows.map((p) => [p.eventId, Number(p.total)]));

  const eventsByAccount = new Map<string, Array<{ groomName: string; brideName: string; tier: TierId; paidMinor: number; points: number }>>();
  for (const e of eventRows) {
    const list = eventsByAccount.get(e.ownerId) ?? [];
    list.push({
      groomName: e.groomName,
      brideName: e.brideName,
      tier: normalizeTier(e.tier),
      paidMinor: paidMap.get(e.eventId) ?? 0,
      points: pointsForTier(e.tier),
    });
    eventsByAccount.set(e.ownerId, list);
  }

  const ledger = referred.map((r) => ({
    ...r,
    couples: eventsByAccount.get(r.accountId) ?? [],
  }));

  const totalSoldMinor = ledger.reduce(
    (sum, r) => sum + r.couples.reduce((s, c) => s + c.paidMinor, 0),
    0,
  );
  const paidSales = ledger.reduce(
    (sum, r) => sum + r.couples.filter((c) => c.paidMinor > 0).length,
    0,
  );
  // Points come from referred events only; a referred account with no event
  // yet contributes nothing until the couple creates their suite.
  const totalPoints = ledger.reduce(
    (sum, r) => sum + r.couples.reduce((s, c) => s + c.points, 0),
    0,
  );
  const payout = payoutFor(totalPoints, totalSoldMinor);

  return (
    <main className="min-h-dvh px-6 py-12 max-w-3xl mx-auto">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 text-[0.62rem] uppercase tracking-[0.3em] text-rose-champagne/70 transition-colors hover:text-gold"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/aravow-mark.png" alt="" className="h-10 w-10" />
          Aravow
        </Link>
        <form action="/api/auth/signout" method="post">
          <button className="border border-white/20 px-4 py-2 text-xs text-rose-champagne/60 hover:border-gold/60 hover:text-gold transition-colors">
            Sign out
          </button>
        </form>
      </header>

      <p className="mt-10 text-gold tracking-[0.35em] text-xs uppercase">Your agent code</p>
      <div className="mt-4 border border-gold/40 bg-gold/5 px-6 py-8 text-center">
        <p className="font-mono text-4xl md:text-5xl tracking-widest text-gold">{agent.code}</p>
        <p className="mt-3 text-xs text-rose-champagne/50">
          {agent.name} · registered{" "}
          {agent.createdAt.toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}
        </p>
        <CopyCodeButton code={agent.code} />
      </div>
      <p className="mt-3 text-xs text-rose-champagne/50">
        Give this code to every couple you bring to Aravow. They type it at sign-up (or tap{" "}
        <span className="text-alabaster">None</span>). Every purchase lands below.
      </p>

      <AgentEarningsPanel payout={payout} />

      <section className="mt-12">
        <h2 className="font-serif text-2xl font-light text-rose-champagne">Your sales</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatTile label="Couples referred" value={String(ledger.length)} />
          <StatTile label="Paid sales" value={String(paidSales)} />
          <StatTile label="Total value" value={formatNaira(totalSoldMinor)} />
        </div>

        {ledger.length === 0 ? (
          <p className="mt-6 text-sm text-rose-champagne/50">
            No couples have used your code yet. Share{" "}
            <span className="font-mono text-gold">{agent.code}</span> and start earning.
          </p>
        ) : (
          <div className="mt-6 space-y-6">
            {ledger.map((row) => (
              <div key={row.accountId} className="border border-white/10 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm text-alabaster">{row.email}</p>
                  <p className="text-xs text-rose-champagne/40">
                    Joined{" "}
                    {row.joinedAt.toLocaleDateString("en-NG", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                {row.couples.length === 0 ? (
                  <p className="mt-2 text-xs text-rose-champagne/40">
                    Signed up. No wedding page yet.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {row.couples.map((c, i) => (
                      <li
                        key={i}
                        className="flex flex-wrap items-baseline justify-between gap-2 border-t border-white/5 pt-2 text-sm"
                      >
                        <span className="text-alabaster">
                          {c.groomName} &amp; {c.brideName}
                        </span>
                        <span className="text-xs text-rose-champagne/50">
                          {tierLabel(c.tier)} · {formatPoints(c.points)} ·{" "}
                          {c.paidMinor > 0 ? (
                            <span className="text-gold">{formatNaira(c.paidMinor)}</span>
                          ) : (
                            <span>no payment yet</span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-white/10 p-4">
      <p className="text-[0.6rem] uppercase tracking-[0.24em] text-rose-champagne/50">{label}</p>
      <p className="mt-1 font-serif text-2xl text-gold">{value}</p>
    </div>
  );
}

