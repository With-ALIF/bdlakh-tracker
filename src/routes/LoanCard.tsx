import {
  ChevronRight, CheckCircle2, Clock, XCircle, Calendar, Badge, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Loan } from "@/types";
import {
  fmt, fmtDate, paidAmount, remainingAmount, progressPct, DIR_CONFIG, STATUS_CONFIG, dirLabel,
} from "./utils";

export function DueDateStatus({ loan }: { loan: Loan }) {
  if (loan.status === "completed") {
    return (
      <div className="flex items-center gap-1.5 text-xs font-medium text-green-600">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Paid in full
      </div>
    );
  }

  if (!loan.dueDate) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Calendar className="h-3.5 w-3.5" />
        No due date set
      </div>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(loan.dueDate);
  dueDate.setHours(0, 0, 0, 0);
  const diffDays = Math.round((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays > 7) {
    return <div className="flex items-center gap-1.5 text-xs text-blue-600"><Badge className="h-3.5 w-3.5" />On Schedule (Due {fmtDate(loan.dueDate)})</div>;
  }
  if (diffDays >= 3) {
    return <div className="flex items-center gap-1.5 text-xs text-amber-600"><Clock className="h-3.5 w-3.5" />Due Soon (in {diffDays} days)</div>;
  }
  if (diffDays >= 1) {
    return <div className="flex items-center gap-1.5 text-xs text-orange-600"><AlertCircle className="h-3.5 w-3.5" />Due in {diffDays} day{diffDays > 1 ? 's' : ''}</div>;
  }
  if (diffDays === 0) {
    return <div className="flex items-center gap-1.5 text-xs text-orange-600"><AlertCircle className="h-3.5 w-3.5" />Due Today</div>;
  }
  if (diffDays < 0) {
    return <div className="flex items-center gap-1.5 text-xs text-red-600"><XCircle className="h-3.5 w-3.5" />Overdue by {-diffDays} day{-diffDays > 1 ? 's' : ''}</div>;
  }

  return null;
}

function DueDateFooter({ loan }: { loan: Loan }) {
  if (!loan.dueDate) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(loan.dueDate);
  dueDate.setHours(0, 0, 0, 0);
  const diffDays = Math.round((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  let text = "";
  if (diffDays > 7) {
    text = "On Schedule";
  } else if (diffDays >= 3) {
    text = `Due in ${diffDays} days`;
  } else if (diffDays >= 1) {
    text = `Due in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
  } else if (diffDays === 0) {
    text = "Due Today";
  } else if (diffDays < 0) {
    text = `Overdue by ${-diffDays} day${-diffDays > 1 ? 's' : ''}`;
  }

  if (text) {
    return <><span>•</span><span>{text}</span></>;
  }

  return null;
}

export function LoanCard({ loan, onSelect }: { loan: Loan; onSelect: () => void }) {
  const pct = progressPct(loan);
  const dir = DIR_CONFIG[loan.direction];
  const stat = STATUS_CONFIG[loan.status];
  const StatIcon = stat.icon;
  const remaining = remainingAmount(loan);
  const paid = paidAmount(loan);

  return (
    <div className="card-surface animate-rise overflow-hidden">
      <div className="h-1 w-full" style={{ background: loan.direction === "receivable" ? "linear-gradient(to right,#10b981,#059669)" : "linear-gradient(to right,#f43f5e,#e11d48)" }} />
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-bold">{loan.contactName}</p>

            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-semibold", dir.color)}>{dirLabel(loan.direction, loan.status)}</span>
            </div>
          </div>
          <div className="mt-2"><DueDateStatus loan={loan} /></div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
            <div><p className="text-[11px] font-medium text-muted-foreground">Remaining</p><p className="font-bold">{fmt(remaining)}</p></div>
            <div><p className="text-[11px] font-medium text-muted-foreground">Total</p><p className="font-semibold">{fmt(loan.totalAmount)}</p></div>
            <div><p className="text-[11px] font-medium text-muted-foreground">{loan.direction === "receivable" ? "Received" : "Paid"}</p><p className="font-semibold">{fmt(paid)}</p></div>
          </div>
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-[11px]"><span className="font-medium text-muted-foreground">Progress</span><span className="font-bold">{pct}%</span></div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: loan.direction === "receivable" ? "linear-gradient(to right,#10b981,#059669)" : "linear-gradient(to right,#f43f5e,#e11d48)" }} /></div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="text-[11px] text-muted-foreground">
              {loan.status === "completed" ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 font-medium", stat.color)}><StatIcon className="h-3 w-3" /> {stat.label}</span>
                  <span>•</span><span>{loan.loanType}</span>
                  {loan.payments.length > 0 && <><span>•</span><span>Paid on {fmtDate(loan.payments[loan.payments.length - 1].date)}</span></>}
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-1.5"><span className={cn("rounded-full px-2.5 py-0.5 font-semibold", dir.color)}>{dirLabel(loan.direction, loan.status)}</span><span>•</span><span>{loan.loanType}</span><DueDateFooter loan={loan} /></div>
              )}
            </div>
            <button onClick={onSelect} className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline">{loan.status === "completed" ? "View History" : "View Details"}<ChevronRight className="h-3 w-3" /></button>
        </div>
      </div>
    </div>
  );
}