import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFinance } from "@/context/FinanceContext";
import type { Loan, LoanDirection } from "@/types";
import { LOAN_TYPES } from "./utils";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function PaymentDialog({ open, onOpenChange, loanId, defaultAccountId, defaultAmount }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  loanId: string; defaultAccountId?: string;
  defaultAmount?: number;
}) {
  const { accounts, addLoanPayment } = useFinance();
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    amount: defaultAmount ? String(defaultAmount) : "",
    date: today,
    accountId: defaultAccountId ?? accounts[0]?.id ?? "",
  });

  const handleOpen = (v: boolean) => {
    if (v) setForm({ amount: defaultAmount ? String(defaultAmount) : "", date: today, accountId: defaultAccountId ?? accounts[0]?.id ?? "" });
    onOpenChange(v);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    addLoanPayment(loanId, { amount: amt, date: form.date, accountId: form.accountId || undefined });
    toast.success("Payment recorded");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>Log a payment made or received for this loan.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5"><Label className="text-xs font-semibold uppercase text-muted-foreground">Amount (৳)</Label><Input type="number" step="0.01" placeholder="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Account</Label>
            <select value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              {accounts.map((a) => (<option key={a.id} value={a.id}>{a.name}</option>))}
            </select>
          </div>
          <div className="space-y-1.5"><Label className="text-xs font-semibold uppercase text-muted-foreground">Date</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
          <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit">Save Payment</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function IncreaseDialog({ open, onOpenChange, loanId, defaultAccountId, direction }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  loanId: string;
  defaultAccountId?: string;
  direction: LoanDirection;
}) {
  const { accounts, addLoanIncrease } = useFinance();
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ amount: "", date: today, accountId: defaultAccountId ?? accounts[0]?.id ?? "" });

  const handleOpen = (v: boolean) => {
    if (v) setForm({ amount: "", date: today, accountId: defaultAccountId ?? accounts[0]?.id ?? "" });
    onOpenChange(v);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    addLoanIncrease(loanId, { amount: amt, date: form.date, accountId: form.accountId || undefined });
    toast.success(direction === "receivable" ? "Additional loan given" : "Additional loan taken");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{direction === "receivable" ? "Give More Loan" : "Borrow More Loan"}</DialogTitle>
          <DialogDescription>Add to the existing loan total amount.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5"><Label className="text-xs font-semibold uppercase text-muted-foreground">Additional Amount (৳)</Label><Input type="number" step="0.01" placeholder="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Account</Label>
            <select value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              {accounts.map((a) => (<option key={a.id} value={a.id}>{a.name}</option>))}
            </select>
          </div>
          <div className="space-y-1.5"><Label className="text-xs font-semibold uppercase text-muted-foreground">Date</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
          <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit">Add to Loan</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { LoanFormDialog } from "./LoanFormDialog";