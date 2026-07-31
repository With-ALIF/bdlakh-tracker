/** Core domain types for the finance tracker. */

export type TxType = "income" | "expense";

export interface Account {
  id: string;
  name: string;
  /** lucide icon key, see ACCOUNT_ICONS */
  icon: string;
  /** hex color indicator */
  color: string;
  /** starting balance; live balance is derived from transactions */
  openingBalance: number;
  /** default accounts cannot be deleted */
  isDefault?: boolean;
}

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: TxType;
  accountId: string;
  category: string;
  /** ISO date (YYYY-MM-DD) */
  date: string;
  note?: string;
  createdAt: string;
  loanId?: string;
  loanPaymentId?: string;
  loanIncreaseId?: string;
}

export interface Transfer {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  date: string;
  note?: string;
  createdAt: string;
}

export interface Budget {
  id: string;
  category: string;
  amount: number;
  /** YYYY-MM */
  month: string;
}

export type LoanDirection = "receivable" | "payable";
export type LoanStatus = "active" | "completed" | "overdue";

export interface LoanPayment {
  id: string;
  date: string; // ISO date
  amount: number;
  accountId?: string;
  note?: string;
}

export interface LoanIncrease {
  id: string;
  date: string; // ISO date
  amount: number;
  accountId?: string;
  note?: string;
}

export interface Loan {
  id: string;
  contactName: string;
  contactPhone?: string;
  direction: LoanDirection; // receivable = others owe me, payable = I owe others
  totalAmount: number;
  payments: LoanPayment[];
  increases?: LoanIncrease[];
  accountId: string;
  loanType: string; // "Personal Loan", "Emergency Loan", etc.
  loanDate: string; // ISO date
  dueDate?: string; // ISO date
  note?: string;
  status: LoanStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  currency: string;
  numberFormat: "en-US" | "en-IN" | "bn-BD";
}

export interface AppData {
  accounts: Account[];
  transactions: Transaction[];
  transfers: Transfer[];
  budgets: Budget[];
  loans: Loan[];
  settings: Settings;
}
