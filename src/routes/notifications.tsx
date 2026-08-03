import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Bell,
  CheckCheck,
  ArrowRight,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Info,
  Wallet,
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  Banknote,
} from "lucide-react";
import { AppLayout } from "@/layouts/AppLayout";
import { PageHeader, EmptyState } from "@/components/ui-kit";
import { useNotifications } from "@/context/NotificationContext";
import type { AppNotification, NotificationType } from "@/types/notifications";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Money Mate" },
      { name: "description", content: "View your reminders, alerts and activity notifications." },
      { property: "og:title", content: "Notifications — Money Mate" },
    ],
  }),
  component: NotificationsPage,
});

const TYPE_ICON: Record<NotificationType, typeof Bell> = {
  loan_due_today: Clock,
  loan_due_tomorrow: Clock,
  loan_due_soon: Clock,
  loan_overdue: AlertTriangle,
  loan_completed: CheckCircle2,
  low_wallet_balance: Wallet,
  low_income: TrendingUp,
  transfer_completed: ArrowLeftRight,
  income_added: TrendingUp,
  expense_added: TrendingDown,
};

const TONE_STYLE: Record<string, string> = {
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  success: "bg-success-soft text-success",
  info: "bg-primary-soft text-primary",
  primary: "bg-primary-soft text-primary",
};

function NotificationCard({
  notification,
  onRead,
}: {
  notification: AppNotification;
  onRead: (id: string) => void;
}) {
  const Icon = TYPE_ICON[notification.type] ?? Bell;

  return (
    <Link
      to={notification.href}
      onClick={() => onRead(notification.id)}
      className={cn(
        "group flex items-start gap-3 rounded-xl border border-border p-4 transition-all hover:border-primary/30 hover:bg-primary-soft/30",
        !notification.read && "border-l-4 border-l-primary",
      )}
    >
      <span
        className={cn(
          "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
          TONE_STYLE[notification.tone],
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "text-sm font-semibold",
              !notification.read ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {notification.title}
          </p>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">{notification.description}</p>
        <p className="mt-1.5 text-xs text-muted-foreground/70">{notification.relativeTime}</p>
      </div>
    </Link>
  );
}

function NotificationsPage() {
  const { groups, unreadCount, markAsRead, markAllRead, ready } = useNotifications();

  const totalNotifications = useMemo(
    () => groups.reduce((s, g) => s + g.items.length, 0),
    [groups],
  );

  return (
    <AppLayout>
      <PageHeader
        title="Notifications"
        subtitle={
          unreadCount > 0
            ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
            : "All caught up"
        }
        action={
          unreadCount > 0 ? (
            <Button variant="ghost" size="sm" onClick={markAllRead} className="gap-2 text-xs">
              <CheckCheck className="h-4 w-4" /> Mark all read
            </Button>
          ) : null
        }
      />

      {!ready ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : totalNotifications === 0 ? (
        <EmptyState icon={Bell} title="No new notifications" description="Everything looks good." />
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.label}>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </h3>
              <div className="space-y-2">
                {group.items.map((n) => (
                  <NotificationCard key={n.id} notification={n} onRead={markAsRead} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
