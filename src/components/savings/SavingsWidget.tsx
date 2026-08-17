import { Link } from "@tanstack/react-router";
import { PiggyBank, Target } from "lucide-react";
import { Panel } from "@/components/ui-kit";
import { useSavings } from "@/context/SavingsContext";
import { formatMoney } from "@/utils/finance";
import { goalStats } from "@/utils/savings";
import { cn } from "@/lib/utils";

/** Compact savings summary for the dashboard. */
export function SavingsWidget() {
  const { goals, contributions, ready } = useSavings();

  const active = goals
    .filter((g) => g.status !== "cancelled" && !goalStats(g, contributions).isCompleted)
    .slice(0, 3);
  const totalSaved = contributions.reduce((s, c) => s + c.amount, 0);

  if (!ready) return null;

  return (
    <Panel
      title="SAVINGS GOALS"
      className="mt-4"
      action={
        <Link to="/savings" className="text-xs font-semibold text-primary hover:underline">
          View all
        </Link>
      }
    >
      <div className="mb-4 flex items-center gap-3 rounded-xl bg-primary-soft p-3 text-primary">
        <PiggyBank className="h-5 w-5 shrink-0" />
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide">Total saved</p>
          <p className="text-lg font-bold tracking-tight">{formatMoney(totalSaved)}</p>
        </div>
      </div>

      {active.length ? (
        <ul className="space-y-3">
          {active.map((g) => {
            const s = goalStats(g, contributions);
            return (
              <li key={g.id}>
                <Link
                  to="/savings/$name"
                  params={{ name: g.name }}
                  className="block rounded-xl p-2 transition hover:bg-muted"
                >
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate font-semibold">{g.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatMoney(s.saved)} / {formatMoney(g.targetAmount)}
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full transition-[width] duration-700 ease-out",
                        s.onTrack ? "bg-primary" : "bg-warning",
                      )}
                      style={{ width: `${Math.max(s.progress, s.saved > 0 ? 3 : 0)}%` }}
                    />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <Link
          to="/savings"
          className="flex items-center gap-3 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground transition hover:border-primary hover:text-primary"
        >
          <Target className="h-4 w-4" /> Create your first savings goal
        </Link>
      )}
    </Panel>
  );
}
