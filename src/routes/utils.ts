import type { Loan, LoanDirection, LoanStatus } from "@/types";
import { CheckCircle2, Clock, XCircle } from "lucide-react";

export function fmt(n: number) {
  return "৳" + n.toLocaleString("en-IN");
}

export function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function paidAmount(loan: Loan) {
  return loan.payments.reduce((s, p) => s + p.amount, 0);
}

export function remainingAmount(loan: Loan) {
  return Math.max(0, loan.totalAmount - paidAmount(loan));
}

export function progressPct(loan: Loan) {
  if (loan.totalAmount === 0) return 0;
  return Math.min(100, Math.round((paidAmount(loan) / loan.totalAmount) * 100));
}

export const LOAN_TYPES = [
  "Personal Loan",
  "Friend Loan",
  "Family Loan",
  "Education Loan",
  "Emergency Loan",
  "Medical Expense",
  "Tuition Fee",
  "Hostel / Mess",
  "Device Purchase",
  "Other",
];

export const STATUS_CONFIG: Record<LoanStatus, { label: string; color: string; icon: React.ElementType }> = {
  active: { label: "Active", color: "text-blue-500 bg-blue-500/10", icon: Clock },
  completed: { label: "Completed", color: "text-green-500 bg-green-500/10", icon: CheckCircle2 },
  overdue: { label: "Overdue", color: "text-red-500 bg-red-500/10", icon: XCircle },
};

export const DIR_CONFIG: Record<LoanDirection, { label: string; color: string }> = {
  receivable: { label: "Receiving", color: "text-emerald-500 bg-emerald-500/10" },
  payable: { label: "Payable", color: "text-rose-500 bg-rose-500/10" },
};

export function normalizePhotoUrl(url: string): string {
  if (!url) return url;
  const githubBlobMatch = url.match(
    /github\.com\/([^/]+)\/([^/]+)\/blob\/(.+)/,
  );
  if (githubBlobMatch) {
    return `https://raw.githubusercontent.com/${githubBlobMatch[1]}/${githubBlobMatch[2]}/${githubBlobMatch[3]}`;
  }
  return url;
}

export function dirLabel(direction: LoanDirection, status: LoanStatus): string {
  if (status === "completed") {
    return direction === "receivable" ? "Received" : "Paid";
  }
  return direction === "receivable" ? "Receiving" : "Payable";
}