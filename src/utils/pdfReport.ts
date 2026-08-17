import dayjs from "dayjs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Transaction } from "@/types";

const LOGO_URL = "https://i.postimg.cc/LsGN35xY/moneymate.png";

const num = (n: number) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);

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

export type ReportType = "income" | "expense" | "both";

export type PdfReportOptions = {
  rows: Transaction[];
  type: ReportType;
  from: string;
  to: string;
  fileName: string;
  income: number;
  expense: number;
  accountName: (id: string) => string;
};

export async function generatePdfReport(o: PdfReportOptions) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  try {
    const fontUrl = "/fonts/NotoSansBengali.ttf";
    const resp = await fetch(fontUrl);
    const buffer = await resp.arrayBuffer();
    const uint8 = new Uint8Array(buffer);
    // Chunked base64 encoding — avoids call stack overflow on large buffers
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

  const BLUE: [number, number, number] = [37, 99, 235];
  const GREEN: [number, number, number] = [22, 163, 74];
  const RED: [number, number, number] = [220, 38, 38];
  const DARK: [number, number, number] = [15, 23, 42];
  const GRAY: [number, number, number] = [107, 114, 128];

  const title =
    o.type === "income" ? "Income Report" : o.type === "expense" ? "Expense Report" : "Income & Expense Report";

  doc.setFillColor(...BLUE);
  doc.rect(0, 0, pageWidth, 4, "F");

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
  doc.setFontSize(12);
  doc.setTextColor(...GRAY);
  doc.text(`${dayjs(o.to).format("MMM YYYY")} Report`, right, 31, { align: "right" });

  doc.setFont("NotoSansBengali", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...DARK);
  doc.text(title, left, 66);

  doc.setFont("NotoSansBengali", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  doc.text(`${dayjs(o.from).format("DD MMM")} to ${dayjs(o.to).format("DD MMM YYYY")}`, left, 82);

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(1);
  doc.line(left, 92, right, 92);

  const stats: { label: string; value: string; fill: [number, number, number]; text: [number, number, number] }[] = [
    { label: "Income", value: num(o.income), fill: [240, 253, 244], text: GREEN },
    { label: "Expense", value: num(o.expense), fill: [254, 242, 242], text: RED },
    { label: "Balance", value: num(o.income - o.expense), fill: [239, 246, 255], text: BLUE },
    { label: "Records", value: String(o.rows.length), fill: [245, 245, 245], text: DARK },
  ];
  const boxGap = 10;
  const boxW = (right - left - boxGap * (stats.length - 1)) / stats.length;
  const boxH = 48;
  const boxY = 106;
  stats.forEach((s, i) => {
    const x = left + i * (boxW + boxGap);
    doc.setFillColor(...s.fill);
    doc.roundedRect(x, boxY, boxW, boxH, 6, 6, "F");
    doc.setFont("NotoSansBengali", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text(s.label.toUpperCase(), x + 10, boxY + 17);
    doc.setFontSize(13);
    doc.setFont("NotoSansBengali", "bold");
    doc.setTextColor(...s.text);
    doc.text(s.value, x + 10, boxY + 36);
  });

  const colW = [75, 145, 105, 95];
  const amountW = right - left - colW.reduce((a, c) => a + c, 0);
  autoTable(doc, {
    startY: boxY + boxH + 14,
    head: [["Date", "Title", "Category", "Account", "Amount"]],
    body: o.rows.map((t) => [
      { content: fmtDate(t.date), styles: { textColor: GRAY } },
      { content: fixBengali(t.title), styles: {} },
      { content: fixBengali(t.category), styles: {} },
      { content: fixBengali(o.accountName(t.accountId)), styles: {} },
      {
        content: `${t.type === "income" ? "+" : "-"}${num(t.amount)}`,
        styles: { textColor: t.type === "income" ? GREEN : RED, fontStyle: "bold", halign: "right" },
      },
    ]),
    styles: { font: "NotoSansBengali", fontSize: 8.5, cellPadding: 6, textColor: DARK, lineColor: [241, 245, 249], lineWidth: 0.5 },
    headStyles: { fillColor: BLUE, textColor: 255, fontStyle: "bold", font: "NotoSansBengali", fontSize: 8.5 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: colW[0] },
      1: { cellWidth: colW[1] },
      2: { cellWidth: colW[2] },
      3: { cellWidth: colW[3] },
      4: { cellWidth: amountW, halign: "right" },
    },
    margin: { left, right },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = ((doc as any).lastAutoTable?.finalY ?? boxY + boxH + 14) + 10;


  const summaryRows = (o.type !== "expense" ? 1 : 0) + (o.type !== "income" ? 1 : 0) + (o.type === "both" ? 1 : 0);
  const summaryH = 28 + summaryRows * 18;
  const summaryY = Math.min(finalY + 18, pageHeight - 150);
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.75);
  doc.roundedRect(left, summaryY, right - left, summaryH, 6, 6, "FD");
  doc.setFont("NotoSansBengali", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...DARK);
  doc.text("SUMMARY", left + 14, summaryY + 22);

  doc.setFont("NotoSansBengali", "normal");
  doc.setFontSize(9.5);
  let sy = summaryY + 42;
  if (o.type !== "expense") {
    doc.setTextColor(...DARK);
    doc.setFont("NotoSansBengali", "bold");
    doc.text("Total Income", left + 14, sy);
    doc.setFont("NotoSansBengali", "normal");
    doc.setTextColor(...GREEN);
    doc.text(`Tk ${num(o.income)}`, right - 14, sy, { align: "right" });
    sy += 18;
  }
  if (o.type !== "income") {
    doc.setTextColor(...DARK);
    doc.setFont("NotoSansBengali", "bold");
    doc.text("Total Expense", left + 14, sy);
    doc.setFont("NotoSansBengali", "normal");
    doc.setTextColor(...RED);
    doc.text(`Tk ${num(o.expense)}`, right - 14, sy, { align: "right" });
    sy += 18;
  }
  if (o.type === "both") {
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.75);
    doc.line(left + 14, sy - 10, right - 14, sy - 10);
    doc.setFont("NotoSansBengali", "bold");
    doc.setTextColor(...DARK);
    doc.text("Net Balance", left + 14, sy);
    doc.setFont("NotoSansBengali", "normal");
    doc.setTextColor(...BLUE);
    doc.text(`Tk ${num(o.income - o.expense)}`, right - 14, sy, { align: "right" });
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.75);
    doc.line(left, pageHeight - 34, right, pageHeight - 34);
    doc.setFont("NotoSansBengali", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text(`Generated by TakaBook • ${dayjs().format("DD MMM YYYY, hh:mm A")}`, left, pageHeight - 20);
    doc.text(`Page ${i} of ${pageCount}`, right, pageHeight - 20, { align: "right" });
  }

  doc.save(`transaction-${dayjs().format('YYYY-MM-DD')}.pdf`);
}