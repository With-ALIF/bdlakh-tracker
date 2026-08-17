export type TxType = "income" | "expense";

export interface Account {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: string;
  openingBalance: number;
  isDefault?: boolean;
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
  isSpecialNumber: boolean;
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

export type GoalStatus = "active" | "completed" | "cancelled";

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  deadline?: string;
  status: GoalStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SavingContribution {
  id: string;
  goalId: string;
  walletId?: string;
  savingsWalletId?: string;
  transferId?: string;
  amount: number;
  date: string;
  note?: string;
  createdAt: string;
}

export type WithdrawalReason =
  | "Debt Payment"
  | "Education"
  | "Emergency"
  | "Family"
  | "Gift"
  | "Investment"
  | "Medical"
  | "Others"
  | "Personal"
  | "Unexpected Expense"
  | "Urgent Purchase";

export const WITHDRAWAL_REASONS: WithdrawalReason[] = [
  "Debt Payment",
  "Education",
  "Emergency",
  "Family",
  "Gift",
  "Investment",
  "Medical",
  "Others",
  "Personal",
  "Unexpected Expense",
  "Urgent Purchase",
];

export interface SavingWithdrawal {
  id: string;
  goalId: string;
  walletId?: string;
  savingsWalletId?: string;
  transferId?: string;
  amount: number;
  reason: WithdrawalReason;
  date: string;
  createdAt: string;
}

export interface TransferCharge {
  id: string;
  fromProvider: string;
  toProvider: string;
  chargeRate: number;
  flatFee: number;
  isSuperAgent: boolean;
  label: string | null;
  isActive: boolean;
}
