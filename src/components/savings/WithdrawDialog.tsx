import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFinance } from "@/context/FinanceContext";
import { useSavings } from "@/context/SavingsContext";
import { useBalances } from "@/hooks/useBalances";
import { today } from "@/lib/date";
import { WITHDRAWAL_REASONS, type WithdrawalReason, type SavingWithdrawal } from "@/types";

export function WithdrawDialog({
  open,
  onOpenChange,
  goalId,
  availableAmount,
  withdrawal,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  goalId: string;
  availableAmount: number;
  withdrawal?: SavingWithdrawal | null;
}) {
  const { accounts } = useFinance();
  const { addWithdrawal, updateWithdrawal } = useSavings();
  const b = useBalances();
  const toAccounts = useMemo(
    () => accounts.filter((a) => a.type !== "savings"),
    [accounts],
  );
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [form, setForm] = useState({
    amount: "",
    walletId: toAccounts[0]?.id ?? "",
    reason: "" as WithdrawalReason | "",
    date: today(),
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      amount: withdrawal ? String(withdrawal.amount) : "",
      walletId: withdrawal?.walletId ?? toAccounts[0]?.id ?? "",
      reason: withdrawal?.reason ?? "",
      date: withdrawal?.date ?? today(),
    });
  }, [open, withdrawal, toAccounts]);

  const amount = Number(form.amount);
  const savingsWalletId = accounts.find((a) => a.type === "savings")?.id;
  const savingsBalance = savingsWalletId ? (b.balances.get(savingsWalletId) ?? 0) : 0;
  const maxAvailable = withdrawal
    ? Math.min(availableAmount + withdrawal.amount, savingsBalance)
    : Math.min(availableAmount, savingsBalance);

  const submit = async () => {
    if (!amount || amount <= 0) return toast.error("Enter an amount greater than 0");
    if (!form.reason) return toast.error("Select a reason");
    if (!form.walletId) return toast.error("Select a destination wallet");
    if (amount > maxAvailable)
      return toast.error(`Insufficient savings. Available: ${b.money(maxAvailable)}`);

    setSaving(true);
    const payload = {
      goalId,
      walletId: form.walletId,
      amount,
      reason: form.reason as WithdrawalReason,
      date: form.date,
    };
    const ok = withdrawal
      ? await updateWithdrawal(withdrawal.id, payload)
      : await addWithdrawal(payload);
    setSaving(false);

    if (!ok) return toast.error("Could not save this withdrawal");
    toast.success(withdrawal ? "Withdrawal updated" : `${b.money(amount)} withdrawn from your savings`);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{withdrawal ? "Edit withdrawal" : "Withdraw from savings"}</DialogTitle>
            <DialogDescription>
              Move money from your Savings Wallet back to a regular wallet.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              <p className="text-muted-foreground">Available to withdraw</p>
              <p className="text-lg font-bold">{b.money(maxAvailable)}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="withdraw-amount">Amount</Label>
              <Input
                id="withdraw-amount"
                type="number"
                min={0}
                inputMode="decimal"
                placeholder="0"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Reason</Label>
              <Select
                value={form.reason}
                onValueChange={(v) => setForm({ ...form, reason: v as WithdrawalReason })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {WITHDRAWAL_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>To wallet</Label>
              <Select
                value={form.walletId}
                onValueChange={(v) => setForm({ ...form, walletId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select wallet" />
                </SelectTrigger>
                <SelectContent>
                  {toAccounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} — {b.money(b.balances.get(a.id) ?? 0)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="withdraw-date">Date</Label>
              <Input
                id="withdraw-date"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!amount || amount <= 0) return toast.error("Enter an amount greater than 0");
                if (!form.reason) return toast.error("Select a reason");
                if (!form.walletId) return toast.error("Select a destination wallet");
                if (amount > maxAvailable)
                  return toast.error(`Insufficient savings. Available: ${b.money(maxAvailable)}`);
                setConfirmOpen(true);
              }}
              disabled={saving}
            >
              {withdrawal ? "Save changes" : "Withdraw"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{withdrawal ? "Confirm update" : "Confirm withdrawal"}</AlertDialogTitle>
            <AlertDialogDescription>
              {withdrawal
                ? `Update this withdrawal to ${b.money(amount)}?`
                : <>Withdraw <span className="font-bold">{b.money(amount)}</span> from your Savings Wallet
                  to {toAccounts.find((a) => a.id === form.walletId)?.name ?? "your wallet"}?</>
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSaving(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={submit} disabled={saving}>
              {saving ? "Saving…" : withdrawal ? "Confirm update" : "Confirm withdrawal"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
