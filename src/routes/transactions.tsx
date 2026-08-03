import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { Pencil, Trash2, Search, Receipt, ArrowUpDown, FileDown } from "lucide-react";
import { AppLayout } from "@/layouts/AppLayout";
import { TransactionDialog } from "@/components/TransactionDialog";
import { ReportDialog } from "@/components/ReportDialog";
import { useFinance } from "@/context/FinanceContext";
import { useBalances } from "@/hooks/useBalances";
import { AccountIcon } from "@/components/AccountIcon";
import { inRange, type RangeKey } from "@/utils/finance";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PageHeader, Panel, EmptyState } from "@/components/ui-kit";
import type { Transaction } from "@/types";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { generatePdfReport } from "@/utils/pdfReport";

export const Route = createFileRoute("/transactions")({
  head: () => ({
    meta: [
      { title: "Transactions — Money Mate" },
      { name: "description", content: "Search, filter, edit and delete every income and expense record." },
      { property: "og:title", content: "Transactions — Money Mate" },
      { property: "og:description", content: "A complete searchable history of your money in and out." },
    ],
  }),
  component: TransactionsPage,
});

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

const RANGES: { key: RangeKey | "custom"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "year", label: "This Year" },
  { key: "custom", label: "Custom..." },
];

function TransactionsPage() {
  const { transactions, accounts, incomeCategories, expenseCategories, deleteTransaction, ready } = useFinance();
  const b = useBalances();

  const [query, setQuery] = useState("");
  const [range, setRange] = useState<RangeKey | "custom">("all");
  const [type, setType] = useState<"all" | "income" | "expense">("all");
  const [account, setAccount] = useState("all");
  const [category, setCategory] = useState("all");
  const [sortDesc, setSortDesc] = useState(true);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [open, setOpen] = useState(false);
  const [customFromDate, setCustomFromDate] = useState(dayjs().startOf("month").format("YYYY-MM-DD"));
  const [customToDate, setCustomToDate] = useState(dayjs().endOf("month").format("YYYY-MM-DD"));
  const [customRangeOpen, setCustomRangeOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Transaction | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  const isFiltered = query !== "" || range !== "all" || type !== "all" || account !== "all" || category !== "all";

  const clearFilters = () => {
    setQuery("");
    setRange("all");
    setType("all");
    setAccount("all");
    setCategory("all");
  };


  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return transactions
      .filter((t) => {
        if (range === "custom") {
          const txDate = dayjs(t.date);
          const fromDate = dayjs(customFromDate);
          const toDate = dayjs(customToDate);
          return txDate.isSameOrAfter(fromDate, 'day') && txDate.isSameOrBefore(toDate, 'day');
        }
        return inRange(t.date, range as RangeKey);
      })
      .filter((t) => type === "all" || t.type === type)
      .filter((t) => account === "all" || t.accountId === account)
      .filter((t) => category === "all" || t.category === category)
      .filter((t) => {
        if (!q) return true;
        const dateStr = dayjs(t.date).format("DD MMM YYYY").toLowerCase();
        const amountStr = t.amount.toString();
        const accountName = b.accountName(t.accountId).toLowerCase();
        return (
          t.title.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          dateStr.includes(q) ||
          accountName.includes(q) ||
          t.type.includes(q) ||
          amountStr.includes(q)
        );
      })
      .sort((a, c) => (sortDesc ? c.date.localeCompare(a.date) : a.date.localeCompare(c.date)));
  }, [transactions, query, range, customFromDate, customToDate, type, account, category, sortDesc]);

  // PDF generation for current filtered transactions
  const generatePDFDirect = async () => {
    if (!rows.length) {
      toast.error('No transactions to export');
      return;
    }
    const income = rows.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = rows.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    let from: string;
    let to = dayjs().format('YYYY-MM-DD');
    if (range === 'custom') {
      from = customFromDate;
      to = customToDate;
    } else if (range === 'all') {
      from = transactions.reduce((m, t) => (t.date < m ? t.date : m), dayjs().format('YYYY-MM-DD'));
      to = transactions.reduce((m, t) => (t.date > m ? t.date : m), from);
    } else if (range === 'today') {
      from = to;
    } else if (range === 'yesterday') {
      from = to = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
    } else if (range === 'week') {
      from = dayjs().startOf('week').format('YYYY-MM-DD');
    } else if (range === 'month') {
      from = dayjs().startOf('month').format('YYYY-MM-DD');
    } else {
      from = dayjs().startOf('year').format('YYYY-MM-DD');
    }

    await generatePdfReport({
      rows,
      type: type === 'all' ? 'both' : type,
      from,
      to,
      fileName: `transactions-${dayjs().format('YYYYMMDD-HHmm')}.pdf`,
      income,
      expense,
      accountName: (id) => b.accountName(id),
    });
    toast.success('PDF downloaded');
  };
  const selectCls =
    "h-10 rounded-lg border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40";

  return (
    <AppLayout>
      <PageHeader
        title="Transactions"
        subtitle={`${rows.length} record${rows.length === 1 ? "" : "s"}`}
        action={
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={generatePDFDirect}>
              <FileDown className="h-4 w-4" /> <span className="hidden sm:inline">PDF</span> Report
            </Button>
          </div>
        }
      />

      <Panel className="mb-4">
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search title or category"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-4">
            <Select
              value={range}
              onValueChange={(v: RangeKey | "custom") => {
                if (v === "custom") {
                  setCustomRangeOpen(true);
                } else {
                  setRange(v);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a range" />
              </SelectTrigger>
              <SelectContent>
                {RANGES.map((r) => <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <select className={selectCls} value={type} onChange={(e) => setType(e.target.value as typeof type)}>
              <option value="all">All types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
            <select className={selectCls} value={account} onChange={(e) => setAccount(e.target.value)}>
              <option value="all">All accounts</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <select className={selectCls} value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="all">All categories</option>
              {[...incomeCategories, ...expenseCategories]
                .filter((c, i, arr) => arr.indexOf(c) === i)
                .map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
            </select>
          </div>

          {isFiltered && (
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground hover:text-destructive" onClick={clearFilters}>
                <Trash2 className="h-3.5 w-3.5" /> Clear Filters
              </Button>
            </div>
          )}
        </div>
      </Panel>

      <Panel>
        {!ready ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState icon={Receipt} title="No transactions found" description="Try adjusting your filters or add a new record." />
        ) : (
          <div className="-mx-4 overflow-x-auto sm:mx-0">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-semibold">
                    <button className="inline-flex items-center gap-1" onClick={() => setSortDesc((s) => !s)}>
                      Date <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3 font-semibold">Title</th>
                  <th className="px-4 py-3 font-semibold">Account</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 text-right font-semibold">Amount</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id} className="border-b border-border/60 transition">
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {dayjs(t.date).format("DD MMM YYYY")}
                    </td>
                    <td className="max-w-[220px] truncate px-4 py-3 font-semibold capitalize">{t.title}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      <span className="inline-flex items-center gap-2">
                        <AccountIcon accountId={t.accountId} sizeClassName="h-4 w-4" />
                        {b.accountName(t.accountId)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground capitalize">{t.category}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-xs font-semibold capitalize",
                          t.type === "income" ? "bg-success-soft text-success" : "bg-danger-soft text-danger",
                        )}
                      >
                        {t.type}
                      </span>
                    </td>
                    <td
                      className={cn(
                        "whitespace-nowrap px-4 py-3 text-right font-bold",
                        t.type === "income" ? "text-success" : "text-danger",
                      )}
                    >
                      {t.type === "income" ? "+" : "-"}
                      {b.money(t.amount)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <button
                        aria-label="Edit"
                        className="rounded-lg p-2 text-muted-foreground transition"
                        onClick={() => {
                          setEditing(t);
                          setOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        aria-label="Delete"
                        className="rounded-lg p-2 text-muted-foreground transition"
                        onClick={() => setPendingDelete(t)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <TransactionDialog open={open} onOpenChange={setOpen} transaction={editing} />

      <ReportDialog open={reportOpen} onOpenChange={setReportOpen} />

      <CustomRangeDialog
        open={customRangeOpen}
        onOpenChange={setCustomRangeOpen}
        from={customFromDate}
        to={customToDate}
        onApply={(from, to) => {
          if (dayjs(from).isAfter(dayjs(to))) {
            toast.error("'From' date cannot be after 'To' date.");
            return;
          }
          setCustomFromDate(from);
          setCustomToDate(to);
          setRange("custom");
        }}
      />

      <AlertDialog open={!!pendingDelete} onOpenChange={(v) => !v && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              “{pendingDelete?.title}” will be removed permanently and account balances will update.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDelete) deleteTransaction(pendingDelete.id);
                setPendingDelete(null);
                toast.success("Transaction deleted");
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

import { useEffect } from "react";

function CustomRangeDialog({ open, onOpenChange, from, to, onApply }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  from: string;
  to: string;
  onApply: (from: string, to: string) => void;
}) {
  const [localFrom, setLocalFrom] = useState(from);
  const [localTo, setLocalTo] = useState(to);

  useEffect(() => {
    if (open) {
      setLocalFrom(from);
      setLocalTo(to);
    }
  }, [open, from, to]);

  const handleApply = () => {
    if (dayjs(localFrom).isAfter(dayjs(localTo))) {
      toast.error("'From' date cannot be after 'To' date.");
      return;
    }
    onApply(localFrom, localTo);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Select Custom Date Range</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-1.5"><Label>From</Label><Input type="date" value={localFrom} onChange={e => setLocalFrom(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>To</Label><Input type="date" value={localTo} onChange={e => setLocalTo(e.target.value)} /></div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleApply}>Apply Range</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
