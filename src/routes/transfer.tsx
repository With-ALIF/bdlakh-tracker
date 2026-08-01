import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { ArrowLeftRight, ArrowRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/layouts/AppLayout";
import { PageHeader, Panel, EmptyState } from "@/components/ui-kit";
import { useFinance } from "@/context/FinanceContext";
import { useBalances } from "@/hooks/useBalances";
import { AccountIcon } from "@/components/AccountIcon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Transfer } from "@/types";

export const Route = createFileRoute("/transfer")({
  head: () => ({
    meta: [
      { title: "Transfer Money — Money Mate" },
      { name: "description", content: "Move money between Cash, Bkash, Nagad, Rocket and your bank account." },
      { property: "og:title", content: "Transfer Money — Money Mate" },
      { property: "og:description", content: "Record internal transfers and keep every wallet balance accurate." },
    ],
  }),
  component: TransferPage,
});

const TRANSFER_CHARGES: Record<string, number> = {
  // MFS to Cash (Cash Out)
  bkash_to_cash: 1.85 / 100,
  nagad_to_cash: 1.45 / 100,
  rocket_to_cash: 1.67 / 100,

  // MFS to Bank/MFS (Send Money with charge) - New Rules
  nagad_to_bank: 0.85 / 100,
  nagad_to_bkash: 0.85 / 100,
  bkash_to_bank: 0.85 / 100,
  bkash_to_nagad: 0.85 / 100,
  bank_to_cash: 0.00 / 100, // No charge for bank to cash
};

/**
 * Calculates the charge for a transfer.
 * @returns The charge, total debit amount, and whether a charge is applicable.
 */
function calculateTransferCharge(
  fromAccountId: string,
  toAccountId: string,
  amount: number,
  getAccountName: (id: string) => string | undefined,
) {
  const fromAccountName = getAccountName(fromAccountId)?.toLowerCase() ?? "";
  let toAccountName = getAccountName(toAccountId)?.toLowerCase() ?? "";

  if (toAccountName.includes("bank")) {
    toAccountName = "bank";
  }

  const chargeKey = `${fromAccountName}_to_${toAccountName}`;
  const chargeRate = TRANSFER_CHARGES[chargeKey];

  if (!chargeRate || amount <= 0) {
    return { charge: 0, totalDebit: amount, hasCharge: false };
  }

  const rawCharge = amount * chargeRate;
  const charge = Math.round(rawCharge * 100) / 100;

  return { charge, totalDebit: amount + charge, hasCharge: true };
}

function TransferPage() {
  const { accounts, transfers, addTransfer, addTransaction, deleteTransfer } = useFinance();
  const b = useBalances();

  const [form, setForm] = useState({
    fromAccountId: accounts[0]?.id ?? "",
    toAccountId: accounts[1]?.id ?? accounts[0]?.id ?? "",
    amount: "",
    date: dayjs().format("YYYY-MM-DD"),
  });

  useEffect(() => {
    if (accounts.length > 0) {
      setForm((prev) => ({
        ...prev,
        fromAccountId: prev.fromAccountId || accounts[0]?.id || "",
        toAccountId: prev.toAccountId || accounts[1]?.id || accounts[0]?.id || "",
      }));
    }
  }, [accounts]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Transfer | null>(null);

  const { charge, totalDebit, hasCharge } = useMemo(
    () => calculateTransferCharge(form.fromAccountId, form.toAccountId, Number(form.amount) || 0, b.accountName),
    [form.fromAccountId, form.toAccountId, form.amount, b.accountName],
  );

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const selectCls =
    "h-10 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40";

  const handleConfirmTransfer = () => {
    const amount = Number(form.amount);
    addTransfer({
      fromAccountId: form.fromAccountId,
      toAccountId: form.toAccountId,
      amount,
      date: form.date,
    });

    if (hasCharge && charge > 0) {
      addTransaction({
        type: "expense",
        amount: charge,
        date: form.date,
        accountId: form.fromAccountId,
        category: "Transfer Charge",
        title: `Cash Out Charge from ${b.accountName(form.fromAccountId)}`,
      });
    }

    setForm({ ...form, amount: "" });
    toast.success("Transfer saved");
    setIsSubmitting(false);
    setConfirmOpen(false);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const amount = Number(form.amount);
    if (!amount || amount <= 0) {
      toast.error("Enter a positive amount");
      setIsSubmitting(false);
      return;
    }
    if (form.fromAccountId === form.toAccountId) {
      toast.error("Choose two different accounts");
      setIsSubmitting(false);
      return;
    }

    const currentBal = b.balances.get(form.fromAccountId) ?? 0;
    if (totalDebit > currentBal) {
      toast.error(`Insufficient balance in ${b.accountName(form.fromAccountId)}. Available: ${b.money(currentBal)}`);
      setIsSubmitting(false);
      return;
    }

    setConfirmOpen(true);
  };

  return (
    <AppLayout>
      <PageHeader title="Transfer" subtitle="Move money between your accounts" />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <Panel title="New transfer">
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">From</Label>
              <select
                className={selectCls}
                name="fromAccountId"
                value={form.fromAccountId}
                onChange={handleFormChange}
              >
                {accounts.filter(a => a.id !== form.toAccountId).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} — {b.money(b.balances.get(a.id) ?? 0)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-center">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-primary-soft text-primary">
                <ArrowLeftRight className="h-4 w-4" />
              </span>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">To</Label>
              <select
                className={selectCls}
                name="toAccountId"
                value={form.toAccountId}
                onChange={handleFormChange}
              >
                {accounts.filter(a => a.id !== form.fromAccountId).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} — {b.money(b.balances.get(a.id) ?? 0)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Amount (৳)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                name="amount"
                placeholder="0"
                value={form.amount}
                onChange={handleFormChange}
              />
            </div>

            {Number(form.amount) > 0 && (
              <div className="space-y-2 rounded-lg bg-muted/50 p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Transfer Amount</span>
                  <span className="font-medium">{b.money(Number(form.amount))}</span>
                </div>
                {hasCharge && charge > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Transfer Charge</span>
                    <span className="font-medium">{b.money(charge)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-border/60 pt-2 font-semibold">
                  <span>Total to Debit</span>
                  <span className={totalDebit > (b.balances.get(form.fromAccountId) ?? 0) ? "text-danger" : ""}>
                    {b.money(totalDebit)}
                  </span>
                </div>
                {totalDebit > (b.balances.get(form.fromAccountId) ?? 0) && (
                  <p className="text-xs font-medium text-danger">
                    Insufficient balance in {b.accountName(form.fromAccountId)} — available {b.money(b.balances.get(form.fromAccountId) ?? 0)}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Date</Label>
              <Input type="date" name="date" value={form.date} onChange={handleFormChange} />
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Transferring..." : "Transfer money"}
            </Button>
          </form>
        </Panel>

        <Panel title="Transfer history">
          {transfers.length ? (
            <ul className="divide-y divide-border">
              {transfers.map((t) => (
                <li key={t.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3">
                  <div className="min-w-0">
                    <p className="flex min-w-0 items-center gap-2 text-sm font-semibold">
                      <span className="inline-flex items-center gap-1.5 truncate">
                        <AccountIcon accountId={t.fromAccountId} sizeClassName="h-4 w-4" />
                        {b.accountName(t.fromAccountId)}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="inline-flex items-center gap-1.5 truncate">
                        <AccountIcon accountId={t.toAccountId} sizeClassName="h-4 w-4" />
                        {b.accountName(t.toAccountId)}
                      </span>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {dayjs(t.date).format("DD MMM YYYY")}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-sm font-bold">{b.money(t.amount)}</span>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button aria-label="Delete transfer" className="rounded-lg p-2 text-muted-foreground transition hover:bg-danger-soft hover:text-danger">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this transfer?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently remove the transfer record and update account balances. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => {
                              deleteTransfer(t.id);
                              toast.success("Transfer removed");
                            }}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={ArrowLeftRight}
              title="No transfers yet"
              description="Transfers between wallets will appear here."
            />
          )}
        </Panel>

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Transfer</AlertDialogTitle>
              <AlertDialogDescription>
                <p>Please review the details before confirming the transfer.</p>
                <div className="mt-4 space-y-2 rounded-lg border border-border bg-muted/50 p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Transfer Charge</span>
                    <span className="font-medium">{b.money(charge)}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Total to Debit</span>
                    <span>{b.money(totalDebit)}</span>
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel onClick={() => setIsSubmitting(false)}>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleConfirmTransfer}>Confirm</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
