import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFinance } from "@/context/FinanceContext";
import { useBalances } from "@/hooks/useBalances";
import { cn } from "@/lib/utils";
import type { Loan, LoanDirection } from "@/types";
import { LOAN_TYPES } from "./utils";
import { toast } from "sonner";

export function LoanFormDialog({ open, onOpenChange, loan }: { open: boolean; onOpenChange: (v: boolean) => void; loan?: Loan }) {
  const { accounts, addLoan, updateLoan, addTransaction } = useFinance();
  const b = useBalances();
  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState({
    contactName: loan?.contactName ?? "",
    direction: (loan?.direction ?? "receivable") as LoanDirection,
    totalAmount: loan?.totalAmount ? String(loan.totalAmount) : "",
    accountId: loan?.accountId ?? accounts[0]?.id ?? "",
    loanType: loan?.loanType ?? "Personal Loan",
    loanDate: loan?.loanDate ?? today,
    dueDate: loan?.dueDate ?? "",
    isSpecialNumber: true as boolean,
  });

  const amt = parseFloat(form.totalAmount) || 0;
  const existingCredit = loan && loan.direction === "receivable" && loan.accountId === form.accountId ? loan.totalAmount : 0;
  const selectedBalance = (b.balances.get(form.accountId) ?? 0) + existingCredit;

  const handleOpen = (v: boolean) => {
    if (v) {
      setForm({
        contactName: loan?.contactName ?? "",
        direction: (loan?.direction ?? "receivable") as LoanDirection,
        totalAmount: loan?.totalAmount ? String(loan.totalAmount) : "",
        accountId: loan?.accountId ?? accounts[0]?.id ?? "",
        loanType: loan?.loanType ?? "Personal Loan",
        loanDate: loan?.loanDate ?? today,
        dueDate: loan?.dueDate ?? "",
        isSpecialNumber: true,
      });
    }
    onOpenChange(v);
  };

  const selectedAccount = accounts.find((a) => a.id === form.accountId);
  const isMfsAccount = selectedAccount?.type === "mfs";
  const showSpecialNumber = form.direction === "receivable" && isMfsAccount;
  const specialCharge = showSpecialNumber && !form.isSpecialNumber ? 5 : 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.contactName.trim()) { toast.error("Contact name is required"); return; }
    const amt = parseFloat(form.totalAmount);
    if (!amt || amt <= 0) { toast.error("Enter a valid loan amount"); return; }
    if (!form.accountId) { toast.error("Select an account"); return; }

    if (form.direction === "receivable") {
      if (selectedBalance < amt + specialCharge) {
        const accName = accounts.find((a) => a.id === form.accountId)?.name ?? "wallet";
        toast.error(`Insufficient balance in ${accName} (${b.money(selectedBalance)})`);
        return;
      }
    }

    const payload = {
      contactName: form.contactName.trim(),
      direction: form.direction,
      totalAmount: amt,
      accountId: form.accountId,
      loanType: form.loanType,
      loanDate: form.loanDate,
      dueDate: form.dueDate || undefined,
    };

    if (loan) {
      updateLoan(loan.id, payload);
      toast.success("Loan updated");
    } else {
      addLoan(payload);
      if (specialCharge > 0) {
        addTransaction({
          type: "expense",
          amount: specialCharge,
          date: form.loanDate,
          accountId: form.accountId,
          category: "Transfer Charge",
          title: `Special Number Charge — ${selectedAccount?.name ?? ""}`,
        });
      }
      toast.success("Loan added");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="rounded-2xl sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{loan ? "Edit Loan" : "New Loan"}</DialogTitle>
          <DialogDescription>Fill in the loan details below.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Loan Type</Label>
            <div className="grid grid-cols-2 gap-2">
              {([["receivable", "I lent money"], ["payable", "I borrowed money"]] as const).map(([dir, label]) => (
                <button key={dir} type="button" onClick={() => setForm({ ...form, direction: dir })} className={cn("rounded-xl border py-2.5 text-sm font-semibold transition", form.direction === dir ? (dir === "receivable" ? "border-emerald-500 bg-emerald-500/10 text-emerald-600" : "border-rose-500 bg-rose-500/10 text-rose-600") : "border-border text-muted-foreground hover:bg-muted")}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Contact Name *</Label>
              <Input placeholder="e.g. Rahim Ahmed" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Amount (৳) *</Label>
              <Input type="number" step="0.01" placeholder="0" value={form.totalAmount} onChange={(e) => setForm({ ...form, totalAmount: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Account *</Label>
            <select value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              {accounts.map((a) => (<option key={a.id} value={a.id}>{a.name} — {b.money(b.balances.get(a.id) ?? 0)}</option>))}
            </select>
            {form.direction === "receivable" && (
              <p className={cn("text-xs", selectedBalance >= amt + specialCharge || amt <= 0 ? "text-muted-foreground" : "font-semibold text-danger")}>
                Wallet balance: {b.money(selectedBalance)}
                {selectedBalance < amt + specialCharge && amt > 0 && <> — insufficient for this loan{specialCharge > 0 ? ` + ${specialCharge} Tk charge` : ""}</>}
              </p>
            )}
          </div>
          {showSpecialNumber && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-indigo-600">As a Special Number</p>
              <div className="grid grid-cols-2 gap-2">
                {(["Yes", "No"] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setForm({ ...form, isSpecialNumber: opt === "Yes" })}
                    className={cn(
                      "rounded-xl border py-2.5 text-sm font-semibold transition",
                      (opt === "Yes" ? form.isSpecialNumber : !form.isSpecialNumber)
                        ? "border-indigo-500 bg-indigo-500/10 text-indigo-600"
                        : "border-border text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              {!form.isSpecialNumber && (
                <p className="text-xs text-muted-foreground">5 Tk charge will be debited</p>
              )}
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Loan Category</Label>
            <select value={form.loanType} onChange={(e) => setForm({ ...form, loanType: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              {LOAN_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs font-semibold uppercase text-muted-foreground">Loan Date *</Label><Input type="date" value={form.loanDate} onChange={(e) => setForm({ ...form, loanDate: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs font-semibold uppercase text-muted-foreground">Due Date (optional)</Label><Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">{loan ? "Save Changes" : "Add Loan"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}