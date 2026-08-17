import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { ArrowLeftRight, ArrowUpDown, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/layouts/AppLayout";
import { PageHeader, Panel, EmptyState } from "@/components/ui-kit";
import { useFinance } from "@/context/FinanceContext";
import { useSavings } from "@/context/SavingsContext";
import { useBalances } from "@/hooks/useBalances";
import { today } from "@/lib/date";
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
import { cn } from "@/lib/utils";
import type { Transfer, TransferCharge } from "@/types";

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

function calculateTransferCharge(
  fromAccountId: string,
  toAccountId: string,
  amount: number,
  getAccountName: (id: string) => string | undefined,
  getProviderId: (id: string) => string | undefined,
  dbCharges: TransferCharge[],
  isSuperAgent: boolean = false,
) {
  if (amount <= 0) {
    return { charge: 0, totalDebit: amount, hasCharge: false };
  }

  const fromProviderId = getProviderId(fromAccountId);
  const toProviderId = getProviderId(toAccountId);

  if (!fromProviderId || !toProviderId) {
    return { charge: 0, totalDebit: amount, hasCharge: false };
  }

  const dbCharge = dbCharges.find(
    (c) =>
      c.fromProvider === fromProviderId &&
      c.toProvider === toProviderId &&
      c.isSuperAgent === isSuperAgent,
  );

  if (!dbCharge) {
    return { charge: 0, totalDebit: amount, hasCharge: false };
  }

  const percentageCharge = Math.round(amount * (dbCharge.chargeRate / 100) * 100) / 100;
  const flatFee = dbCharge.flatFee || 0;
  const charge = Math.round((percentageCharge + flatFee) * 100) / 100;
  return { charge, totalDebit: amount + charge, hasCharge: true };
}

function TransferPage() {
  const { accounts, transfers, addTransfer, addTransaction, deleteTransfer, transferCharges } = useFinance();
  const { goals, addContribution } = useSavings();
  const b = useBalances();

  const transferableAccounts = useMemo(
    () => accounts.filter((a) => a.type !== "savings"),
    [accounts],
  );

  const [form, setForm] = useState({
    fromAccountId: transferableAccounts[0]?.id ?? accounts[0]?.id ?? "",
    toAccountId: accounts.find((a) => a.id !== (transferableAccounts[0]?.id ?? ""))?.id ?? "",
    amount: "",
    date: today(),
    isSuperAgent: false as boolean,
    chargeType: "auto" as "auto" | "custom",
    customCharge: "",
    goalId: "",
    note: "",
  });

  useEffect(() => {
    if (accounts.length > 0) {
      setForm((prev) => {
        const fromId =
          prev.fromAccountId && accounts.some((a) => a.id === prev.fromAccountId && a.type !== "savings")
            ? prev.fromAccountId
            : transferableAccounts[0]?.id || accounts[0]?.id || "";
        let toId = prev.toAccountId || accounts.find((a) => a.id !== fromId)?.id || "";
        if (toId === fromId) {
          const other = accounts.find((a) => a.id !== fromId);
          toId = other?.id || toId;
        }
        return {
          ...prev,
          fromAccountId: fromId,
          toAccountId: toId,
        };
      });
    }
  }, [accounts]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Transfer | null>(null);
  const [sortDesc, setSortDesc] = useState(false);

  const displayedTransfers = useMemo(() => {
    return [...transfers].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortDesc ? dateB - dateA : dateA - dateB;
    });
  }, [transfers, sortDesc]);

  const PAGE_SIZE = 5;
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(displayedTransfers.length / PAGE_SIZE);
  const pagedTransfers = displayedTransfers.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  useEffect(() => { setPage(0); }, [transfers, sortDesc]);

  const fromAccount = accounts.find((a) => a.id === form.fromAccountId);
  const toAccount = accounts.find((a) => a.id === form.toAccountId);
  const toIsSavings = toAccount?.type === "savings";
  const BKASH_ID = "a0000000-0000-0000-0000-000000000002";
  const CASH_ID = "a0000000-0000-0000-0000-000000000001";
  const isBkashToCash =
    fromAccount?.providerId === BKASH_ID &&
    toAccount?.providerId === CASH_ID;
  const showSuperAgent = isBkashToCash;

  const { charge: autoCharge, totalDebit: autoTotalDebit, hasCharge: autoHasCharge } = useMemo(
    () => calculateTransferCharge(
      form.fromAccountId,
      form.toAccountId,
      Number(form.amount) || 0,
      b.accountName,
      (id) => accounts.find((a) => a.id === id)?.providerId,
      transferCharges,
      form.isSuperAgent,
    ),
    [form.fromAccountId, form.toAccountId, form.amount, b.accountName, accounts, transferCharges, form.isSuperAgent],
  );

  const charge = form.chargeType === "custom" ? (Number(form.customCharge) || 0) : autoCharge;
  const totalDebit = (Number(form.amount) || 0) + charge;
  const hasCharge = form.chargeType === "custom" ? charge > 0 : autoHasCharge;

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "fromAccountId" || name === "toAccountId") {
        let from = name === "fromAccountId" ? value : prev.fromAccountId;
        let to = name === "toAccountId" ? value : prev.toAccountId;

        if (from === to) {
          if (name === "fromAccountId") {
            to = prev.fromAccountId;
          } else {
            from = prev.toAccountId;
          }
          if (accounts.find((a) => a.id === from)?.type === "savings") {
            const other = accounts.find((a) => a.id !== to && a.id !== from && a.type !== "savings");
            from = other?.id ?? from;
          }
          if (from === to) {
            const other = accounts.find((a) => a.id !== from && a.type !== "savings");
            if (other) {
              if (name === "fromAccountId") to = other.id;
              else from = other.id;
            }
          }
        }

        next.fromAccountId = from;
        next.toAccountId = to;

        const fromAcc = accounts.find((a) => a.id === from);
        const toAcc = accounts.find((a) => a.id === to);
        const isBkashCash =
          fromAcc?.providerId === BKASH_ID &&
          toAcc?.providerId === CASH_ID;
        if (!isBkashCash) next.isSuperAgent = false;
        next.chargeType = "auto";
        next.customCharge = "";
      }
      return next;
    });
  };

  const selectCls =
    "h-10 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40";

  const handleConfirmTransfer = async () => {
    const amount = Number(form.amount);

    if (toIsSavings) {
      const ok = await addContribution({
        goalId: form.goalId,
        walletId: form.fromAccountId,
        amount,
        date: form.date,
        note: form.note.trim() || undefined,
      });
      if (!ok) {
        toast.error("Could not save this saving");
        setIsSubmitting(false);
        setConfirmOpen(false);
        return;
      }
      setForm({ ...form, amount: "", isSuperAgent: false, chargeType: "auto", customCharge: "", goalId: "", note: "" });
      toast.success("Saving added");
      setIsSubmitting(false);
      setConfirmOpen(false);
      return;
    }

    addTransfer({
      fromAccountId: form.fromAccountId,
      toAccountId: form.toAccountId,
      amount,
      date: form.date,
    });

    if (charge > 0) {
      const txCreated = await addTransaction({
        type: "expense",
        amount: charge,
        date: form.date,
        accountId: form.fromAccountId,
        category: "Transfer Charge",
        title: `Transfer Charge from ${b.accountName(form.fromAccountId)}`,
      });
      if (!txCreated) {
        toast.error("Charge transaction failed to save");
      }
    }

    setForm({ ...form, amount: "", isSuperAgent: false, chargeType: "auto", customCharge: "", goalId: "", note: "" });
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
    if (fromAccount?.type === "savings") {
      toast.error("Transfers from a savings wallet are not allowed");
      setIsSubmitting(false);
      return;
    }
    if (toIsSavings && !form.goalId) {
      toast.error("Choose a savings goal for this saving");
      setIsSubmitting(false);
      return;
    }
    if (toIsSavings && !form.note.trim()) {
      toast.error("Add a note for this saving");
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

      <div className="grid gap-4 overflow-hidden lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <div className="min-w-0">
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
                {accounts.filter((a) => a.type !== "savings").sort((a, b) => a.name.localeCompare(b.name)).map((a) => (
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
                {accounts.filter(a => a.id !== form.fromAccountId).sort((a, b) => a.name.localeCompare(b.name)).map((a) => (
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

            {toIsSavings && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">
                    Savings Goal <span className="text-danger">*</span>
                  </Label>
                  <select
                    className={selectCls}
                    name="goalId"
                    value={form.goalId}
                    onChange={handleFormChange}
                  >
                    <option value="">Select a goal</option>
                    {goals.filter((g) => g.status !== "cancelled").map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">
                    Note <span className="text-danger">*</span>
                  </Label>
                  <Input
                    type="text"
                    name="note"
                    placeholder="e.g. Monthly savings"
                    value={form.note}
                    onChange={handleFormChange}
                  />
                  <p className="text-xs text-muted-foreground">
                    <span className="text-danger">* Required when saving into your Savings Wallet</span>
                  </p>
                </div>
              </>
            )}

            {showSuperAgent && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-indigo-600">Super Agent</p>
                <div className="grid grid-cols-2 gap-2">
                  {(["Yes", "No"] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setForm({ ...form, isSuperAgent: opt === "Yes" })}
                      className={cn(
                        "rounded-xl border py-2.5 text-sm font-semibold transition",
                        (opt === "Yes" ? form.isSuperAgent : !form.isSuperAgent)
                          ? "border-indigo-500 bg-indigo-500/10 text-indigo-600"
                          : "border-border text-muted-foreground hover:bg-muted",
                      )}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                {form.isSuperAgent && (
                  <p className="text-xs text-muted-foreground">1.395% charge will apply</p>
                )}
              </div>
            )}

            {autoHasCharge && autoCharge > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Transfer Charge</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, chargeType: "auto", customCharge: "" })}
                    className={cn(
                      "rounded-xl border py-2.5 text-sm font-semibold transition",
                      form.chargeType === "auto"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-muted",
                    )}
                  >
                    Auto — {b.money(autoCharge)}
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, chargeType: "custom", customCharge: "0" })}
                    className={cn(
                      "rounded-xl border py-2.5 text-sm font-semibold transition",
                      form.chargeType === "custom"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-muted",
                    )}
                  >
                    No Charge — ৳0
                  </button>
                </div>
              </div>
            )}

            {Number(form.amount) > 0 && (
              <div className="space-y-2 rounded-lg bg-muted/50 p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Transfer Amount</span>
                  <span className="font-medium">{b.money(Number(form.amount))}</span>
                </div>
                {(autoHasCharge || form.chargeType === "custom") && (
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
        </div>

        <div className="min-w-0">
          <Panel title="Transfer history">
          {transfers.length ? (
            <>
              {/* Responsive table — horizontal scroll on small screens */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-3 font-semibold">
                        <button className="inline-flex items-center gap-1" onClick={() => setSortDesc((s) => !s)}>
                          Date <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </th>
                      <th className="px-4 py-3 font-semibold">From</th>
                      <th className="px-4 py-3 font-semibold">To</th>
                      <th className="px-4 py-3 text-right font-semibold">Amount</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {pagedTransfers.map((t) => (
                      <tr key={t.id} className="border-b border-border/60 transition hover:bg-muted/40">
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {dayjs(t.date).format("DD MMM YYYY")}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-semibold">
                          <span className="inline-flex items-center gap-2">
                            <AccountIcon accountId={t.fromAccountId} sizeClassName="h-4 w-4" />
                            {b.accountName(t.fromAccountId)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-semibold">
                          <span className="inline-flex items-center gap-2">
                            <AccountIcon accountId={t.toAccountId} sizeClassName="h-4 w-4" />
                            {b.accountName(t.toAccountId)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-bold">
                          {b.money(t.amount)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">
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
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {page + 1} / {totalPages}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          ) : (
            <EmptyState
              icon={ArrowLeftRight}
              title="No transfers yet"
              description="Transfers between wallets will appear here."
            />
          )}
          </Panel>
        </div>

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Transfer</AlertDialogTitle>
              <AlertDialogDescription>
                Please review the details before confirming the transfer.
              </AlertDialogDescription>
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
            </AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel onClick={() => setIsSubmitting(false)}>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleConfirmTransfer}>Confirm</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}