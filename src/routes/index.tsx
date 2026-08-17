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
  ArrowUpDown,
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
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Money Mate" },
      {
        name: "description",
        content:
          "Daily income, expense, and wallet balances at a glance in Money Mate.",
      },
      { property: "og:title", content: "Dashboard — Money Mate" },
      {
        property: "og:description",
        content: "Track daily income, expenses, and wallets in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { transactions, ready } = useFinance();
  const b = useBalances();
  const [open, setOpen] = useState(false);
  const [sortDesc, setSortDesc] = useState(true);

  const stats = useMemo(() => {
    const daily = transactions.filter((t) => dayjs(t.date).isSame(now(), "day"));
    return {
      todayIncome: sumBy(daily, "income"),
      todayExpense: sumBy(daily, "expense"),
    };
  }, [transactions]);

  const recent = useMemo(() => {
    return [...transactions]
      .sort((a, b) => sortDesc
        ? (b.date.localeCompare(a.date) || (b.createdAt || "").localeCompare(a.createdAt || ""))
        : (a.date.localeCompare(b.date) || (a.createdAt || "").localeCompare(b.createdAt || ""))
      )
      .slice(0, 5);
  }, [transactions, sortDesc]);

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
          <div className="-mx-4 overflow-x-auto sm:mx-0">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-semibold">
                    <button className="inline-flex items-center gap-1" onClick={() => setSortDesc((s) => !s)}>
                      Date <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3 font-semibold">Title</th>
                  <th className="px-4 py-3 font-semibold">Account</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((t) => (
                  <tr key={t.id} className="border-b border-border/60 transition hover:bg-muted/40">
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {dayjs(t.date).format("DD MMM YYYY")}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold capitalize">{t.title}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      <span className="inline-flex items-center gap-2">
                        <AccountIcon accountId={t.accountId} sizeClassName="h-4 w-4" />
                        {b.accountName(t.accountId)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground capitalize">{t.category}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-xs font-semibold capitalize",
                          t.type === "income" ? "bg-success-soft text-success" : "bg-danger-soft text-danger",
                        )}
                      >
                        {t.type}
                      </span>
                    </td>
                    <td
                      className={cn(
                        "whitespace-nowrap px-4 py-3 text-right font-bold",
                        t.type === "income" ? "text-success" : "text-danger",
                      )}
                    >
                      {t.type === "income" ? "+" : "-"}
                      {b.money(t.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
