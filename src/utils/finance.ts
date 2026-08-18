import dayjs from "dayjs";
import type { Account, SavingContribution, Transaction, Transfer } from "@/types";

/** Formatting + derived-data helpers. */

export function formatMoney(amount: number, currency = "৳", locale = "en-US") {
  const n = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));
  return `${amount < 0 ? "-" : ""}${currency}${n}`;
}

export const formatDate = (d: string, f = "DD MMM YYYY") => dayjs(d).format(f);

/** Live balance = opening + income - expense +/- transfers (including savings transfers). */
export function accountBalance(
  account: Account,
  transactions: Transaction[],
  transfers: Transfer[],
  _savings: SavingContribution[] = [],
) {
  let bal = account.openingBalance;
  for (const t of transactions) {
    if (t.accountId !== account.id) continue;
    bal += t.type === "income" ? t.amount : -t.amount;
  }
  for (const t of transfers) {
    if (t.fromAccountId === account.id) bal -= t.amount;
    if (t.toAccountId === account.id) bal += t.amount;
  }
  return bal;
}

export function sumBy(txs: Transaction[], type: "income" | "expense") {
  return txs.filter((t) => t.type === type).reduce((s, t) => s + t.amount, 0);
}

export type RangeKey =
  | "all"
  | "today"
  | "yesterday"
  | "week"
  | "month"
  | "year";

export function inRange(date: string, range: RangeKey) {
  const d = dayjs(date);
  const now = dayjs();
  switch (range) {
    case "today":
      return d.isSame(now, "day");
    case "yesterday":
      return d.isSame(now.subtract(1, "day"), "day");
    case "week":
      return d.isSame(now, "week") || (d.isAfter(now.startOf("week")) && d.isBefore(now.endOf("week")));
    case "month":
      return d.isSame(now, "month");
    case "year":
      return d.isSame(now, "year");
    default:
      return true;
  }
}

export function groupByCategory(txs: Transaction[]) {
  const map = new Map<string, number>();
  for (const t of txs) map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function toCSV(rows: Record<string, string | number>[]) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  return [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h] ?? "")).join(",")),
  ].join("\n");
}
