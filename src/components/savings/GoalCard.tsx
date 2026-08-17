import { Link } from "@tanstack/react-router";
import dayjs from "dayjs";
import { CalendarClock, CheckCircle2, ChevronRight, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/utils/finance";
import { goalStats, type GoalStatusType } from "@/utils/savings";
import type { SavingContribution, SavingWithdrawal, SavingsGoal } from "@/types";

const badgeStyles: Record<GoalStatusType, string> = {
  Completed: "bg-success-soft text-success border-success/30",
  Overdue: "bg-danger-soft text-danger border-danger/30",
  "On Track": "bg-primary-soft text-primary border-primary/30",
  "Slightly Behind": "bg-warning-soft text-warning border-warning/30",
  "At Risk": "bg-danger-soft text-danger border-danger/30",
};

const barTones: Record<GoalStatusType, string> = {
  Completed: "bg-success",
  Overdue: "bg-danger",
  "On Track": "bg-primary",
  "Slightly Behind": "bg-warning",
  "At Risk": "bg-danger",
};

export function GoalCard({
  goal,
  contributions,
  withdrawals = [],
}: {
  goal: SavingsGoal;
  contributions: SavingContribution[];
  withdrawals?: SavingWithdrawal[];
}) {
  const s = goalStats(goal, contributions, withdrawals);
  const done = s.status === "Completed";

  return (
    <Link
      to="/savings/$name"
      params={{ name: goal.name }}
      className="card-surface animate-rise group block p-4 transition hover:shadow-lg sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
              done ? "bg-success-soft text-success" : "bg-primary-soft text-primary",
            )}
          >
            {done ? <CheckCircle2 className="h-5 w-5" /> : <Target className="h-5 w-5" />}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold tracking-tight sm:text-base">{goal.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {formatMoney(s.actualSavedAmount)} of {formatMoney(goal.targetAmount)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide",
              badgeStyles[s.status],
            )}
          >
            {s.status}
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5" />
        </div>
      </div>

      <div className="mt-4">
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-700 ease-out",
              barTones[s.status],
            )}
            style={{ width: `${Math.max(s.progressPercentage, s.actualSavedAmount > 0 ? 3 : 0)}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="font-semibold">{s.progressPercentage.toFixed(1)}%</span>
          <span className="text-muted-foreground">
            {done ? "Goal reached 🎉" : `${formatMoney(s.remainingAmount)} remaining`}
          </span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        {goal.deadline ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium",
              s.status === "Overdue" ? "bg-danger-soft text-danger" : "bg-muted text-muted-foreground",
            )}
          >
            <CalendarClock className="h-3.5 w-3.5" />
            {done
              ? dayjs(goal.deadline).format("DD MMM YYYY")
              : s.status === "Overdue"
                ? "Deadline passed"
                : `${s.daysRemaining} days left`}
          </span>
        ) : null}
        {!done && s.daysRemaining > 0 ? (
          <span className="text-muted-foreground">
            Target {formatMoney(s.requiredMonthly)}/month
          </span>
        ) : null}
      </div>
    </Link>
  );
}
