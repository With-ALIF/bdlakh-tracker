import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, PiggyBank, Target, CheckCircle2, Wallet } from "lucide-react";
import { AppLayout } from "@/layouts/AppLayout";
import { PageHeader, Panel, StatCard, EmptyState } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { GoalCard } from "@/components/savings/GoalCard";
import { GoalDialog } from "@/components/savings/GoalDialog";
import { useSavings } from "@/context/SavingsContext";
import { useBalances } from "@/hooks/useBalances";
import { goalStats } from "@/utils/savings";

export const Route = createFileRoute("/savings/")({
  head: () => ({
    meta: [
      { title: "Savings Goals — Money Mate" },
      {
        name: "description",
        content:
          "Create savings goals, track progress with live percentages and see how much to save each month.",
      },
      { property: "og:title", content: "Savings Goals — Money Mate" },
      {
        property: "og:description",
        content: "Plan, fund and complete your savings goals from any wallet.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SavingsPage,
});

type Tab = "active" | "completed" | "all";

function SavingsPage() {
  const { goals, contributions, withdrawals, ready } = useSavings();
  const b = useBalances();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("active");

  const summary = useMemo(() => {
    const totalContributions = contributions.reduce((s, c) => s + c.amount, 0);
    const totalWithdrawals = withdrawals.reduce((s, w) => s + w.amount, 0);
    const totalSaved = totalContributions - totalWithdrawals;
    const active = goals.filter((g) => {
      const s = goalStats(g, contributions, withdrawals);
      return g.status !== "cancelled" && !s.isCompleted;
    });
    const completed = goals.filter(
      (g) => g.status === "completed" || goalStats(g, contributions, withdrawals).isCompleted,
    );
    const totalTarget = goals
      .filter((g) => g.status !== "cancelled")
      .reduce((s, g) => s + g.targetAmount, 0);
    return { totalSaved, active, completed, totalTarget };
  }, [goals, contributions, withdrawals]);

  const visible = useMemo(() => {
    if (tab === "active") return summary.active;
    if (tab === "completed") return summary.completed;
    return goals;
  }, [tab, goals, summary]);

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "active", label: "Active", count: summary.active.length },
    { key: "completed", label: "Completed", count: summary.completed.length },
    { key: "all", label: "All", count: goals.length },
  ];

  return (
    <AppLayout>
      <PageHeader
        title="Savings Goals"
        subtitle="Set targets, save from any wallet and watch progress grow."
        action={
          <Button onClick={() => setOpen(true)} className="w-full gap-2 sm:w-auto">
            <Plus className="h-4 w-4" /> New goal
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
        <StatCard
          label="Total Saved"
          value={b.money(summary.totalSaved)}
          icon={PiggyBank}
          tone="success"
          hint={`of ${b.money(summary.totalTarget)} targeted`}
        />
        <StatCard label="Active Goals" value={String(summary.active.length)} icon={Target} tone="primary" />
        <StatCard
          label="Completed"
          value={String(summary.completed.length)}
          icon={CheckCircle2}
          tone="success"
        />
        <StatCard label="Available Balance" value={b.money(b.total)} icon={Wallet} tone="default" />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              tab === t.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      <div className="mt-4">
        {!ready ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-40 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : visible.length ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            {visible.map((g) => (
              <GoalCard key={g.id} goal={g} contributions={contributions} withdrawals={withdrawals} />
            ))}
          </div>
        ) : (
          <Panel>
            <EmptyState
              icon={Target}
              title={tab === "completed" ? "No completed goals yet" : "No savings goals yet"}
              description="Create a goal like “New Laptop”, set a target and deadline, then save from your wallets."
              action={
                <Button onClick={() => setOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" /> New goal
                </Button>
              }
            />
          </Panel>
        )}
      </div>

      <GoalDialog open={open} onOpenChange={setOpen} />
    </AppLayout>
  );
}
