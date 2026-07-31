import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Account, AppData, Budget, Loan, LoanIncrease, LoanPayment, Transaction, Transfer, TxType } from "@/types";
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
  addLoan: (l: Omit<Loan, "id" | "createdAt" | "updatedAt" | "payments" | "status">) => void;
  updateLoan: (id: string, l: Partial<Omit<Loan, "id" | "createdAt" | "payments">>) => void;
  deleteLoan: (id: string) => void;
  addLoanPayment: (loanId: string, p: Omit<LoanPayment, "id">) => void;
  deleteLoanPayment: (loanId: string, paymentId: string) => void;
  addLoanIncrease: (loanId: string, inc: Omit<LoanIncrease, "id">) => void;
  deleteLoanIncrease: (loanId: string, increaseId: string) => void;
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
      addLoan: (l) =>
        patch((d) => {
          const loanId = uid();
          const now = new Date().toISOString();
          const newLoan: Loan = {
            ...l,
            id: loanId,
            payments: [],
            status: "active" as const,
            createdAt: now,
            updatedAt: now,
          };

          const isReceivable = l.direction === "receivable";
          const initialTx: Transaction = {
            id: uid(),
            title: isReceivable ? `Loan to ${l.contactName}` : `Loan from ${l.contactName}`,
            amount: l.totalAmount,
            type: isReceivable ? "expense" : "income",
            accountId: l.accountId,
            category: isReceivable ? "Loan Given" : "Loan Taken",
            date: l.loanDate,
            note: l.note,
            createdAt: now,
            loanId,
          };

          return {
            ...d,
            loans: [newLoan, ...d.loans],
            transactions: [initialTx, ...d.transactions],
          };
        }),
      updateLoan: (id, l) =>
        patch((d) => {
          const now = new Date().toISOString();
          const existingLoan = d.loans.find((x) => x.id === id);
          const updatedLoans = d.loans.map((x) =>
            x.id === id ? { ...x, ...l, updatedAt: now } : x
          );

          const updatedTransactions = d.transactions.map((tx) => {
            if (tx.loanId === id && !tx.loanPaymentId) {
              const dir = l.direction ?? existingLoan?.direction ?? "receivable";
              const contact = l.contactName ?? existingLoan?.contactName ?? "";
              const isReceivable = dir === "receivable";
              return {
                ...tx,
                title: isReceivable ? `Loan to ${contact}` : `Loan from ${contact}`,
                amount: l.totalAmount ?? tx.amount,
                type: (isReceivable ? "expense" : "income") as TxType,
                accountId: l.accountId ?? tx.accountId,
                category: isReceivable ? "Loan Given" : "Loan Taken",
                date: l.loanDate ?? tx.date,
                note: l.note !== undefined ? l.note : tx.note,
              };
            }
            return tx;
          });

          return {
            ...d,
            loans: updatedLoans,
            transactions: updatedTransactions,
          };
        }),
      deleteLoan: (id) =>
        patch((d) => ({
          ...d,
          loans: d.loans.filter((x) => x.id !== id),
          transactions: d.transactions.filter((tx) => tx.loanId !== id),
        })),
      addLoanPayment: (loanId, p) =>
        patch((d) => {
          const targetLoan = d.loans.find((l) => l.id === loanId);
          if (!targetLoan) return d;

          const paymentId = uid();
          const now = new Date().toISOString();
          const newPayment: LoanPayment = { ...p, id: paymentId };
          const newPayments = [...targetLoan.payments, newPayment];
          const paid = newPayments.reduce((s, x) => s + x.amount, 0);
          const status: Loan["status"] =
            paid >= targetLoan.totalAmount
              ? "completed"
              : targetLoan.status === "overdue"
              ? "overdue"
              : "active";

          const updatedLoans = d.loans.map((loan) =>
            loan.id === loanId
              ? { ...loan, payments: newPayments, status, updatedAt: now }
              : loan
          );

          const isReceivable = targetLoan.direction === "receivable";
          const accountId = p.accountId || targetLoan.accountId;

          const paymentTx: Transaction = {
            id: uid(),
            title: isReceivable
              ? `Loan Repayment from ${targetLoan.contactName}`
              : `Loan Repayment to ${targetLoan.contactName}`,
            amount: p.amount,
            type: isReceivable ? "income" : "expense",
            accountId,
            category: isReceivable ? "Loan Repayment" : "Loan Payment",
            date: p.date,
            note: p.note,
            createdAt: now,
            loanId,
            loanPaymentId: paymentId,
          };

          return {
            ...d,
            loans: updatedLoans,
            transactions: [paymentTx, ...d.transactions],
          };
        }),
      deleteLoanPayment: (loanId, paymentId) =>
        patch((d) => {
          const updatedLoans = d.loans.map((loan) => {
            if (loan.id !== loanId) return loan;
            const newPayments = loan.payments.filter((p) => p.id !== paymentId);
            const paid = newPayments.reduce((s, x) => s + x.amount, 0);
            const status: Loan["status"] = paid >= loan.totalAmount ? "completed" : "active";
            return { ...loan, payments: newPayments, status, updatedAt: new Date().toISOString() };
          });

          const updatedTransactions = d.transactions.filter((tx) => tx.loanPaymentId !== paymentId);

          return {
            ...d,
            loans: updatedLoans,
            transactions: updatedTransactions,
          };
        }),
      addLoanIncrease: (loanId, inc) =>
        patch((d) => {
          const targetLoan = d.loans.find((l) => l.id === loanId);
          if (!targetLoan) return d;

          const increaseId = uid();
          const now = new Date().toISOString();
          const newIncrease: LoanIncrease = { ...inc, id: increaseId };
          const newIncreases = [...(targetLoan.increases ?? []), newIncrease];
          const newTotalAmount = targetLoan.totalAmount + inc.amount;
          const paid = targetLoan.payments.reduce((s, x) => s + x.amount, 0);
          const status: Loan["status"] = paid >= newTotalAmount ? "completed" : "active";

          const updatedLoans = d.loans.map((loan) =>
            loan.id === loanId
              ? {
                  ...loan,
                  totalAmount: newTotalAmount,
                  increases: newIncreases,
                  status,
                  updatedAt: now,
                }
              : loan
          );

          const isReceivable = targetLoan.direction === "receivable";
          const accountId = inc.accountId || targetLoan.accountId;

          const increaseTx: Transaction = {
            id: uid(),
            title: isReceivable
              ? `Additional Loan Given to ${targetLoan.contactName}`
              : `Additional Loan Taken from ${targetLoan.contactName}`,
            amount: inc.amount,
            type: isReceivable ? "expense" : "income",
            accountId,
            category: isReceivable ? "Loan Given" : "Loan Taken",
            date: inc.date,
            note: inc.note,
            createdAt: now,
            loanId,
            loanIncreaseId: increaseId,
          };

          return {
            ...d,
            loans: updatedLoans,
            transactions: [increaseTx, ...d.transactions],
          };
        }),
      deleteLoanIncrease: (loanId, increaseId) =>
        patch((d) => {
          const targetLoan = d.loans.find((l) => l.id === loanId);
          if (!targetLoan) return d;

          const targetIncrease = targetLoan.increases?.find((inc) => inc.id === increaseId);
          if (!targetIncrease) return d;

          const newIncreases = targetLoan.increases?.filter((inc) => inc.id !== increaseId) ?? [];
          const newTotalAmount = Math.max(0, targetLoan.totalAmount - targetIncrease.amount);
          const paid = targetLoan.payments.reduce((s, x) => s + x.amount, 0);
          const status: Loan["status"] = paid >= newTotalAmount ? "completed" : "active";

          const updatedLoans = d.loans.map((loan) =>
            loan.id === loanId
              ? {
                  ...loan,
                  totalAmount: newTotalAmount,
                  increases: newIncreases,
                  status,
                  updatedAt: new Date().toISOString(),
                }
              : loan
          );

          const updatedTransactions = d.transactions.filter(
            (tx) => tx.loanIncreaseId !== increaseId
          );

          return {
            ...d,
            loans: updatedLoans,
            transactions: updatedTransactions,
          };
        }),
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
