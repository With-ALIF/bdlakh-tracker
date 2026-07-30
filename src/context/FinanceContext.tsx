import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Account, AppData, Budget, Transaction, Transfer } from "@/types";
import { clearData, emptyData, loadData, saveData, uid } from "@/services/storage";

/** Global app state persisted to local storage. */
interface FinanceContextValue extends AppData {
  ready: boolean;
  addTransaction: (t: Omit<Transaction, "id" | "createdAt">) => void;
  updateTransaction: (id: string, t: Omit<Transaction, "id" | "createdAt">) => void;
  deleteTransaction: (id: string) => void;
  addTransfer: (t: Omit<Transfer, "id" | "createdAt">) => void;
  deleteTransfer: (id: string) => void;
  addAccount: (a: Omit<Account, "id">) => void;
  updateAccount: (id: string, a: Omit<Account, "id">) => void;
  deleteAccount: (id: string) => void;
  saveBudget: (b: Omit<Budget, "id">) => void;
  deleteBudget: (id: string) => void;
  updateSettings: (s: Partial<AppData["settings"]>) => void;
  replaceAll: (data: AppData) => void;
  resetAll: () => void;
}

const FinanceContext = createContext<FinanceContextValue | null>(null);

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => emptyData());
  const [ready, setReady] = useState(false);

  // Hydrate from local storage after mount (SSR-safe).
  useEffect(() => {
    setData(loadData());
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) saveData(data);
  }, [data, ready]);

  const patch = useCallback(
    (fn: (d: AppData) => AppData) => setData((prev) => fn(prev)),
    [],
  );

  const value = useMemo<FinanceContextValue>(
    () => ({
      ...data,
      ready,
      addTransaction: (t) =>
        patch((d) => ({
          ...d,
          transactions: [
            { ...t, id: uid(), createdAt: new Date().toISOString() },
            ...d.transactions,
          ],
        })),
      updateTransaction: (id, t) =>
        patch((d) => ({
          ...d,
          transactions: d.transactions.map((x) => (x.id === id ? { ...x, ...t } : x)),
        })),
      deleteTransaction: (id) =>
        patch((d) => ({ ...d, transactions: d.transactions.filter((x) => x.id !== id) })),
      addTransfer: (t) =>
        patch((d) => ({
          ...d,
          transfers: [{ ...t, id: uid(), createdAt: new Date().toISOString() }, ...d.transfers],
        })),
      deleteTransfer: (id) =>
        patch((d) => ({ ...d, transfers: d.transfers.filter((x) => x.id !== id) })),
      addAccount: (a) => patch((d) => ({ ...d, accounts: [...d.accounts, { ...a, id: uid() }] })),
      updateAccount: (id, a) =>
        patch((d) => ({
          ...d,
          accounts: d.accounts.map((x) => (x.id === id ? { ...x, ...a } : x)),
        })),
      deleteAccount: (id) =>
        patch((d) => ({
          ...d,
          accounts: d.accounts.filter((x) => x.id !== id),
          transactions: d.transactions.filter((x) => x.accountId !== id),
          transfers: d.transfers.filter((x) => x.fromAccountId !== id && x.toAccountId !== id),
        })),
      saveBudget: (b) =>
        patch((d) => {
          const existing = d.budgets.find((x) => x.category === b.category && x.month === b.month);
          return existing
            ? {
                ...d,
                budgets: d.budgets.map((x) => (x.id === existing.id ? { ...x, amount: b.amount } : x)),
              }
            : { ...d, budgets: [...d.budgets, { ...b, id: uid() }] };
        }),
      deleteBudget: (id) => patch((d) => ({ ...d, budgets: d.budgets.filter((x) => x.id !== id) })),
      updateSettings: (s) => patch((d) => ({ ...d, settings: { ...d.settings, ...s } })),
      replaceAll: (next) => setData(next),
      resetAll: () => {
        clearData();
        setData(emptyData());
      },
    }),
    [data, ready, patch],
  );

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error("useFinance must be used inside FinanceProvider");
  return ctx;
}
