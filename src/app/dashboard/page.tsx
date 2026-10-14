import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { events } from "@/db/schema";
import { getSessionAccount } from "@/lib/auth";
import { DashboardClient } from "./DashboardClient";
import { GuestTable } from "./GuestTable";

export default async function DashboardPage() {
  const account = await getSessionAccount();
  if (!account) redirect("/auth/check-email");

  const rows = await db
    .select({
      id: events.id,
      status: events.status,
      tier: events.tier,
      guestCap: events.guestCap,
      slug: events.slug,
      groomName: events.groomName,
      brideName: events.brideName,
      monogram: events.monogram,
      weddingDate: events.weddingDate,
    })
    .from(events)
    .where(eq(events.ownerId, account.id))
    .orderBy(desc(events.createdAt));

  const memberSince = account.createdAt.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <main className="min-h-dvh px-6 py-12 max-w-5xl mx-auto">
      {/* Profile header */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-gold/40 bg-gold/10 font-serif text-xl text-gold">
            {account.email.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-gold tracking-[0.35em] text-xs uppercase">Aravow</p>
            <h1 className="font-serif text-3xl font-light mt-1">Your Dashboard</h1>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <div className="text-right">
            <p className="text-sm text-alabaster">{account.email}</p>
            <p className="text-xs text-rose-champagne/40">Member since {memberSince}</p>
          </div>
          <form action="/api/auth/signout" method="post">
            <button className="border border-white/20 px-4 py-2 text-xs text-rose-champagne/60 hover:border-gold/60 hover:text-gold transition-colors">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <DashboardClient events={rows.map((r) => ({ ...r, weddingDate: r.weddingDate }))} />
      {rows
        .filter((r) => r.status === "PUBLISHED")
        .map((r) => (
          <GuestTable key={r.id} eventId={r.id} eventName={`${r.groomName} & ${r.brideName}`} />
        ))}
    </main>
  );
}
