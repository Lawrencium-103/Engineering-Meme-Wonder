import { formatPoints, formatNaira, BONUS_MINOR, type Payout } from "@/lib/agent-comp";

/**
 * Live earnings panel for the signed-in agent dashboard: current points,
 * progress bar to the 10-point target, commission, bonus and total take-home.
 */
export function AgentEarningsPanel({ payout }: { payout: Payout }) {
  const pct = Math.min(100, (payout.points / payout.target) * 100);
  return (
    <section className="mt-12">
      <h2 className="font-serif text-2xl font-light text-rose-champagne">Your earnings</h2>
      <div className="mt-4 border border-gold/40 bg-gold/5 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-serif text-3xl text-gold">{formatPoints(payout.points)}</p>
          <p className="text-xs uppercase tracking-[0.2em] text-rose-champagne/60">
            {payout.qualifies ? "Bonus unlocked" : `${formatPoints(payout.pointsToGo)} to the ₦40,000 bonus`}
          </p>
        </div>
        <div className="mt-3 h-2 w-full bg-white/10" role="progressbar" aria-valuenow={payout.points} aria-valuemin={0} aria-valuemax={payout.target}>
          <div className="h-full bg-gold transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Money label="Total sold" value={formatNaira(payout.salesMinor)} />
          <Money label="15% commission" value={formatNaira(payout.commissionMinor)} />
          <Money label="Bonus" value={payout.bonusMinor > 0 ? formatNaira(payout.bonusMinor) : "—"} />
          <Money label="Take-home" value={formatNaira(payout.totalMinor)} highlight />
        </div>
        {!payout.qualifies && (
          <p className="mt-4 text-xs leading-6 text-rose-champagne/50">
            Reach {formatPoints(payout.target)} and the {formatNaira(BONUS_MINOR)} bonus lands
            on top of your commission. Free sign-ups count 0.5 pts, Classic 2, Grand 4, Epic 6.
          </p>
        )}
      </div>
    </section>
  );
}

function Money({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-[0.6rem] uppercase tracking-[0.24em] text-rose-champagne/50">{label}</p>
      <p className={`mt-1 font-serif text-xl ${highlight ? "text-gold" : "text-alabaster"}`}>{value}</p>
    </div>
  );
}
