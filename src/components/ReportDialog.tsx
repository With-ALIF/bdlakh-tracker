import { useState } from "react";
import dayjs from "dayjs";
import { FileDown } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
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
import { useBalances } from "@/hooks/useBalances";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type ReportType = "income" | "expense" | "both";

const PRESETS: { key: string; label: string; from: () => string; to: () => string }[] = [
  { key: "month", label: "This Month", from: () => dayjs().startOf("month").format("YYYY-MM-DD"), to: () => dayjs().format("YYYY-MM-DD") },
  { key: "last", label: "Last Month", from: () => dayjs().subtract(1, "month").startOf("month").format("YYYY-MM-DD"), to: () => dayjs().subtract(1, "month").endOf("month").format("YYYY-MM-DD") },
  { key: "year", label: "This Year", from: () => dayjs().startOf("year").format("YYYY-MM-DD"), to: () => dayjs().format("YYYY-MM-DD") },
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
  const [from, setFrom] = useState(dayjs().startOf("month").format("YYYY-MM-DD"));
  const [to, setTo] = useState(dayjs().format("YYYY-MM-DD"));

  const num = (n: number) =>
    new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);

  const generate = () => {
    if (dayjs(to).isBefore(dayjs(from))) {
      toast.error("End date must be after start date");
      return;
    }

    const rows = transactions
      .filter((t) => !dayjs(t.date).isBefore(from) && !dayjs(t.date).isAfter(to))
      .filter((t) => type === "both" || t.type === type)
      .sort((a, c) => a.date.localeCompare(c.date));

    if (!rows.length) {
      toast.error("No transactions in this range");
      return;
    }

    const income = rows.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expense = rows.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const title =
      type === "income" ? "Income Report" : type === "expense" ? "Expense Report" : "Income & Expense Report";

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("TakaBook", 40, 45);
    doc.setFontSize(13);
    doc.text(title, 40, 66);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(110);
    doc.text(
      `${dayjs(from).format("DD MMM YYYY")}  -  ${dayjs(to).format("DD MMM YYYY")}`,
      40,
      84,
    );
    doc.text(`Generated ${dayjs().format("DD MMM YYYY, hh:mm A")}`, 40, 98);
    doc.setTextColor(0);

    autoTable(doc, {
      startY: 118,
      head: [["Date", "Title", "Account", "Category", "Type", "Amount (Tk)"]],
      body: rows.map((t) => [
        dayjs(t.date).format("DD MMM YYYY"),
        t.title,
        b.accountName(t.accountId),
        t.category,
        t.type === "income" ? "Income" : "Expense",
        `${t.type === "income" ? "+" : "-"}${num(t.amount)}`,
      ]),
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: { 5: { halign: "right" } },
      margin: { left: 40, right: 40 },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let y = ((doc as any).lastAutoTable?.finalY ?? 118) + 24;
    if (y > 740) {
      doc.addPage();
      y = 60;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Summary", 40, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    let line = y + 18;
    doc.text(`Total records: ${rows.length}`, 40, line);
    if (type !== "expense") {
      line += 15;
      doc.text(`Total income: Tk ${num(income)}`, 40, line);
    }
    if (type !== "income") {
      line += 15;
      doc.text(`Total expense: Tk ${num(expense)}`, 40, line);
    }
    if (type === "both") {
      line += 15;
      doc.setFont("helvetica", "bold");
      doc.text(`Net balance: Tk ${num(income - expense)}`, 40, line);
    }

    doc.save(`takabook-${type}-report-${from}-to-${to}.pdf`);
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
