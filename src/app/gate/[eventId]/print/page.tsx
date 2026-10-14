import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { events, guests } from "@/db/schema";
import { getSessionAccount } from "@/lib/auth";
import { PrintButton } from "./PrintButton";

export const dynamic = "force-dynamic";

/**
 * Printable A4 gate list. Owner-only. Sorted by side then code, with a
 * checkbox column and party size — the paper backup for when the phone
 * dies or the network drops. Print via the browser's print dialog.
 */
export default async function GatePrintPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const session = await getSessionAccount();
  if (!session) notFound();
  if (!/^[0-9a-f-]{36}$/i.test(eventId)) notFound();

  const [event] = await db
    .select({
      id: events.id,
      groomName: events.groomName,
      brideName: events.brideName,
      weddingDate: events.weddingDate,
    })
    .from(events)
    .where(and(eq(events.id, eventId), eq(events.ownerId, session.id)))
    .limit(1);
  if (!event) notFound();

  const rows = await db
    .select({
      guestCode: guests.guestCode,
      firstName: guests.firstName,
      lastName: guests.lastName,
      side: guests.side,
      partySize: guests.partySize,
      dietary: guests.dietary,
      checkedInAt: guests.checkedInAt,
    })
    .from(guests)
    .where(eq(guests.eventId, eventId))
    .orderBy(asc(guests.side), asc(guests.seq));

  const dateStr = new Intl.DateTimeFormat("en-NG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(event.weddingDate));

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <title>
          Gate list — {event.groomName} & {event.brideName}
        </title>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: Georgia, "Times New Roman", serif;
            color: #111;
            background: #fff;
            padding: 18mm 14mm;
            font-size: 11px;
            line-height: 1.35;
          }
          @media print {
            body { padding: 0; }
            .no-print { display: none !important; }
            tr { break-inside: avoid; }
          }
          h1 { font-size: 20px; font-weight: normal; }
          .sub { color: #555; font-size: 11px; margin-top: 2px; }
          .meta {
            display: flex; justify-content: space-between;
            border-bottom: 2px solid #111; padding-bottom: 8px; margin-bottom: 14px;
          }
          .count { text-align: right; font-size: 11px; color: #333; }
          table { width: 100%; border-collapse: collapse; }
          th {
            text-align: left; font-size: 9px; text-transform: uppercase;
            letter-spacing: 0.12em; color: #555;
            border-bottom: 1px solid #999; padding: 6px 6px;
          }
          td { padding: 7px 6px; border-bottom: 1px solid #ddd; vertical-align: top; }
          .code { font-family: "Courier New", monospace; font-size: 11px; white-space: nowrap; }
          .side { font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em; color: #555; }
          .party { white-space: nowrap; }
          .diet { font-size: 9px; color: #7a5c00; }
          .box {
            display: inline-block; width: 14px; height: 14px;
            border: 1.5px solid #111; vertical-align: middle;
          }
          .checked { text-decoration: line-through; color: #999; }
          .foot { margin-top: 16px; font-size: 9px; color: #888; text-align: center; }
          .print-btn {
            display: block; margin: 0 auto 16px; padding: 10px 28px;
            font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase;
            background: #111; color: #fff; border: none; cursor: pointer;
          }
        `}</style>
      </head>
      <body>
        <PrintButton />
        <div className="meta">
          <div>
            <h1>
              {event.groomName} &amp; {event.brideName}
            </h1>
            <p className="sub">{dateStr} · Gate list · {rows.length} RSVPs</p>
          </div>
          <div className="count">
            People expected:{" "}
            <strong>{rows.reduce((s, r) => s + r.partySize, 0)}</strong>
            <br />
            Checked in (when printed):{" "}
            <strong>{rows.filter((r) => r.checkedInAt).length}</strong>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th style={{ width: 24 }}></th>
              <th style={{ width: 90 }}>Code</th>
              <th>Name</th>
              <th style={{ width: 56 }}>Side</th>
              <th style={{ width: 44 }}>Party</th>
              <th style={{ width: 110 }}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.guestCode} className={r.checkedInAt ? "checked" : ""}>
                <td>
                  <span className="box"></span>
                </td>
                <td className="code">{r.guestCode}</td>
                <td>
                  {r.firstName} {r.lastName}
                </td>
                <td className="side">{r.side === "GROOM" ? "Groom" : "Bride"}</td>
                <td className="party">{r.partySize}</td>
                <td className="diet">{r.dietary ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="foot">
          Aravow gate list · tick each guest as they arrive · party size = seats to allocate
        </p>
      </body>
    </html>
  );
}
