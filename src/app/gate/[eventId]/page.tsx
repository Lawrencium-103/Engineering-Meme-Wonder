import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { events } from "@/db/schema";
import { getSessionAccount } from "@/lib/auth";
import { GateClient } from "./GateClient";

export const dynamic = "force-dynamic";

/**
 * Gate check-in page. Owner-only (planner PIN links land with the planner
 * tier). Phone-first: big search, QR scan, live counter. Works for couples
 * at their own wedding exactly as it does for planners.
 */
export default async function GatePage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const session = await getSessionAccount();
  if (!session) redirect("/auth/check-email");
  if (!/^[0-9a-f-]{36}$/i.test(eventId)) notFound();

  const [event] = await db
    .select({
      id: events.id,
      groomName: events.groomName,
      brideName: events.brideName,
      monogram: events.monogram,
      weddingDate: events.weddingDate,
      status: events.status,
    })
    .from(events)
    .where(and(eq(events.id, eventId), eq(events.ownerId, session.id)))
    .limit(1);
  if (!event) notFound();

  return (
    <GateClient
      eventId={event.id}
      groomName={event.groomName}
      brideName={event.brideName}
      monogram={event.monogram}
      weddingDate={event.weddingDate}
      published={event.status === "PUBLISHED"}
    />
  );
}
