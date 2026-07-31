import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import dayjs from "dayjs";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useFinance } from "@/context/FinanceContext";
import { useBalances } from "@/hooks/useBalances";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/constants";
import type { Transaction } from "@/types";
import { cn } from "@/lib/utils";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  amount: z.coerce.number({ invalid_type_error: "Amount is required" }).positive("Amount must be positive"),
  type: z.enum(["income", "expense"]),
  accountId: z.string().min(1, "Select an account"),
  category: z.string().min(1, "Select a category"),
  date: z.string().min(1, "Date is required"),
});

type FormValues = z.input<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** when provided the dialog edits an existing transaction */
  transaction?: Transaction | null;
}

export function TransactionDialog({ open, onOpenChange, transaction }: Props) {
  const { accounts, addTransaction, updateTransaction } = useFinance();
  const b = useBalances();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      amount: "" as unknown as number,
      type: "expense",
      accountId: accounts[0]?.id ?? "cash",
      category: "Food",
      date: dayjs().format("YYYY-MM-DD"),
    },
  });

  const type = form.watch("type");
  const categories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  useEffect(() => {
    if (!open) return;
    form.reset(
      transaction
        ? { ...transaction }
        : {
            title: "",
            amount: "" as unknown as number,
            type: "expense",
            accountId: accounts[0]?.id ?? "cash",
            category: "Food",
            date: dayjs().format("YYYY-MM-DD"),
          },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, transaction]);

  const onSubmit = form.handleSubmit((raw) => {
    const values = schema.parse(raw);

    if (values.type === "expense") {
      const currentBal = b.balances.get(values.accountId) ?? 0;
      const prevAmount = transaction && transaction.accountId === values.accountId && transaction.type === "expense" ? transaction.amount : 0;
      const available = currentBal + prevAmount;

      if (values.amount > available) {
        toast.error(`Insufficient balance in ${b.accountName(values.accountId)}. Available: ${b.money(available)}`);
        return;
      }
    }

    if (transaction) {
      updateTransaction(transaction.id, values);
      toast.success("Transaction updated");
    } else {
      addTransaction(values);
      toast.success("Transaction added");
    }
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{transaction ? "Edit transaction" : "Add transaction"}</DialogTitle>
          <DialogDescription className="font-bold text-primary">
            Record money {type === "income" ? "coming in to" : "going out of"} one of your accounts.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Type switch */}
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
            {(["expense", "income"] as const).map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => {
                  form.setValue("type", t);
                  form.setValue("category", t === "income" ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]);
                }}
                className={cn(
                  "rounded-lg py-2 text-sm font-semibold capitalize transition",
                  type === t
                    ? t === "income"
                      ? "bg-success text-success-foreground shadow-card"
                      : "bg-danger text-danger-foreground shadow-card"
                    : "text-muted-foreground",
                )}
              >
                {t}
              </button>
            ))}
          </div>

          <Field label="Title" error={form.formState.errors.title?.message}>
            <Input placeholder="e.g. Grocery shopping" {...form.register("title")} />
          </Field>

          <Field label="Amount (৳)" error={form.formState.errors.amount?.message}>
            <Input type="number" step="0.01" min="0" placeholder="0" {...form.register("amount")} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Account" error={form.formState.errors.accountId?.message}>
              <select
                className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                {...form.register("accountId")}
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Category" error={form.formState.errors.category?.message}>
              <select
                className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                {...form.register("category")}
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Date" error={form.formState.errors.date?.message}>
            <Input type="date" {...form.register("date")} />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{transaction ? "Save changes" : "Add transaction"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      {children}
      {error ? <p className="text-xs font-medium text-danger">{error}</p> : null}
    </div>
  );
}
