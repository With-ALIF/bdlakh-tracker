import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/transfer")({
  head: () => ({
    meta: [
      { title: "Transfer Money — TakaBook" },
      { name: "description", content: "Move money between Cash, bKash, Nagad, Rocket and your bank account." },
      { property: "og:title", content: "Transfer Money — TakaBook" },
      { property: "og:description", content: "Record internal transfers and keep every wallet balance accurate." },
    ],
  }),
  component: TransferPage,
});

function TransferPage() {
  const { accounts, transfers, addTransfer, deleteTransfer } = useFinance();
  const b = useBalances();

  const [form, setForm] = useState({
    fromAccountId: accounts[0]?.id ?? "cash",
    toAccountId: accounts[1]?.id ?? "bkash",
    amount: "",
    date: dayjs().format("YYYY-MM-DD"),
    note: "",
  });

  const selectCls =
    "h-10 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!amount || amount <= 0) return toast.error("Enter a positive amount");
    if (form.fromAccountId === form.toAccountId) return toast.error("Choose two different accounts");
    addTransfer({
      fromAccountId: form.fromAccountId,
      toAccountId: form.toAccountId,
      amount,
      date: form.date,
      note: form.note,
    });
    setForm({ ...form, amount: "", note: "" });
    toast.success("Transfer saved");
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
                value={form.fromAccountId}
                onChange={(e) => setForm({ ...form, fromAccountId: e.target.value })}
              >
                {accounts.map((a) => (
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
                value={form.toAccountId}
                onChange={(e) => setForm({ ...form, toAccountId: e.target.value })}
              >
                {accounts.map((a) => (
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
                placeholder="0"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Date</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Note</Label>
              <Textarea rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </div>
            <Button type="submit" className="w-full">
              Transfer money
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
                      {t.note ? ` · ${t.note}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-sm font-bold">{b.money(t.amount)}</span>
                    <button
                      aria-label="Delete transfer"
                      onClick={() => {
                        deleteTransfer(t.id);
                        toast.success("Transfer removed");
                      }}
                      className="rounded-lg p-2 text-muted-foreground transition hover:bg-danger-soft hover:text-danger"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
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
      </div>
    </AppLayout>
  );
}
