import {
  POINTS_TARGET,
  PLAN_POINTS,
  BONUS_MINOR,
  COMMISSION_RATE,
  formatNaira,
} from "@/lib/agent-comp";
import { TIER_ORDER, TIERS, tierLabel, type TierId } from "@/lib/pricing";

/**
 * "How much you make" section for the registration view — the points table,
 * the 10-point rule, and worked examples so the deal is transparent.
 */
export function AgentEarnings() {
  return (
    <section>
      <p className="text-gold tracking-[0.35em] text-xs uppercase">How much you make</p>
      <h2 className="mt-2 font-serif text-3xl font-light text-alabaster">
        10 points unlocks the ₦40,000 bonus
      </h2>
      <p className="mt-4 text-sm leading-7 text-rose-champagne/60">
        Every plan you sell earns <span className="text-alabaster">points</span> plus{" "}
        <span className="text-alabaster">{Math.round(COMMISSION_RATE * 100)}% commission</span> on
        everything sold. Reach <span className="text-alabaster">{POINTS_TARGET} points</span> and
        you collect an extra <span className="text-gold">{formatNaira(BONUS_MINOR)} bonus</span>.
        Below {POINTS_TARGET} points you still keep your {Math.round(COMMISSION_RATE * 100)}%.
        Nobody works for free here.
      </p>

      <div className="mt-6 overflow-x-auto border border-white/10">
        <table className="w-full min-w-80 text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left">
              <th className="px-4 py-3 text-[0.6rem] uppercase tracking-[0.24em] text-rose-champagne/50">Plan</th>
              <th className="px-4 py-3 text-[0.6rem] uppercase tracking-[0.24em] text-rose-champagne/50">Price</th>
              <th className="px-4 py-3 text-right text-[0.6rem] uppercase tracking-[0.24em] text-rose-champagne/50">Points</th>
            </tr>
          </thead>
          <tbody>
            {TIER_ORDER.map((id: TierId) => (
              <tr key={id} className="border-b border-white/5 last:border-0">
                <td className="px-4 py-3 text-alabaster">{tierLabel(id)}</td>
                <td className="px-4 py-3 text-rose-champagne/60">
                  {TIERS[id].basePriceMinor === 0 ? "Free" : formatNaira(TIERS[id].basePriceMinor)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-gold">
                  {PLAN_POINTS[id]} pt{PLAN_POINTS[id] === 1 ? "" : "s"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 space-y-3">
        <Example
          title="8 free + 2 Classic = 8 points"
          body={`4 + 4 pts. Below target: no bonus, but you keep 15% of ₦49,980 = ${formatNaira(7_497_00)}.`}
        />
        <Example
          title="1 Epic + 1 Grand = 10 points"
          body={`6 + 4 pts. Target hit: 15% of ₦149,980 = ${formatNaira(22_497_00)} + ${formatNaira(BONUS_MINOR)} bonus = ${formatNaira(62_497_00)} total.`}
        />
        <Example
          title="2 Grand = 8 points"
          body={`4 × 2 pts. Below target: no bonus, but you keep 15% of ₦99,980 = ${formatNaira(14_997_00)}.`}
        />
        <Example
          title="2 Epic = 12 points"
          body={`6 × 2 pts. Target smashed: 15% of ₦199,980 = ${formatNaira(29_997_00)} + ${formatNaira(BONUS_MINOR)} bonus = ${formatNaira(69_997_00)} total.`}
        />
      </div>
      <p className="mt-4 text-xs leading-6 text-rose-champagne/40">
        Why it works like this: 8 free sign-ups plus 2 small paid plans (8 pts) pay less than
        an agent who moves 3 or more big plans (10+ pts). Push the upgrades. Free pages turn
        paid once the guest list grows.
      </p>
    </section>
  );
}

function Example({ title, body }: { title: string; body: string }) {
  return (
    <div className="border border-white/10 p-4">
      <p className="text-sm text-gold">{title}</p>
      <p className="mt-1 text-sm leading-6 text-rose-champagne/60">{body}</p>
    </div>
  );
}
