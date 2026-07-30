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

export interface Settings {
  currency: string;
  numberFormat: "en-US" | "en-IN" | "bn-BD";
}

export interface AppData {
  accounts: Account[];
  transactions: Transaction[];
  transfers: Transfer[];
  budgets: Budget[];
  settings: Settings;
}
