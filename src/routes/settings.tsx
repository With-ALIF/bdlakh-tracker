import { createFileRoute } from "@tanstack/react-router";
import { useRef } from "react";
import dayjs from "dayjs";
import { Download, Upload, Trash2, FileJson, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/layouts/AppLayout";
import { PageHeader, Panel } from "@/components/ui-kit";
import { useFinance } from "@/context/FinanceContext";
import { useBalances } from "@/hooks/useBalances";
import { downloadFile, toCSV } from "@/utils/finance";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { AppData } from "@/types";
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

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings & Backup — TakaBook" },
      { name: "description", content: "Export CSV or JSON, restore a backup, and manage your local data." },
      { property: "og:title", content: "Settings & Backup — TakaBook" },
      { property: "og:description", content: "Your data stays on this device — back it up any time." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const finance = useFinance();
  const { accounts, transactions, transfers, budgets, settings, updateSettings, replaceAll, resetAll } = finance;
  const b = useBalances();
  const fileRef = useRef<HTMLInputElement>(null);

  const exportJSON = () => {
    const data: AppData = { accounts, transactions, transfers, budgets, settings };
    downloadFile(`takabook-backup-${dayjs().format("YYYY-MM-DD")}.json`, JSON.stringify(data, null, 2), "application/json");
    toast.success("Backup downloaded");
  };

  const exportCSV = () => {
    if (!transactions.length) {
      toast.error("No transactions to export");
      return;
    }
    const rows = transactions.map((t) => ({
      Date: t.date,
      Title: t.title,
      Account: b.accountName(t.accountId),
      Category: t.category,
      Type: t.type,
      Amount: t.amount,
      Note: t.note ?? "",
    }));
    downloadFile(`takabook-transactions-${dayjs().format("YYYY-MM-DD")}.csv`, toCSV(rows), "text/csv");
    toast.success("CSV exported");
  };

  const restore = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as AppData;
        if (!parsed.accounts || !Array.isArray(parsed.transactions)) throw new Error("Invalid file");
        replaceAll({
          accounts: parsed.accounts,
          transactions: parsed.transactions,
          transfers: parsed.transfers ?? [],
          budgets: parsed.budgets ?? [],
          settings: { ...settings, ...(parsed.settings ?? {}) },
        });
        toast.success("Data restored");
      } catch {
        toast.error("Could not read that backup file");
      }
    };
    reader.readAsText(file);
  };

  return (
    <AppLayout>
      <PageHeader title="Settings" subtitle="Preferences, backup and data" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Preferences">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold">Theme</p>
                <p className="text-xs text-muted-foreground">Light theme only</p>
              </div>
              <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">Light</span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold">Currency</p>
                <p className="text-xs text-muted-foreground">Bangladeshi Taka</p>
              </div>
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">৳ BDT</span>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Number format</Label>
              <select
                className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                value={settings.numberFormat}
                onChange={(e) => updateSettings({ numberFormat: e.target.value as typeof settings.numberFormat })}
              >
                <option value="en-US">1,234,567.89 (International)</option>
                <option value="en-IN">12,34,567.89 (South Asian)</option>
                <option value="bn-BD">১২,৩৪,৫৬৭.৮৯ (Bangla)</option>
              </select>
              <p className="text-xs text-muted-foreground">Preview: {b.money(1234567.89)}</p>
            </div>
          </div>
        </Panel>

        <Panel title="Export & backup">
          <div className="space-y-3">
            <Button variant="outline" className="w-full justify-start gap-2" onClick={exportCSV}>
              <FileSpreadsheet className="h-4 w-4" /> Export transactions as CSV
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2" onClick={exportJSON}>
              <FileJson className="h-4 w-4" /> Export all data as JSON
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2" onClick={exportJSON}>
              <Download className="h-4 w-4" /> Download local storage backup
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) restore(f);
                e.target.value = "";
              }}
            />
            <Button variant="outline" className="w-full justify-start gap-2" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4" /> Restore from JSON file
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full justify-start gap-2">
                  <Trash2 className="h-4 w-4" /> Clear all data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear all data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Every account, transaction, transfer and budget stored on this device will be erased. This cannot be
                    undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      resetAll();
                      toast.success("All data cleared");
                    }}
                  >
                    Clear everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <p className="pt-1 text-xs text-muted-foreground">
              All data is stored locally in your browser. Nothing is sent to a server.
            </p>
          </div>
        </Panel>
      </div>
    </AppLayout>
  );
}
