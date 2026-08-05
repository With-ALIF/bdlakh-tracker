import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Plus,
  Receipt,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";
import { AppLayout } from "@/layouts/AppLayout";
import { StatCard, Panel, EmptyState, PageHeader } from "@/components/ui-kit";
import { TransactionDialog } from "@/components/TransactionDialog";
import { useFinance } from "@/context/FinanceContext";
import { useBalances } from "@/hooks/useBalances";
import { now } from "@/lib/date";
import { AccountIcon } from "@/components/AccountIcon";
import { sumBy } from "@/utils/finance";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { transactions, ready } = useFinance();
  const b = useBalances();
  const [open, setOpen] = useState(false);

  const stats = useMemo(() => {
    const daily = transactions.filter((t) => dayjs(t.date).isSame(now(), "day"));
    return {
      todayIncome: sumBy(daily, "income"),
      todayExpense: sumBy(daily, "expense"),
    };
  }, [transactions]);

  const recent = useMemo(() => {
    return [...transactions]
      .sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || "").localeCompare(a.createdAt || ""))
      .slice(0, 5);
  }, [transactions]);

  return (
    <AppLayout>
      <PageHeader
        title="Dashboard"
        subtitle={now().format("dddd, DD MMMM YYYY")}
        action={
          <Button onClick={() => setOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Quick add
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard label="Daily Income" value={b.money(stats.todayIncome)} icon={TrendingUp} tone="success" />
        <StatCard label="Daily Expense" value={b.money(stats.todayExpense)} icon={TrendingDown} tone="danger" />
        <StatCard label="Final Balance" value={b.money(b.total)} icon={PiggyBank} tone="primary" />
      </div>

      <Panel
        title="RECENT TRANSACTIONS"
        className="mt-4"
        action={
          <Link to="/transactions" className="text-xs font-semibold text-primary hover:underline">
            View all
          </Link>
        }
      >
        {!ready ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : recent.length ? (
          <ul className="divide-y divide-border">
            {recent.map((t) => (
              <li key={t.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                      t.type === "income" ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
                    }`}
                  >
                    {t.type === "income" ? (
                      <ArrowDownLeft className="h-4 w-4" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold capitalize">{t.title}</p>
                    <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                      <span className="capitalize">{t.category}</span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1">
                        <AccountIcon accountId={t.accountId} sizeClassName="h-3.5 w-3.5" />
                        {b.accountName(t.accountId)}
                      </span>
                      <span>·</span>
                      <span>{dayjs(t.date).format("DD MMM")}</span>
                    </p>
                  </div>
                </div>
                <span
                  className={`text-sm font-bold ${t.type === "income" ? "text-success" : "text-danger"}`}
                >
                  {t.type === "income" ? "+" : "-"}
                  {b.money(t.amount)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={Receipt}
            title="Nothing recorded yet"
            description="Start by adding your first income or expense."
            action={
           <Button onClick={() => setOpen(true)} className="gap-2">
             <Plus className="h-4 w-4" /> Quick add
           </Button>
         }
          />
        )}
      </Panel>

      <TransactionDialog open={open} onOpenChange={setOpen} />
    </AppLayout>
  );
}
