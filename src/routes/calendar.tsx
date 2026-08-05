import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import dayjs from "dayjs";
import { ChevronLeft, ChevronRight, Receipt } from "lucide-react";
import { AppLayout } from "@/layouts/AppLayout";
import { PageHeader, Panel, EmptyState } from "@/components/ui-kit";
import { useFinance } from "@/context/FinanceContext";
import { useBalances } from "@/hooks/useBalances";
import { now } from "@/lib/date";
import { sumBy } from "@/utils/finance";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar — Money Mate" },
      { name: "description", content: "Browse your income and expenses day by day in a monthly calendar view." },
      { property: "og:title", content: "Calendar — Money Mate" },
      { property: "og:description", content: "Tap any day to review that day's transactions." },
    ],
  }),
  component: CalendarPage,
});

function CalendarPage() {
  const { transactions } = useFinance();
  const b = useBalances();
  const [cursor, setCursor] = useState(now().startOf("month"));
  const [selected, setSelected] = useState(now().format("YYYY-MM-DD"));

  const days = useMemo(() => {
    const start = cursor.startOf("month");
    const offset = start.day();
    const total = cursor.daysInMonth();
    const cells: (string | null)[] = Array.from({ length: offset }, () => null);
    for (let i = 1; i <= total; i++) cells.push(start.date(i).format("YYYY-MM-DD"));
    return cells;
  }, [cursor]);

  const byDay = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();
    for (const t of transactions) {
      const cur = map.get(t.date) ?? { income: 0, expense: 0 };
      if (t.type === "income") cur.income += t.amount;
      else cur.expense += t.amount;
      map.set(t.date, cur);
    }
    return map;
  }, [transactions]);

  const dayTx = transactions.filter((t) => t.date === selected);

  return (
    <AppLayout>
      <PageHeader title="Calendar" subtitle="Daily money activity" />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
        <Panel
          title={cursor.format("MMMM YYYY")}
          action={
            <div className="flex gap-1">
              <button
                aria-label="Previous month"
                onClick={() => setCursor(cursor.subtract(1, "month"))}
                className="rounded-lg border border-border p-2 text-muted-foreground transition hover:bg-muted"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                aria-label="Next month"
                onClick={() => setCursor(cursor.add(1, "month"))}
                className="rounded-lg border border-border p-2 text-muted-foreground transition hover:bg-muted"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          }
        >
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase text-muted-foreground">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <span key={d} className="py-1">
                {d}
              </span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {days.map((d, i) =>
              d === null ? (
                <span key={`e${i}`} />
              ) : (
                <button
                  key={d}
                  onClick={() => setSelected(d)}
                  className={cn(
                    "flex aspect-square flex-col items-center justify-center rounded-xl border border-transparent p-1 text-xs transition hover:bg-muted",
                    selected === d && "border-primary bg-primary-soft",
                  )}
                >
                  <span className={cn("font-semibold", now().format("YYYY-MM-DD") === d && "text-primary")}>
                    {dayjs(d).date()}
                  </span>
                  <span className="mt-1 flex gap-0.5">
                    {byDay.get(d)?.income ? <i className="h-1.5 w-1.5 rounded-full bg-success" /> : null}
                    {byDay.get(d)?.expense ? <i className="h-1.5 w-1.5 rounded-full bg-danger" /> : null}
                  </span>
                </button>
              ),
            )}
          </div>
        </Panel>

        <Panel title={dayjs(selected).format("DD MMMM YYYY")}>
          <div className="mb-4 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-success-soft p-3">
              <p className="text-[11px] font-semibold uppercase text-success">Income</p>
              <p className="mt-1 text-base font-bold text-success">{b.money(sumBy(dayTx, "income"))}</p>
            </div>
            <div className="rounded-xl bg-danger-soft p-3">
              <p className="text-[11px] font-semibold uppercase text-danger">Expense</p>
              <p className="mt-1 text-base font-bold text-danger">{b.money(sumBy(dayTx, "expense"))}</p>
            </div>
          </div>
          {dayTx.length ? (
            <ul className="divide-y divide-border">
              {dayTx.map((t) => (
                <li key={t.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{t.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {t.category} · {b.accountName(t.accountId)}
                    </p>
                  </div>
                  <span className={cn("text-sm font-bold", t.type === "income" ? "text-success" : "text-danger")}>
                    {t.type === "income" ? "+" : "-"}
                    {b.money(t.amount)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={Receipt} title="No transactions" description="Nothing recorded on this day." />
          )}
        </Panel>
      </div>
    </AppLayout>
  );
}
