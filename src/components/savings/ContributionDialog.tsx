import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PiggyBank } from "lucide-react";
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
import type { SavingContribution } from "@/types";

export function ContributionDialog({
  open,
  onOpenChange,
  goalId,
  contribution,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  goalId: string;
  contribution?: SavingContribution | null;
}) {
  const { accounts } = useFinance();
  const { addContribution, updateContribution } = useSavings();
  const b = useBalances();
  const fromAccounts = useMemo(
    () => accounts.filter((a) => a.type !== "savings"),
    [accounts],
  );
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ amount: "", walletId: "", date: today() });

  useEffect(() => {
    if (!open) return;
    setForm({
      amount: contribution ? String(contribution.amount) : "",
      walletId: contribution?.walletId ?? fromAccounts[0]?.id ?? accounts[0]?.id ?? "",
      date: contribution?.date ?? today(),
    });
  }, [open, contribution, accounts, fromAccounts]);

  const amount = Number(form.amount);
  const walletBalance = form.walletId ? (b.balances.get(form.walletId) ?? 0) : 0;
  const available = contribution ? walletBalance + contribution.amount : walletBalance;

  const submit = async () => {
    if (!amount || amount <= 0) return toast.error("Enter an amount greater than 0");
    if (!form.walletId) return toast.error("Select a wallet");
    if (amount > available)
      return toast.error(`Not enough balance in this wallet (${b.money(available)} available)`);

    setSaving(true);
    const payload = {
      goalId,
      walletId: form.walletId,
      amount,
      date: form.date,
    };
    const ok = contribution
      ? await updateContribution(contribution.id, payload)
      : await addContribution(payload);
    setSaving(false);

    if (!ok) return toast.error("Could not save this saving");
    toast.success(contribution ? "Saving updated" : `${b.money(amount)} added to your goal`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PiggyBank className="h-5 w-5 text-primary" />
            {contribution ? "Edit saving" : "Add saving"}
          </DialogTitle>
          <DialogDescription>
            The amount will be transferred from your selected wallet into your Savings Wallet for this goal.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="save-amount">Amount</Label>
            <Input
              id="save-amount"
              type="number"
              min={0}
              inputMode="decimal"
              placeholder="1000"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>From wallet</Label>
            <Select
              value={form.walletId}
              onValueChange={(v) => setForm({ ...form, walletId: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select wallet" />
              </SelectTrigger>
              <SelectContent>
                {fromAccounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name} — {b.money(b.balances.get(a.id) ?? 0)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.walletId ? (
              <p className="text-xs text-muted-foreground">
                Available: <span className="font-semibold">{b.money(available)}</span>
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="save-date">Saving Date</Label>
            <Input
              id="save-date"
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
          <Button onClick={submit} disabled={saving}>
            {saving ? "Saving…" : contribution ? "Save changes" : "Add saving"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
