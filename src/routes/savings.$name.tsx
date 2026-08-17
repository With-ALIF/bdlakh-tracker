import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import dayjs from "dayjs";
import {
  ArrowLeft,
  ArrowUpDown,
  ArrowUpRight,
  Calendar,
  CalendarClock,
  CheckCircle2,
  FileDown,
  Flame,
  Loader2,
  Minus,
  Pencil,
  PiggyBank,
  Plus,
  Target,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/layouts/AppLayout";
import { Panel, StatCard, EmptyState } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { GoalDialog } from "@/components/savings/GoalDialog";
import { ContributionDialog } from "@/components/savings/ContributionDialog";
import { WithdrawDialog } from "@/components/savings/WithdrawDialog";
import { AccountIcon } from "@/components/AccountIcon";
import { useSavings } from "@/context/SavingsContext";
import { useBalances } from "@/hooks/useBalances";
import { goalStats } from "@/utils/savings";
import { generateSavingsReport } from "@/utils/savingsReport";
import { cn } from "@/lib/utils";
import type { SavingContribution, SavingWithdrawal } from "@/types";

export const Route = createFileRoute("/savings/$name")({
  head: () => ({
    meta: [
      { title: "Goal Details — Money Mate" },
      {
        name: "description",
        content: "Track a single savings goal: progress, saving history and how much is still needed.",
      },
      { property: "og:title", content: "Goal Details — Money Mate" },
      { property: "og:description", content: "Progress, history and plan for your savings goal." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GoalDetailPage,
});

function GoalDetailPage() {
  // Force periodic re‑render so that time‑sensitive stats (e.g., needed per month) update automatically
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000); // update every minute
    return () => clearInterval(id);
  }, []);

  const { name: goalName } = Route.useParams();
  const decodedName = decodeURIComponent(goalName);
  const navigate = useNavigate();
  const { goals, contributions, contributionsFor, withdrawals, withdrawalsFor, savedFor, totalWithdrawnFor, ready, deleteGoal, deleteContribution, deleteWithdrawal } =
    useSavings();
  const b = useBalances();

  const [editGoal, setEditGoal] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [editing, setEditing] = useState<SavingContribution | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SavingContribution | null>(null);
  const [pendingDeleteWithdrawal, setPendingDeleteWithdrawal] = useState<SavingWithdrawal | null>(null);
  const [editingWithdrawal, setEditingWithdrawal] = useState<SavingWithdrawal | null>(null);
  const [deleteGoalOpen, setDeleteGoalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [sortDesc, setSortDesc] = useState(true);

  const goal = goals.find((g) => g.name === decodedName) ?? null;
  const goalContributions = useMemo(() => (goal ? contributionsFor(goal.id) : []), [contributionsFor, goal]);
  const goalWithdrawals = useMemo(() => (goal ? withdrawalsFor(goal.id) : []), [withdrawalsFor, goal]);
  const availableForWithdraw = useMemo(() => (goal ? savedFor(goal.id) : 0), [savedFor, goal]);
  const s = goal ? goalStats(goal, contributions, withdrawals) : null;

  type HistoryItem =
    | { kind: "contribution"; data: SavingContribution; date: string; createdAt: string }
    | { kind: "withdrawal"; data: SavingWithdrawal; date: string; createdAt: string };

  const sortedHistory = useMemo(() => {
    const items: HistoryItem[] = [
      ...goalContributions.map((c) => ({ kind: "contribution" as const, data: c, date: c.date, createdAt: c.createdAt })),
      ...goalWithdrawals.map((w) => ({ kind: "withdrawal" as const, data: w, date: w.date, createdAt: w.createdAt })),
    ];
    return items.sort((a, b) => {
      const diff = dayjs(b.date).valueOf() - dayjs(a.date).valueOf();
      if (diff !== 0) return sortDesc ? diff : -diff;
      return sortDesc
        ? b.createdAt.localeCompare(a.createdAt)
        : a.createdAt.localeCompare(b.createdAt);
    });
  }, [goalContributions, goalWithdrawals, sortDesc]);

  const handleDownloadPdf = async () => {
    if (!goal || !s) return;
    try {
      setIsExporting(true);
      await generateSavingsReport({
        goal,
        stats: s,
        contributions: goalContributions,
        withdrawals: goalWithdrawals,
        accountName: b.accountName,
      });
      toast.success("Savings PDF report downloaded!");
    } catch (error) {
      console.error("Failed to generate PDF report:", error);
      toast.error("Failed to generate PDF report");
    } finally {
      setIsExporting(false);
    }
  };

  if (!ready) {
    return (
      <AppLayout>
        <div className="space-y-3">
          <div className="h-24 animate-pulse rounded-2xl bg-muted" />
          <div className="h-40 animate-pulse rounded-2xl bg-muted" />
        </div>
      </AppLayout>
    );
  }

  if (!goal || !s) {
    return (
      <AppLayout>
        <Panel>
          <EmptyState
            icon={Target}
            title="Goal not found"
            description="This savings goal may have been deleted."
            action={
              <Button asChild variant="outline">
                <Link to="/savings">Back to savings</Link>
              </Button>
            }
          />
        </Panel>
      </AppLayout>
    );
  }

  const done = s.isCompleted || goal.status === "completed";

  return (
    <AppLayout>
      <div className="mb-4 flex items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm" className="gap-1.5 px-2">
          <Link to="/savings">
            <ArrowLeft className="h-4 w-4" /> Savings
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditGoal(true)}>
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-danger"
            onClick={() => setDeleteGoalOpen(true)}
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
        </div>
      </div>

      {/* Hero */}
      <section className="card-surface animate-rise p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className={cn(
                "grid h-12 w-12 shrink-0 place-items-center rounded-2xl",
                done ? "bg-success-soft text-success" : "bg-primary-soft text-primary",
              )}
            >
              {done ? <CheckCircle2 className="h-6 w-6" /> : <Target className="h-6 w-6" />}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">{goal.name}</h1>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide",
                    s.status === "Completed"
                      ? "bg-success-soft text-success border-success/30"
                      : s.status === "Overdue"
                        ? "bg-danger-soft text-danger border-danger/30"
                        : s.status === "On Track"
                          ? "bg-primary-soft text-primary border-primary/30"
                          : s.status === "Slightly Behind"
                            ? "bg-warning-soft text-warning border-warning/30"
                            : "bg-danger-soft text-danger border-danger/30",
                  )}
                >
                  {s.status}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  Created {dayjs(goal.createdAt).format("DD MMM YYYY")}
                </span>
                {goal.deadline ? (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium",
                      s.status === "Overdue"
                        ? "bg-danger-soft text-danger"
                        : "bg-primary-soft text-primary",
                    )}
                  >
                    <CalendarClock className="h-3.5 w-3.5 shrink-0" />
                    Deadline {dayjs(goal.deadline).format("DD MMM YYYY")}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:shrink-0">
            <Button onClick={() => setAddOpen(true)} className="w-full gap-2 sm:w-auto">
              <Plus className="h-4 w-4" /> Add saving
            </Button>
            <Button
              variant="outline"
              onClick={() => setWithdrawOpen(true)}
              className="w-full gap-2 sm:w-auto"
              disabled={availableForWithdraw <= 0}
            >
              <ArrowUpRight className="h-4 w-4" /> Withdraw
            </Button>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-end justify-between">
            <p className="text-2xl font-bold tracking-tight">
              {b.money(s.actualSavedAmount)}
              <span className="ml-1 text-sm font-medium text-muted-foreground">
                / {b.money(goal.targetAmount)}
              </span>
            </p>
            <p className="text-sm font-bold">{s.progressPercentage.toFixed(1)}%</p>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-700 ease-out",
                s.status === "Completed"
                  ? "bg-success"
                  : s.status === "Overdue"
                    ? "bg-danger"
                    : s.status === "On Track"
                      ? "bg-primary"
                      : s.status === "Slightly Behind"
                        ? "bg-warning"
                        : "bg-danger",
              )}
              style={{
                width: `${Math.max(s.progressPercentage, s.actualSavedAmount > 0 ? 3 : 0)}%`,
              }}
            />
          </div>

          <div
            className={cn(
              "mt-4 flex items-start gap-3 rounded-xl border p-3.5",
              s.badgeTone === "success"
                ? "bg-success-soft/60 text-success border-success/30"
                : s.badgeTone === "danger"
                  ? "bg-danger-soft/60 text-danger border-danger/30"
                  : s.badgeTone === "warning"
                    ? "bg-warning-soft/60 text-warning border-warning/30"
                    : "bg-primary-soft/60 text-primary border-primary/30",
            )}
          >
            <div className="min-w-0">
              <p className="text-sm font-bold">{s.statusMessage.title}</p>
              <p className="mt-0.5 text-xs opacity-90">{s.statusMessage.description}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 sm:gap-4">
        <StatCard label="Remaining" value={b.money(s.remaining)} icon={Target} tone="warning" />
        <StatCard
          label="REMAINING DAYS"
          value={
            done
              ? "0 Days"
              : goal.deadline
                ? `${s.daysRemaining} ${s.daysRemaining === 1 ? "Day" : "Days"}`
                : "No deadline"
          }
          icon={CalendarClock}
          tone={s.overdue ? "danger" : "primary"}
        />
        <StatCard
          label="MONTHLY TARGET"
          value={done ? b.money(0) : b.money(s.requiredMonthly)}
          icon={TrendingUp}
          tone="primary"
        />
        <StatCard
          label="DAILY TARGET"
          value={done ? b.money(0) : b.money(s.requiredDaily)}
          icon={TrendingUp}
          tone="primary"
        />
        <StatCard
          label="Contributions"
          value={String(goalContributions.length)}
          icon={PiggyBank}
          tone="success"
        />
        <StatCard
          label="WITHDRAWALS"
          value={goalWithdrawals.length > 0 ? b.money(totalWithdrawnFor(goal.id)) : "৳0"}
          icon={ArrowUpRight}
          tone="warning"
        />
      </div>

      <Panel
        title="SAVING HISTORY"
        action={
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleDownloadPdf}
            disabled={isExporting}
          >
            {isExporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileDown className="h-3.5 w-3.5" />
            )}
            Download PDF
          </Button>
        }
        className="mt-4"
      >
        {sortedHistory.length ? (
          <div className="-mx-4 overflow-x-auto sm:mx-0 rounded-xl border-2 border-border/80 shadow-sm">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-b-2 border-border/80 bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-semibold">
                    <button
                      className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                      onClick={() => setSortDesc((s) => !s)}
                    >
                      Date <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Wallet</th>
                  <th className="px-4 py-3 font-semibold">Amount</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 bg-card">
                {sortedHistory.map((item) => {
                  const c = item.kind === "contribution" ? item.data : null;
                  const w = item.kind === "withdrawal" ? item.data : null;
                  const walletId = c?.walletId ?? w?.walletId;
                  const isWithdrawal = item.kind === "withdrawal";
                  return (
                    <tr key={item.data.id} className="transition hover:bg-muted/30">
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground font-medium">
                        {dayjs(item.date).format("DD MMM YYYY")}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs font-medium">
                        {isWithdrawal ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-warning-soft px-2 py-0.5 text-warning">
                            <Minus className="h-3 w-3" />
                            {w!.reason} Withdrawal
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-success">
                            <PiggyBank className="h-3 w-3" />
                            Saving
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-xs">
                        {walletId ? (
                          <span className="inline-flex items-center gap-1.5">
                            <AccountIcon accountId={walletId} sizeClassName="h-3.5 w-3.5" />
                            {b.accountName(walletId)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td
                        className={cn(
                          "whitespace-nowrap px-4 py-3 font-bold text-sm",
                          isWithdrawal ? "text-danger" : "text-success",
                        )}
                      >
                        {isWithdrawal ? "− " : "+ "}{b.money(item.data.amount)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          {isWithdrawal ? (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setEditingWithdrawal(w!)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-danger"
                                onClick={() => setPendingDeleteWithdrawal(w!)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setEditing(c)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-danger"
                                onClick={() => setPendingDelete(c)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={PiggyBank}
            title="No activity yet"
            description="Add your first saving to start tracking this goal."
            action={
              <Button onClick={() => setAddOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" /> Add saving
              </Button>
            }
          />
        )}
      </Panel>

      <GoalDialog open={editGoal} onOpenChange={setEditGoal} goal={goal} />
      <ContributionDialog open={addOpen} onOpenChange={setAddOpen} goalId={goal.id} />
      <ContributionDialog
        open={!!editing}
        onOpenChange={(v) => !v && setEditing(null)}
        goalId={goal.id}
        contribution={editing}
      />
      <WithdrawDialog
        open={withdrawOpen}
        onOpenChange={setWithdrawOpen}
        goalId={goal.id}
        availableAmount={availableForWithdraw}
      />
      <WithdrawDialog
        open={!!editingWithdrawal}
        onOpenChange={(v) => !v && setEditingWithdrawal(null)}
        goalId={goal.id}
        availableAmount={availableForWithdraw}
        withdrawal={editingWithdrawal}
      />

      <AlertDialog open={!!pendingDelete} onOpenChange={(v) => !v && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this saving?</AlertDialogTitle>
            <AlertDialogDescription>
              The amount will be returned to the wallet balance.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!pendingDelete) return;
                await deleteContribution(pendingDelete.id);
                setPendingDelete(null);
                toast.success("Saving deleted");
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!pendingDeleteWithdrawal} onOpenChange={(v) => !v && setPendingDeleteWithdrawal(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this withdrawal?</AlertDialogTitle>
            <AlertDialogDescription>
              The withdrawn amount will be deducted back from the destination wallet and returned to your savings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!pendingDeleteWithdrawal) return;
                await deleteWithdrawal(pendingDeleteWithdrawal.id);
                setPendingDeleteWithdrawal(null);
                toast.success("Withdrawal deleted");
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteGoalOpen} onOpenChange={setDeleteGoalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{goal.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              The goal and all of its saving entries will be removed. Wallet balances are restored.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await deleteGoal(goal.id);
                setDeleteGoalOpen(false);
                toast.success("Goal deleted");
                navigate({ to: "/savings" });
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
