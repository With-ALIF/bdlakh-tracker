import type { LucideIcon } from "lucide-react";

export type NotificationType =
  | "loan_due_today"
  | "loan_due_tomorrow"
  | "loan_due_soon"
  | "loan_overdue"
  | "loan_completed"
  | "low_wallet_balance"
  | "low_income"
  | "transfer_completed"
  | "income_added"
  | "expense_added";

export type NotificationCategory = "loan" | "wallet" | "transaction" | "transfer";

export interface AppNotification {
  id: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  description: string;
  /** ISO timestamp */
  timestamp: string;
  /** Relative time string like "2 minutes ago" */
  relativeTime: string;
  /** Route to navigate to when clicked */
  href: string;
  /** Icon tone for styling */
  tone: "warning" | "danger" | "success" | "info" | "primary";
  /** Whether this has been "read" in the current session */
  read: boolean;
}

export interface NotificationGroup {
  label: "Today" | "Yesterday" | "Earlier";
  items: AppNotification[];
}
