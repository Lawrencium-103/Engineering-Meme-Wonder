/** Convert a local wall-clock time in a named IANA zone to a UTC instant. */
export function zonedTimeToUtc(local: string, timeZone: string): Date {
  // local: "YYYY-MM-DDTHH:mm" (from datetime-local input)
  const m = local.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) throw new Error(`Invalid local datetime: ${local}`);
  const [, y, mo, d, h, mi] = m.map(Number) as unknown as number[];

  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const asUtc = Date.UTC(y, mo - 1, d, h, mi);

  function offset(ms: number): number {
    // Use formatToParts — never parse locale-formatted strings by order.
    const parts = dtf.formatToParts(new Date(ms));
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? "0");
    const Y = get("year");
    const M = get("month");
    const D = get("day");
    const H = get("hour") % 24;
    const Mi = get("minute");
    const S = get("second");
    return Date.UTC(Y, M - 1, D, H, Mi, S) - ms;
  }

  // Two-pass for DST boundaries; Africa/Lagos has no DST but be safe.
  const off1 = offset(asUtc);
  const ts = asUtc - off1;
  const off2 = offset(ts);
  return new Date(off2 !== off1 ? asUtc - off2 : ts);
}
