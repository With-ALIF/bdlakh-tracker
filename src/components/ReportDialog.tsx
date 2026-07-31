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
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const left = 40;
    const right = pageWidth - 40;
    const title =
      type === "income" ? "Income Report" : type === "expense" ? "Expense Report" : "Income & Expense Report";
    const period = dayjs(to).format("MMM YYYY");
    const fmtDate = (d: string) => dayjs(d).format("DD MMM YYYY");

    const BLUE: [number, number, number] = [37, 99, 235];
    const GREEN: [number, number, number] = [22, 163, 74];
    const RED: [number, number, number] = [220, 38, 38];
    const DARK: [number, number, number] = [15, 23, 42];
    const GRAY: [number, number, number] = [107, 114, 128];

    // --- Header (page 1) ---
    doc.setFillColor(...BLUE);
    doc.rect(0, 0, pageWidth, 4, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);
    doc.setTextColor(...BLUE);
    doc.text("Money Mate", left, 44);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...GRAY);
    doc.text(`${period} Report`, right, 44, { align: "right" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...DARK);
    doc.text(title, left, 66);

    doc.setFont("helvetica", "normal");``
    doc.setFontSize(9);
    doc.setTextColor(...GRAY);
    doc.text(`${fmtDate(from)} to  ${fmtDate(to)}`, left, 82);

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(1);
    doc.line(left, 92, right, 92);

    // --- Summary stat boxes ---
    const stats: { label: string; value: string; fill: [number, number, number]; text: [number, number, number] }[] = [
      { label: "Income", value: num(income), fill: [240, 253, 244], text: GREEN },
      { label: "Expense", value: num(expense), fill: [254, 242, 242], text: RED },
      { label: "Balance", value: num(income - expense), fill: [239, 246, 255], text: BLUE },
      { label: "Records", value: String(rows.length), fill: [245, 245, 245], text: DARK },
    ];
    const boxGap = 10;
    const boxW = (right - left - boxGap * (stats.length - 1)) / stats.length;
    const boxH = 48;
    const boxY = 106;
    stats.forEach((s, i) => {
      const x = left + i * (boxW + boxGap);
      doc.setFillColor(...s.fill);
      doc.roundedRect(x, boxY, boxW, boxH, 6, 6, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(...GRAY);
      doc.text(s.label.toUpperCase(), x + 10, boxY + 17);
      doc.setFontSize(13);
      doc.setTextColor(...s.text);
      doc.text(s.value, x + 10, boxY + 36);
    });

    // --- Transactions table ---
    const colW = [75, 145, 105, 95];
    const amountW = right - left - colW.reduce((a, b) => a + b, 0);
    autoTable(doc, {
      startY: boxY + boxH + 14,
      head: [["Date", "Title", "Category", "Account", "Amount"]],
      body: rows.map((t) => [
        fmtDate(t.date),
        t.title,
        t.category,
        b.accountName(t.accountId),
        `${t.type === "income" ? "+" : "-"}${num(t.amount)}`,
      ]),
      styles: { fontSize: 8.5, cellPadding: 6, textColor: DARK, lineColor: [241, 245, 249], lineWidth: 0.5 },
      headStyles: { fillColor: BLUE, textColor: 255, fontStyle: "bold", fontSize: 8.5 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: colW[0], textColor: GRAY },
        1: { cellWidth: colW[1] },
        2: { cellWidth: colW[2] },
        3: { cellWidth: colW[3] },
        4: { cellWidth: amountW, halign: "right" },
      },
      margin: { left, right },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const finalY = ((doc as any).lastAutoTable?.finalY ?? boxY + boxH + 14) + 10;

    // --- Summary block ---
    const summaryH = 76;
    const summaryY = Math.min(finalY + 18, pageHeight - 150);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.75);
    doc.roundedRect(left, summaryY, right - left, summaryH, 6, 6, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...DARK);
    doc.text("SUMMARY", left + 14, summaryY + 20);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    let sy = summaryY + 40;
    if (type !== "expense") {
      doc.setTextColor(...DARK);
      doc.text("Total Income", left + 14, sy);
      doc.setTextColor(...GREEN);
      doc.text(`Tk ${num(income)}`, right - 14, sy, { align: "right" });
      sy += 16;
    }
    if (type !== "income") {
      doc.setTextColor(...DARK);
      doc.text("Total Expense", left + 14, sy);
      doc.setTextColor(...RED);
      doc.text(`Tk ${num(expense)}`, right - 14, sy, { align: "right" });
      sy += 16;
    }
    if (type === "both") {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...DARK);
      doc.text("Net Balance", left + 14, sy);
      doc.setTextColor(...BLUE);
      doc.text(`Tk ${num(income - expense)}`, right - 14, sy, { align: "right" });
    }

    // --- Footer on every page ---
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.75);
      doc.line(left, pageHeight - 34, right, pageHeight - 34);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...GRAY);
      doc.text(`Generated by TakaBook • ${dayjs().format("DD MMM YYYY, hh:mm A")}`, left, pageHeight - 20);
      doc.text(`Page ${i} of ${pageCount}`, right, pageHeight - 20, { align: "right" });
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
