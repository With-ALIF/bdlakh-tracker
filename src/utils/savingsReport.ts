import dayjs from "dayjs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { SavingsGoal, SavingContribution, SavingWithdrawal } from "@/types";
import type { GoalStats } from "@/utils/savings";

const LOGO_URL = "https://i.postimg.cc/LsGN35xY/moneymate.png";

const num = (n: number) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);

const money = (n: number) => `Tk ${num(n)}`;

const fmtDate = (d: string) => dayjs(d).format("DD MMM YYYY");

function fixBengali(text: string): string {
  if (!text) return "";
  const s = text
    .replace(/\u09CB/g, "\u09C7\u09BE")
    .replace(/\u09CC/g, "\u09C7\u09D7");
  return s.replace(/([\u0985-\u09B9](?:\u09CD[\u0985-\u09B9])*)([\u09BF\u09C7\u09C8])/g, "$2$1");
}

async function loadLogo(): Promise<string | null> {
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = LOGO_URL;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("logo load failed"));
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

export type SavingsReportOptions = {
  goal: SavingsGoal;
  stats: GoalStats;
  contributions: SavingContribution[];
  withdrawals: SavingWithdrawal[];
  accountName: (id: string) => string;
};

export async function generateSavingsReport(o: SavingsReportOptions) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  // Load Bengali font
  try {
    const fontUrl = "/fonts/NotoSansBengali.ttf";
    const resp = await fetch(fontUrl);
    const buffer = await resp.arrayBuffer();
    const uint8 = new Uint8Array(buffer);
    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < uint8.length; i += chunkSize) {
      binary += String.fromCharCode(...uint8.subarray(i, i + chunkSize));
    }
    const base64 = btoa(binary);
    doc.addFileToVFS("NotoSansBengali.ttf", base64);
    doc.addFont("NotoSansBengali.ttf", "NotoSansBengali", "normal");
    doc.addFont("NotoSansBengali.ttf", "NotoSansBengali", "bold");
    doc.setFont("NotoSansBengali", "normal");
  } catch (e) {
    console.warn("Failed to load Bengali font, falling back to default font.", e);
  }

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const left = 40;
  const right = pageWidth - 40;
  const contentW = right - left;

  const BLUE: [number, number, number] = [37, 99, 235];
  const GREEN: [number, number, number] = [22, 163, 74];
  const RED: [number, number, number] = [220, 38, 38];
  const DARK: [number, number, number] = [15, 23, 42];
  const GRAY: [number, number, number] = [107, 114, 128];
  const WARNING: [number, number, number] = [234, 179, 8];

  // ── Top accent bar ──
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, pageWidth, 4, "F");

  // ── Header: Logo + title ──
  const logo = await loadLogo();
  if (logo) {
    doc.addImage(logo, "PNG", left, 12, 30, 30);
  } else {
    doc.setFillColor(...BLUE);
    doc.roundedRect(left, 12, 30, 30, 7, 7, "F");
    doc.setFont("NotoSansBengali", "normal");
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text("M", left + 15, 31, { align: "center" });
  }

  doc.setFont("NotoSansBengali", "normal");
  doc.setFontSize(17);
  doc.setTextColor(...BLUE);
  doc.text("Money Mate", left + 38, 31);

  doc.setFont("NotoSansBengali", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...GRAY);
  doc.text("SAVINGS GOAL REPORT", right, 27, { align: "right" });

  // ── Goal name + subtitle ──
  doc.setFont("NotoSansBengali", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...DARK);
  doc.text(fixBengali(o.goal.name), left, 68);

  doc.setFont("NotoSansBengali", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  doc.text("Saving Progress Report", left, 82);

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(1);
  doc.line(left, 92, right, 92);

  // ── Goal Summary stat boxes ──
  let y = 106;
  const done = o.stats.status === "Completed";
  const statusLabel = o.stats.status;
  const statusColor: [number, number, number] =
    o.stats.status === "Completed"
      ? GREEN
      : o.stats.status === "Overdue"
        ? RED
        : o.stats.status === "On Track"
          ? GREEN
          : o.stats.status === "Slightly Behind"
            ? WARNING
            : RED;

  const summaryStats = [
    { label: "Target Amount", value: money(o.goal.targetAmount), fill: [239, 246, 255] as [number, number, number], text: BLUE },
    { label: "Saved Amount", value: money(o.stats.saved), fill: [240, 253, 244] as [number, number, number], text: GREEN },
    { label: "Remaining", value: money(o.stats.remaining), fill: [254, 242, 242] as [number, number, number], text: RED },
  ];
  const boxGap = 10;
  const boxW = (contentW - boxGap * (summaryStats.length - 1)) / summaryStats.length;
  const boxH = 48;
  summaryStats.forEach((s, i) => {
    const x = left + i * (boxW + boxGap);
    doc.setFillColor(...s.fill);
    doc.roundedRect(x, y, boxW, boxH, 6, 6, "F");
    doc.setFont("NotoSansBengali", "bold");
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text(s.label.toUpperCase(), x + 10, y + 17);
    doc.setFontSize(13);
    doc.setFont("NotoSansBengali", "bold");
    doc.setTextColor(...s.text);
    doc.text(s.value, x + 10, y + 36);
  });

  // ── Progress / Deadline / Status row ──
  y += boxH + 12;
  const infoStats = [
    { label: "Progress", value: `${o.stats.progress.toFixed(1)}%` },
    { label: "Deadline", value: o.goal.deadline ? fmtDate(o.goal.deadline) : "No deadline" },
    { label: "Status", value: statusLabel },
  ];
  const infoBoxW = (contentW - boxGap * 2) / 3;
  infoStats.forEach((s, i) => {
    const x = left + i * (infoBoxW + boxGap);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, y, infoBoxW, 38, 5, 5, "F");
    doc.setFont("NotoSansBengali", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text(s.label.toUpperCase(), x + 10, y + 15);
    doc.setFont("NotoSansBengali", "bold");
    doc.setFontSize(11);
    const color = i === 2 ? statusColor : DARK;
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(s.value, x + 10, y + 30);
  });

  // ── Progress bar ──
  y += 50;
  const barH = 10;
  doc.setFillColor(226, 232, 240);
  doc.roundedRect(left, y, contentW, barH, 4, 4, "F");
  const barColor = done ? GREEN : o.stats.overdue ? RED : o.stats.onTrack ? BLUE : WARNING;
  const filledW = Math.max(contentW * (o.stats.progress / 100), o.stats.saved > 0 ? 8 : 0);
  if (filledW > 0) {
    doc.setFillColor(...barColor);
    doc.roundedRect(left, y, Math.min(filledW, contentW), barH, 4, 4, "F");
  }
  doc.setFont("NotoSansBengali", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...DARK);
  doc.text(`${o.stats.progress.toFixed(1)}%`, right, y + barH + 12, { align: "right" });

  y += barH + 20;

  // ── Divider ──
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.75);
  doc.line(left, y, right, y);
  y += 16;

  // ── Saving Summary section ──
  doc.setFont("NotoSansBengali", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...DARK);
  doc.text("SAVING SUMMARY", left, y);
  y += 16;

  const contribs = o.contributions;
  const withdraws = o.withdrawals;
  const totalContribs = contribs.length;
  const totalWithdrawals = withdraws.length;
  const avgContrib = totalContribs > 0 ? o.stats.saved / totalContribs : 0;
  const largestContrib = totalContribs > 0 ? Math.max(...contribs.map((c) => c.amount)) : 0;
  const totalWithdrawn = withdraws.reduce((s, w) => s + w.amount, 0);
  const sortedByDate = [...contribs].sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf());
  const firstDate = sortedByDate.length ? fmtDate(sortedByDate[0].date) : "—";
  const lastDate = sortedByDate.length ? fmtDate(sortedByDate[sortedByDate.length - 1].date) : "—";

  const summaryItems = [
    { label: "Total Contributions", value: String(totalContribs) },
    { label: "Total Withdrawals", value: String(totalWithdrawals) },
    { label: "Total Withdrawn", value: money(totalWithdrawn) },
    { label: "Average Contribution", value: money(avgContrib) },
    { label: "Largest Contribution", value: money(largestContrib) },
    { label: "First Saving", value: firstDate },
    { label: "Last Saving", value: lastDate },
  ];

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.75);
  const summaryBoxH = 12 + summaryItems.length * 18 + 8;
  doc.roundedRect(left, y, contentW, summaryBoxH, 6, 6, "FD");

  doc.setFont("NotoSansBengali", "normal");
  doc.setFontSize(9);
  let sy = y + 18;
  summaryItems.forEach((item) => {
    doc.setTextColor(...DARK);
    doc.text(item.label, left + 14, sy);
    doc.setTextColor(...GRAY);
    doc.text(item.value, right - 14, sy, { align: "right" });
    sy += 18;
  });

  y += summaryBoxH + 16;

  // ── Check if we need a new page ──
  const checkPage = (needed: number) => {
    if (y + needed > pageHeight - 60) {
      doc.addPage();
      y = 40;
    }
  };

  // ── Saving History table ──
  checkPage(60);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.75);
  doc.line(left, y, right, y);
  y += 16;

  doc.setFont("NotoSansBengali", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...DARK);
  doc.text("SAVING HISTORY", left, y);
  y += 10;

  type HistoryRow = { date: string; type: string; wallet: string; amount: string; isWithdrawal: boolean };
  const allRows: HistoryRow[] = [
    ...contribs.map((c) => ({
      date: c.date,
      type: "Saving",
      wallet: c.walletId ? o.accountName(c.walletId) : "—",
      amount: money(c.amount),
      isWithdrawal: false,
    })),
    ...withdraws.map((w) => ({
      date: w.date,
      type: `${w.reason} Withdrawal`,
      wallet: w.walletId ? o.accountName(w.walletId) : "—",
      amount: money(w.amount),
      isWithdrawal: true,
    })),
  ].sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf());

  autoTable(doc, {
    startY: y,
    head: [["Date", "Type", "Wallet", "Amount"]],
    body: allRows.map((row) => [
      { content: fmtDate(row.date), styles: { textColor: GRAY } },
      { content: row.type, styles: { textColor: row.isWithdrawal ? RED : GREEN, fontStyle: "bold" as const } },
      { content: fixBengali(row.wallet), styles: {} },
      { content: (row.isWithdrawal ? "− " : "+ ") + row.amount, styles: { textColor: row.isWithdrawal ? RED : GREEN, fontStyle: "bold" as const } },
    ]),
    tableLineWidth: 1.5,
    tableLineColor: [148, 163, 184],
    styles: {
      font: "NotoSansBengali",
      fontSize: 8.5,
      cellPadding: 6,
      textColor: DARK,
      lineColor: [203, 213, 225],
      lineWidth: 1,
    },
    headStyles: {
      fillColor: BLUE,
      textColor: 255,
      fontStyle: "bold",
      font: "NotoSansBengali",
      fontSize: 8.5,
      lineWidth: 1,
      lineColor: [37, 99, 235],
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left, right: 40 },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = ((doc as any).lastAutoTable?.finalY ?? y) + 16;

  // ── Saving Plan section ──
  checkPage(100);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.75);
  doc.line(left, y, right, y);
  y += 16;

  doc.setFont("NotoSansBengali", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...DARK);
  doc.text("SAVING PLAN", left, y);
  y += 12;

  const planItems = [
    { label: "Required Monthly Saving", value: done ? money(0) : money(o.stats.requiredMonthly) },
    { label: "Required Daily Saving", value: done ? money(0) : money(o.stats.requiredDaily) },
    { label: "Days Remaining", value: String(o.stats.daysLeft) },
  ];

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  const planBoxH = 12 + planItems.length * 18 + 8;
  doc.roundedRect(left, y, contentW, planBoxH, 6, 6, "FD");

  doc.setFont("NotoSansBengali", "normal");
  doc.setFontSize(9);
  sy = y + 18;
  planItems.forEach((item) => {
    doc.setTextColor(...DARK);
    doc.text(item.label, left + 14, sy);
    doc.setFont("NotoSansBengali", "bold");
    doc.setTextColor(...BLUE);
    doc.text(item.value, right - 14, sy, { align: "right" });
    doc.setFont("NotoSansBengali", "normal");
    sy += 18;
  });

  y += planBoxH + 16;

  // ── Saving Insight section ──
  checkPage(80);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.75);
  doc.line(left, y, right, y);
  y += 16;

  doc.setFont("NotoSansBengali", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...DARK);
  doc.text("SAVING INSIGHT", left, y);
  y += 12;

  // Build dynamic insight text
  const insight = `Status: ${o.stats.status} (${o.stats.progressPercentage.toFixed(1)}%). ${o.stats.statusMessage.description}`;

  doc.setFillColor(239, 246, 255);
  doc.setDrawColor(191, 219, 254);
  const insightLines = doc.splitTextToSize(insight, contentW - 28);
  const insightBoxH = 16 + insightLines.length * 14 + 10;
  doc.roundedRect(left, y, contentW, insightBoxH, 6, 6, "FD");

  doc.setFont("NotoSansBengali", "normal");
  doc.setFontSize(9);
  doc.setTextColor(30, 64, 175);
  doc.text(insightLines, left + 14, y + 18);

  // ── Footer on all pages ──
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.75);
    doc.line(left, pageHeight - 34, right, pageHeight - 34);
    doc.setFont("NotoSansBengali", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text(
      `Generated on: ${dayjs().format("DD MMM YYYY")}  •  MoneyMate • Personal Finance Manager`,
      left,
      pageHeight - 20,
    );
    doc.text(`Page ${i} of ${pageCount}`, right, pageHeight - 20, { align: "right" });
  }

  doc.save(`savings-${o.goal.name.replace(/\s+/g, "-").toLowerCase()}-${dayjs().format("YYYY-MM-DD")}.pdf`);
}
