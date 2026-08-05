import { useState } from "react";
import dayjs from "dayjs";
import { FileDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFinance } from "@/context/FinanceContext";
import { now } from "@/lib/date";
import { useBalances } from "@/hooks/useBalances";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { generatePdfReport, type ReportType } from "@/utils/pdfReport";

const PRESETS: { key: string; label: string; from: () => string; to: () => string }[] = [
  { key: "month", label: "This Month", from: () => now().startOf("month").format("YYYY-MM-DD"), to: () => now().format("YYYY-MM-DD") },
  { key: "last", label: "Last Month", from: () => now().subtract(1, "month").startOf("month").format("YYYY-MM-DD"), to: () => now().subtract(1, "month").endOf("month").format("YYYY-MM-DD") },
  { key: "year", label: "This Year", from: () => now().startOf("year").format("YYYY-MM-DD"), to: () => now().format("YYYY-MM-DD") },
];

/** Generates an income / expense PDF report over a custom date range. */
export function ReportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { transactions } = useFinance();
  const b = useBalances();

  const [type, setType] = useState<ReportType>("both");
  const [from, setFrom] = useState(now().startOf("month").format("YYYY-MM-DD"));
  const [to, setTo] = useState(now().format("YYYY-MM-DD"));
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const allCategories = Array.from(new Set(transactions.map((t) => t.category))).sort();

  const generate = async () => {
    if (dayjs(to).isBefore(dayjs(from))) {
      toast.error("End date must be after start date");
      return;
    }

    const rows = transactions
      .filter((t) => !dayjs(t.date).isBefore(from) && !dayjs(t.date).isAfter(to))
      .filter((t) => type === "both" || t.type === type)
      .filter((t) => selectedCategories.length === 0 || selectedCategories.includes(t.category))
      .sort((a, c) => a.date.localeCompare(c.date));

    if (!rows.length) {
      toast.error("No transactions in this range");
      return;
    }

    const income = rows.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expense = rows.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

    await generatePdfReport({
      rows,
      type,
      from,
      to,
      fileName: `money-mate-${type}-report-${from}-to-${to}.pdf`,
      income,
      expense,
      accountName: (id) => b.accountName(id),
    });
    toast.success("PDF report downloaded");
    onOpenChange(false);
  };

  const opts: { key: ReportType; label: string }[] = [
    { key: "income", label: "Income only" },
    { key: "expense", label: "Expense only" },
    { key: "both", label: "Both" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Download PDF report</DialogTitle>
          <DialogDescription>Pick a report type and a custom date range.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Report type</Label>
            <div className="grid grid-cols-3 gap-2">
              {opts.map((o) => (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => setType(o.key)}
                  className={cn(
                    "rounded-xl border border-border px-3 py-2 text-xs font-semibold transition",
                    type === o.key
                      ? "border-primary bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Categories</Label>
            <div className="flex flex-wrap gap-2">
              {allCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() =>
                    setSelectedCategories((prev) =>
                      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
                    )
                  }
                  className={cn(
                    "rounded-xl border border-border px-3 py-2 text-xs font-semibold transition",
                    selectedCategories.includes(cat)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
            {selectedCategories.length > 0 && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedCategories([])}
                  className="rounded-xl border border-border px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-muted"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="rep-from">From</Label>
              <Input id="rep-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rep-to">To</Label>
              <Input id="rep-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => {
                  setFrom(p.from());
                  setTo(p.to());
                }}
                className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:bg-muted"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="gap-2" onClick={generate}>
            <FileDown className="h-4 w-4" /> Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
