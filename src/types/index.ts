/** Core domain types for the finance tracker. */

export type TxType = "income" | "expense";

export interface Account {
  id: string;
  name: string;
  /** lucide icon key, see ACCOUNT_ICONS */
  icon: string;
  /** hex color indicator */
  color: string;
  type: string;
  /** starting balance; live balance is derived from transactions */
  openingBalance: number;
  /** default accounts cannot be deleted */
  isDefault?: boolean;
  /** links to payment_providers.id — set on both real wallets and virtual (provider-only) accounts */
  providerId?: string;
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
  createdAt: string;
}

export type LoanDirection = "receivable" | "payable";
export type LoanStatus = "active" | "completed" | "overdue";

export interface LoanPayment {
  id: string;
  date: string; // ISO date
  amount: number;
  accountId?: string;
}

export interface LoanIncrease {
  id: string;
  date: string; // ISO date
  amount: number;
  accountId?: string;
}

export interface Loan {
  id: string;
  contactName: string;
  direction: LoanDirection;
  totalAmount: number;
  payments: LoanPayment[];
  increases?: LoanIncrease[];
  accountId: string;
  loanType: string;
  loanDate: string;
  dueDate?: string;
  status: LoanStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AppData {
  accounts: Account[];
  transactions: Transaction[];
  transfers: Transfer[];
  loans: Loan[];
}
