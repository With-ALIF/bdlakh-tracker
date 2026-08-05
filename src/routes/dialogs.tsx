import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFinance } from "@/context/FinanceContext";
import { useBalances } from "@/hooks/useBalances";
import { today } from "@/lib/date";
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
  const t = today();
  const [form, setForm] = useState({
    amount: defaultAmount ? String(defaultAmount) : "",
    date: t,
    accountId: defaultAccountId ?? accounts[0]?.id ?? "",
  });

  const handleOpen = (v: boolean) => {
    if (v) setForm({ amount: defaultAmount ? String(defaultAmount) : "", date: today(), accountId: defaultAccountId ?? accounts[0]?.id ?? "" });
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
              {accounts.sort((a, b) => a.name.localeCompare(b.name)).map((a) => (<option key={a.id} value={a.id}>{a.name}</option>))}
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
  const { accounts, addLoanIncrease, addTransaction, transferCharges } = useFinance();
  const b = useBalances();
  const t = today();
  const [form, setForm] = useState({
    amount: "",
    date: t,
    accountId: defaultAccountId ?? accounts[0]?.id ?? "",
    isSpecialNumber: true as boolean,
  });

  const handleOpen = (v: boolean) => {
    if (v) setForm({ amount: "", date: today(), accountId: defaultAccountId ?? accounts[0]?.id ?? "", isSpecialNumber: true });
    onOpenChange(v);
  };

  const selectedAccount = accounts.find((a) => a.id === form.accountId);

  const accountFlatFee = transferCharges.find(
    (c) => c.flatFee > 0 && c.fromProvider === selectedAccount?.providerId && c.toProvider === selectedAccount?.providerId,
  );
  const flatFee = accountFlatFee?.flatFee ?? 0;

  const showSpecialNumber = direction === "receivable" && flatFee > 0;

  const amt = parseFloat(form.amount) || 0;
  const specialCharge = showSpecialNumber && !form.isSpecialNumber ? flatFee : 0;
  const selectedBalance = b.balances.get(form.accountId) ?? 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }

    if (direction === "receivable") {
      if (selectedBalance < amt + specialCharge) {
        const accName = accounts.find((a) => a.id === form.accountId)?.name ?? "wallet";
        toast.error(`Insufficient balance in ${accName} (${b.money(selectedBalance)})`);
        return;
      }
    }

    addLoanIncrease(loanId, { amount: amt, date: form.date, accountId: form.accountId || undefined, isSpecialNumber: form.isSpecialNumber });
    if (specialCharge > 0) {
      addTransaction({
        type: "expense",
        amount: specialCharge,
        date: form.date,
        accountId: form.accountId || (defaultAccountId ?? accounts[0]?.id ?? ""),
        category: "Transfer Charge",
        title: `${selectedAccount?.name ?? "Account"} ${flatFee} Tk Charge`,
      });
    }
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
              {accounts.sort((a, b) => a.name.localeCompare(b.name)).map((a) => (<option key={a.id} value={a.id}>{a.name}</option>))}
            </select>
            {direction === "receivable" && amt > 0 && (
              <p className={cn("text-xs", selectedBalance >= amt + specialCharge ? "text-muted-foreground" : "font-semibold text-danger")}>
                Wallet balance: {b.money(selectedBalance)}
                {selectedBalance < amt + specialCharge && <> — insufficient for this increase{specialCharge > 0 ? ` + ${specialCharge} Tk charge` : ""}</>}
              </p>
            )}
          </div>
          {showSpecialNumber && flatFee > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-indigo-600">{selectedAccount?.name} {flatFee} Tk charge</p>
              <div className="grid grid-cols-2 gap-2">
                {(["Yes", "No"] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setForm({ ...form, isSpecialNumber: opt === "No" })}
                    className={cn(
                      "rounded-xl border py-2.5 text-sm font-semibold transition",
                      (opt === "Yes" ? !form.isSpecialNumber : form.isSpecialNumber)
                        ? "border-indigo-500 bg-indigo-500/10 text-indigo-600"
                        : "border-border text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              {!form.isSpecialNumber && (
                <p className="text-xs text-muted-foreground">{flatFee} Tk charge will be debited</p>
              )}
            </div>
          )}
          <div className="space-y-1.5"><Label className="text-xs font-semibold uppercase text-muted-foreground">Date</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
          <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit">Add to Loan</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { LoanFormDialog } from "./LoanFormDialog";