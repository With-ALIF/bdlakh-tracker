import { useState } from "react";
import {
  ArrowLeft, Pencil, Phone, Info, FileText, Trash2, Banknote, Plus, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useFinance } from "@/context/FinanceContext";
import { cn } from "@/lib/utils";
import type { Loan } from "@/types";
import {
  fmt, fmtDate, paidAmount, remainingAmount, progressPct, DIR_CONFIG, STATUS_CONFIG, dirLabel,
} from "./utils";
import { toast } from "sonner";
import { PaymentDialog, IncreaseDialog, LoanFormDialog } from "./dialogs";
import { DueDateStatus } from "./LoanCard";

export function LoanDetail({ loan, onBack }: { loan: Loan; onBack: () => void }) {
  const { accounts, deleteLoanPayment, deleteLoanIncrease, updateLoan, deleteLoan } = useFinance();
  const [payOpen, setPayOpen] = useState(false);
  const [incOpen, setIncOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const account = accounts.find((a) => a.id === loan.accountId);
  const pct = progressPct(loan);
  const paid = paidAmount(loan);
  const remaining = remainingAmount(loan);
  const dir = DIR_CONFIG[loan.direction];
  const stat = STATUS_CONFIG[loan.status];
  const StatIcon = stat.icon;

  const initialAmount = loan.totalAmount - (loan.increases?.reduce((s, i) => s + i.amount, 0) ?? 0);

  const timelineEvents = [
    {
      id: "initial",
      kind: "initial" as const,
      date: loan.loanDate,
      title: loan.direction === "receivable" ? "Loan Given" : "Loan Taken",
      amount: initialAmount,
      note: undefined,
    },
    ...(loan.increases ?? []).map((inc) => ({
      id: inc.id,
      kind: "increase" as const,
      date: inc.date,
      title: loan.direction === "receivable" ? "Additional Loan Given" : "Additional Loan Taken",
      amount: inc.amount,
      note: inc.note,
    })),
    ...loan.payments.map((p) => ({
      id: p.id,
      kind: "payment" as const,
      date: p.date,
      title: loan.direction === "receivable" ? "Payment Received" : "Payment Made",
      amount: p.amount,
      note: p.note,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="space-y-4">
      {/* Back bar */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
      </div>

      {/* Contact hero */}
      <div className="card-surface overflow-hidden">
        <div className="h-1.5 w-full" style={{ background: loan.direction === "receivable" ? "linear-gradient(to right,#10b981,#059669)" : "linear-gradient(to right,#f43f5e,#e11d48)" }} />
        <div className="flex flex-col items-center py-6 text-center">
          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full text-2xl font-black text-white" style={{ background: loan.direction === "receivable" ? "#10b981" : "#f43f5e" }}>
            {loan.contactName.charAt(0).toUpperCase()}
          </div>
          <p className="text-lg font-bold">{loan.contactName}</p>
          {loan.contactPhone && (
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <Phone className="h-3.5 w-3.5" /> {loan.contactPhone}
            </p>
          )}
          <span className={cn("mt-2 rounded-full px-3 py-1 text-xs font-semibold", dir.color)}>
            {dirLabel(loan.direction, loan.status)}
          </span>
        </div>
      </div>

      {/* Amount summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: loan.direction === "receivable" ? "Total Given" : "Total Borrowed", value: fmt(loan.totalAmount) },
          { label: loan.direction === "receivable" ? "Received" : "Paid", value: fmt(paid) },
          { label: "Remaining", value: fmt(remaining) },
        ].map((item) => (
          <div key={item.label} className="card-surface p-4 text-center">
            <p className="text-[11px] font-medium text-muted-foreground">{item.label}</p>
            <p className="mt-1 text-lg font-bold">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Progress */}
      <div className="card-surface p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium">Progress</span>
          <span className="font-bold">{pct}%</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: loan.direction === "receivable" ? "linear-gradient(to right,#10b981,#059669)" : "linear-gradient(to right,#f43f5e,#e11d48)" }} />
        </div>
      </div>

      {/* Information */}
      <div className="card-surface divide-y divide-border overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3"><Info className="h-4 w-4 text-primary" /><span className="font-semibold">Information</span></div>
        {[
          { label: "Loan Type", value: loan.loanType },
          { label: "Status", value: <span className={cn("flex items-center gap-1 text-xs font-semibold", stat.color)}><StatIcon className="h-3 w-3" />{stat.label}</span> },
          { label: "Payment Method", value: account?.name ?? loan.accountId },
          { label: "Loan Date", value: fmtDate(loan.loanDate) },
          { label: "Due Date", value: loan.dueDate ? <div className="flex justify-end"><DueDateStatus loan={loan} /></div> : "—" },
          { label: "Created", value: fmtDate(loan.createdAt) },
          { label: "Last Updated", value: fmtDate(loan.updatedAt) },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between px-4 py-2.5 text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium text-right">{value}</span>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div className="card-surface overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3"><FileText className="h-4 w-4 text-primary" /><span className="font-semibold">Activity Timeline</span></div>
        {timelineEvents.map((item) => (
          <div key={item.id} className="group flex items-center justify-between border-b border-border px-4 py-3 last:border-0">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{fmtDate(item.date)}</p>
              <p className="mt-0.5 text-sm font-medium">{item.title}{item.note && <span className="ml-1 text-muted-foreground">· {item.note}</span>}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">{fmt(item.amount)}</span>
              {item.kind === "payment" && (
                <button onClick={() => { deleteLoanPayment(loan.id, item.id); toast.success("Payment deleted"); }} className="opacity-0 group-hover:opacity-100 rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"><Trash2 className="h-3.5 w-3.5" /></button>
              )}
              {item.kind === "increase" && (
                <button onClick={() => { deleteLoanIncrease(loan.id, item.id); toast.success("Increase deleted"); }} className="opacity-0 group-hover:opacity-100 rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"><Trash2 className="h-3.5 w-3.5" /></button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      {loan.status !== "completed" && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <Button onClick={() => setPayOpen(true)} className="gap-1.5"><Banknote className="h-4 w-4" /> Record Payment</Button>
          <Button variant="secondary" onClick={() => setIncOpen(true)} className="gap-1.5"><Plus className="h-4 w-4" /> {loan.direction === "receivable" ? "Give More Loan" : "Borrow More"}</Button>
          <Button variant="outline" onClick={() => setEditOpen(true)} className="gap-1.5"><Pencil className="h-4 w-4" /> Edit Loan</Button>
          <Button variant="outline" onClick={() => { updateLoan(loan.id, { status: "completed" }); toast.success("Loan closed"); }} className="gap-1.5 text-green-600 border-green-600/30 hover:bg-green-600/10"><CheckCircle2 className="h-4 w-4" /> Close</Button>
          <Button variant="outline" className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setConfirmDelete(true)}><Trash2 className="h-4 w-4" /> Delete</Button>
        </div>
      )}

      <PaymentDialog open={payOpen} onOpenChange={setPayOpen} loanId={loan.id} defaultAccountId={loan.accountId} defaultAmount={remaining} />
      <IncreaseDialog open={incOpen} onOpenChange={setIncOpen} loanId={loan.id} defaultAccountId={loan.accountId} direction={loan.direction} />
      <LoanFormDialog open={editOpen} onOpenChange={setEditOpen} loan={loan} />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete this loan?</AlertDialogTitle><AlertDialogDescription>All payment history for "{loan.contactName}" will be permanently deleted.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { deleteLoan(loan.id); onBack(); toast.success("Loan deleted"); }}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}