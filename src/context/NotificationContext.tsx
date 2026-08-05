import { createContext, useCallback, useContext, useMemo, useState, useEffect, type ReactNode } from "react";
import { useFinance } from "@/context/FinanceContext";
import { useAuth } from "@/context/AuthContext";
import { useBalances } from "@/hooks/useBalances";
import { accountBalance } from "@/utils/finance";
import { now } from "@/lib/date";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import isToday from "dayjs/plugin/isToday";
import isYesterday from "dayjs/plugin/isYesterday";
import type { AppNotification, NotificationGroup, NotificationType } from "@/types/notifications";

dayjs.extend(relativeTime);
dayjs.extend(isToday);
dayjs.extend(isYesterday);

const LOW_BALANCE_THRESHOLD = 100;
const LOW_INCOME_THRESHOLD = 100;

function nid(prefix: string, id: string): string {
  return `${prefix}-${id}`;
}

function relativeTimeLabel(ts: string): string {
  return dayjs(ts).fromNow();
}

function groupKey(ts: string): "Today" | "Yesterday" | "Earlier" {
  const d = dayjs(ts);
  if (d.isToday()) return "Today";
  if (d.isYesterday()) return "Yesterday";
  return "Earlier";
}

function buildLoanNotifications(loans: ReturnType<typeof useFinance>["loans"]): AppNotification[] {
  const cur = now();
  const notifications: AppNotification[] = [];

  for (const loan of loans) {
    if (loan.status === "completed") {
      notifications.push({
        id: nid("loan-completed", loan.id),
        type: "loan_completed",
        category: "loan",
        title: "Loan Completed",
        description: `${loan.contactName} • ৳${loan.totalAmount.toLocaleString()} • Fully paid`,
        timestamp: loan.updatedAt,
        relativeTime: relativeTimeLabel(loan.updatedAt),
        href: "/loan",
        tone: "success",
        read: false,
      });
      continue;
    }

    if (!loan.dueDate) continue;

    const due = dayjs(loan.dueDate);
    const diffDays = due.diff(cur.startOf("day"), "day");
    const remaining = loan.totalAmount - loan.payments.reduce((s, p) => s + p.amount, 0);
    const directionLabel = loan.direction === "receivable" ? "Receivable" : "Payable";

    if (diffDays < 0) {
      notifications.push({
        id: nid("loan-overdue", loan.id),
        type: "loan_overdue",
        category: "loan",
        title: "Loan Overdue",
        description: `${loan.contactName} • ৳${remaining.toLocaleString()} • Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) > 1 ? "s" : ""} • ${directionLabel}`,
        timestamp: loan.updatedAt,
        relativeTime: relativeTimeLabel(loan.updatedAt),
        href: "/loan",
        tone: "danger",
        read: false,
      });
    } else if (diffDays === 0) {
      notifications.push({
        id: nid("loan-due-today", loan.id),
        type: "loan_due_today",
        category: "loan",
        title: "Loan Due Today",
        description: `${loan.contactName} • ৳${remaining.toLocaleString()} • Due: ${due.format("DD MMM")} • ${directionLabel}`,
        timestamp: cur.toISOString(),
        relativeTime: "Today",
        href: "/loan",
        tone: "warning",
        read: false,
      });
    } else if (diffDays === 1) {
      notifications.push({
        id: nid("loan-due-tomorrow", loan.id),
        type: "loan_due_tomorrow",
        category: "loan",
        title: "Loan Due Tomorrow",
        description: `${loan.contactName} • ৳${remaining.toLocaleString()} • Due: ${due.format("DD MMM")} • ${directionLabel}`,
        timestamp: cur.toISOString(),
        relativeTime: "Tomorrow",
        href: "/loan",
        tone: "warning",
        read: false,
      });
    } else if (diffDays <= 3) {
      notifications.push({
        id: nid("loan-due-soon", loan.id),
        type: "loan_due_soon",
        category: "loan",
        title: "Loan Due Soon",
        description: `${loan.contactName} • ৳${remaining.toLocaleString()} • Due: ${due.format("DD MMM")} • ${directionLabel}`,
        timestamp: cur.subtract(diffDays, "day").toISOString(),
        relativeTime: relativeTimeLabel(cur.subtract(diffDays, "day").toISOString()),
        href: "/loan",
        tone: "info",
        read: false,
      });
    }
  }

  return notifications;
}

function buildWalletNotifications(
  accounts: ReturnType<typeof useFinance>["accounts"],
  transactions: ReturnType<typeof useFinance>["transactions"],
  transfers: ReturnType<typeof useFinance>["transfers"],
): AppNotification[] {
  const notifications: AppNotification[] = [];

  for (const acc of accounts) {
    const bal = accountBalance(acc, transactions, transfers);
    if (bal < LOW_BALANCE_THRESHOLD) {
      notifications.push({
        id: nid("low-balance", acc.id),
        type: "low_wallet_balance",
        category: "wallet",
        title: "Low Balance Warning",
        description: `${acc.name} balance is ৳${bal.toLocaleString()} — below ৳${LOW_BALANCE_THRESHOLD.toLocaleString()} threshold`,
        timestamp: new Date().toISOString(),
        relativeTime: "Today",
        href: "/wallets",
        tone: "warning",
        read: false,
      });
    }
  }

  return notifications;
}

function buildLowIncomeNotifications(
  transactions: ReturnType<typeof useFinance>["transactions"],
): AppNotification[] {
  const cur = now();
  const monthIncome = transactions
    .filter((t) => t.type === "income" && dayjs(t.date).isSame(cur, "month"))
    .reduce((s, t) => s + t.amount, 0);

  if (monthIncome > 0 && monthIncome < LOW_INCOME_THRESHOLD) {
    return [
      {
        id: "low-income-monthly",
        type: "low_income",
        category: "transaction",
        title: "Low Income Alert",
        description: `Monthly income is ৳${monthIncome.toLocaleString()} — below ৳${LOW_INCOME_THRESHOLD.toLocaleString()} threshold`,
        timestamp: cur.toISOString(),
        relativeTime: "Today",
        href: "/transactions",
        tone: "warning",
        read: false,
      },
    ];
  }

  return [];
}

function buildTransferNotifications(
  transfers: ReturnType<typeof useFinance>["transfers"],
  accounts: ReturnType<typeof useFinance>["accounts"],
): AppNotification[] {
  return transfers
    .filter((t) => {
      const created = dayjs(t.createdAt);
      return now().diff(created, "day") <= 7;
    })
    .map((t) => {
      const fromName = accounts.find((a) => a.id === t.fromAccountId)?.name ?? "Unknown";
      const toName = accounts.find((a) => a.id === t.toAccountId)?.name ?? "Unknown";
      return {
        id: nid("transfer", t.id),
        type: "transfer_completed" as NotificationType,
        category: "transfer" as const,
        title: "Transfer Completed",
        description: `${fromName} → ${toName} • ৳${t.amount.toLocaleString()}`,
        timestamp: t.createdAt,
        relativeTime: relativeTimeLabel(t.createdAt),
        href: "/transfer",
        tone: "success" as const,
        read: false,
      };
    });
}

function buildTransactionNotifications(
  transactions: ReturnType<typeof useFinance>["transactions"],
): AppNotification[] {
  return transactions
    .filter((t) => {
      const created = dayjs(t.createdAt);
      return now().diff(created, "day") <= 7;
    })
    .slice(0, 20)
    .map((t) => {
      const isIncome = t.type === "income";
      const tone: AppNotification["tone"] = isIncome ? "success" : "info";
      return {
        id: nid(isIncome ? "income" : "expense", t.id),
        type: (isIncome ? "income_added" : "expense_added") as NotificationType,
        category: "transaction" as const,
        title: isIncome ? "Income Added" : "Expense Added",
        description: `${t.category} • ৳${t.amount.toLocaleString()}`,
        timestamp: t.createdAt,
        relativeTime: relativeTimeLabel(t.createdAt),
        href: "/transactions",
        tone,
        read: false,
      };
    });
}

function groupNotifications(items: AppNotification[]): NotificationGroup[] {
  const grouped: Record<string, AppNotification[]> = {
    Today: [],
    Yesterday: [],
    Earlier: [],
  };

  for (const n of items) {
    grouped[groupKey(n.timestamp)].push(n);
  }

  const groups: NotificationGroup[] = [];
  for (const label of ["Today", "Yesterday", "Earlier"] as const) {
    if (grouped[label].length > 0) {
      groups.push({ label, items: grouped[label] });
    }
  }

  return groups;
}

/* ─── context ────────────────────────────────────────────── */

interface NotificationContextValue {
  notifications: AppNotification[];
  groups: NotificationGroup[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllRead: () => void;
  ready: boolean;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

/* ─── provider ───────────────────────────────────────────── */

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { loans, accounts, transactions, transfers, ready } = useFinance();
  const { user } = useAuth();
  const userId = user?.id ?? "guest";
  const storageKey = `notifications_read_${userId}`;

  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      setReadIds(stored ? new Set(JSON.parse(stored)) : new Set());
    } catch {
      setReadIds(new Set());
    }
  }, [storageKey]);

  const allNotifications = useMemo(() => {
    if (!ready) return [];

    const notifs = [
      ...buildLoanNotifications(loans),
      ...buildWalletNotifications(accounts, transactions, transfers),
      ...buildLowIncomeNotifications(transactions),
      ...buildTransferNotifications(transfers, accounts),
      ...buildTransactionNotifications(transactions),
    ];

    return notifs.sort((a, b) => dayjs(b.timestamp).valueOf() - dayjs(a.timestamp).valueOf());
  }, [loans, accounts, transactions, transfers, ready]);

  const notifications = useMemo(
    () => allNotifications.map((n) => ({ ...n, read: readIds.has(n.id) })),
    [allNotifications, readIds],
  );

  const groups = useMemo(() => groupNotifications(notifications), [notifications]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const markAsRead = useCallback((id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      try {
        localStorage.setItem(storageKey, JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, [storageKey]);

  const markAllRead = useCallback(() => {
    const allIds = new Set(allNotifications.map((n) => n.id));
    setReadIds(allIds);
    try {
      localStorage.setItem(storageKey, JSON.stringify([...allIds]));
    } catch {
      /* ignore */
    }
  }, [allNotifications, storageKey]);

  const value = useMemo<NotificationContextValue>(
    () => ({
      notifications,
      groups,
      unreadCount,
      markAsRead,
      markAllRead,
      ready,
    }),
    [notifications, groups, unreadCount, markAsRead, markAllRead, ready],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

/* ─── hook ───────────────────────────────────────────────── */

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used inside NotificationProvider");
  return ctx;
}
