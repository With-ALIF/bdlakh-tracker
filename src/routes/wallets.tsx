import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Pencil, Trash2, Wallet, CircleDollarSign } from "lucide-react";
import { AppLayout } from "@/layouts/AppLayout";
import { PageHeader, Panel, EmptyState } from "@/components/ui-kit";
import { useFinance } from "@/context/FinanceContext";
import { useBalances } from "@/hooks/useBalances";
import { ACCOUNT_COLORS, ACCOUNT_ICONS } from "@/constants";
import { AccountIcon } from "@/components/AccountIcon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { toast } from "sonner";
import type { Account } from "@/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/wallets")({
  head: () => ({
    meta: [
      { title: "Wallets & Accounts — Money Mate" },
      { name: "description", content: "Manage Cash, Bkash, Nagad, Rocket and bank accounts with live balances." },
      { property: "og:title", content: "Wallets & Accounts — Money Mate" },
      { property: "og:description", content: "Add, edit and organise all of your money accounts in one place." },
    ],
  }),
  component: WalletsPage,
});

function WalletsPage() {
  const { accounts, addAccount, updateAccount, deleteAccount } = useFinance();
  const b = useBalances();
  const [editing, setEditing] = useState<Account | null>(null);
  const [open, setOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Account | null>(null);

  const [form, setForm] = useState({
    name: "",
    icon: "wallet",
    color: ACCOUNT_COLORS[0],
    type: "other",
    openingBalance: 0,
  });

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", icon: "wallet", color: ACCOUNT_COLORS[0], type: "other", openingBalance: 0 });
    setOpen(true);
  };

  const openEdit = (a: Account) => {
    setEditing(a);
    setForm({ name: a.name, icon: a.icon, color: a.color, type: a.type, openingBalance: a.openingBalance });
    setOpen(true);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Account name is required");
      return;
    }
    if (editing) {
      updateAccount(editing.id, { ...form, isDefault: editing.isDefault });
      toast.success("Account updated");
    } else {
      addAccount(form);
      toast.success("Account added");
    }
    setOpen(false);
  };

  return (
    <AppLayout>
      <PageHeader
        title="Wallets"
        subtitle={`${accounts.length} account${accounts.length === 1 ? "" : "s"}`}
        action={
          <Button className="gap-2" onClick={openNew}>
            <Plus className="h-4 w-4" /> New account
          </Button>
        }
      />

      <div className="card-surface mb-4 flex items-center gap-4 overflow-hidden p-5">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
          <CircleDollarSign className="h-6 w-6" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground">Total Balance</p>
          <p className="text-2xl font-bold tracking-tight">{b.money(b.total)}</p>
        </div>
      </div>

      {accounts.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={Wallet}
            title="No wallets yet"
            description="Click 'New account' above to create your first wallet."
          />
        </div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((a) => {
            return (
              <div key={a.id} className="card-surface animate-rise overflow-hidden p-5">
                <span className="mb-4 block h-1.5 w-12 rounded-full" style={{ backgroundColor: a.color }} />
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-xl p-1.5"
                      style={{ backgroundColor: `${a.color}1A`, color: a.color }}
                    >
                      <AccountIcon accountId={a.id} accountName={a.name} iconKey={a.icon} sizeClassName="h-6 w-6" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{a.name}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      aria-label="Edit account"
                      onClick={() => openEdit(a)}
                      className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    {!a.isDefault && (
                      <button
                        aria-label="Delete account"
                        onClick={() => setPendingDelete(a)}
                        className="rounded-lg p-2 text-muted-foreground transition hover:bg-danger-soft hover:text-danger"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="mt-5 text-2xl font-bold tracking-tight">
                  {b.money(b.balances.get(a.id) ?? 0)}
                </p>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit account" : "New account"}</DialogTitle>
            <DialogDescription>Give the account a name, icon and colour.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. City Bank" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Opening balance</Label>
              <Input
                type="number"
                step="0.01"
                value={form.openingBalance}
                onChange={(e) => setForm({ ...form, openingBalance: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Icon</Label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(ACCOUNT_ICONS).map(([key, Icon]) => (
                  <button
                    type="button"
                    key={key}
                    onClick={() => setForm({ ...form, icon: key })}
                    className={cn(
                      "grid h-10 w-10 place-items-center rounded-xl border border-border text-muted-foreground transition",
                      form.icon === key && "border-primary bg-primary-soft text-primary",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Colour</Label>
              <div className="flex flex-wrap gap-2">
                {ACCOUNT_COLORS.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setForm({ ...form, color: c })}
                    style={{ backgroundColor: c }}
                    className={cn(
                      "h-8 w-8 rounded-full ring-offset-2 transition",
                      form.color === c && "ring-2 ring-foreground",
                    )}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">{editing ? "Save changes" : "Add account"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={(v) => !v && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{pendingDelete?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              All transactions and transfers linked to this account will also be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDelete) deleteAccount(pendingDelete.id);
                setPendingDelete(null);
                toast.success("Account deleted");
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
