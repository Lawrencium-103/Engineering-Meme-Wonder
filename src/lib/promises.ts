import type { PromiseItem } from "@/db/schema";
import { formatNaira } from "./pricing";

/**
 * Gift promises: what a guest pledges to bring to the couple. Cash via
 * transfer, typical Nigerian wedding gifts, or anything they write in.
 */

export const CASH_LABEL = "Cash / Transfer";

/** Nigerian wedding classics — the preset chips in the picker. */
export const GIFT_PRESETS: string[] = [
  "Aso-oke / George wrapper",
  "Ankara fabric",
  "Handbag",
  "Shoes",
  "Perfume",
  "Watch",
  "Wallet & belt",
  "Jewelry",
  "Cookware set",
  "Home appliance",
  "Wines & drinks",
  "Food basket",
];

export { formatNaira };

/** Human line for one promise item, e.g. "₦20,000 — Cash / Transfer" or "Shoes — size 42". */
export function promiseLine(item: PromiseItem): string {
  if (item.kind === "CASH" && item.amountMinor) {
    return `${formatNaira(item.amountMinor)} — ${item.label}`;
  }
  return item.note ? `${item.label} — ${item.note}` : item.label;
}

export function totalCashMinor(items: PromiseItem[]): number {
  return items.reduce((sum, it) => (it.kind === "CASH" ? sum + (it.amountMinor ?? 0) : sum), 0);
}

/** Short summary for the green button, e.g. "₦20,000 · Handbag". */
export function promiseSummary(items: PromiseItem[]): string {
  const parts: string[] = [];
  const cash = totalCashMinor(items);
  if (cash > 0) parts.push(formatNaira(cash));
  const goods = items.filter((it) => it.kind === "ITEM").length;
  if (goods > 0) parts.push(`${goods} ${goods === 1 ? "gift" : "gifts"}`);
  return parts.join(" · ");
}
