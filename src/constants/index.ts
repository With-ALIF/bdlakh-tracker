import type { Account } from "@/types";
import {
  Wallet,
  Smartphone,
  Landmark,
  CreditCard,
  PiggyBank,
  Coins,
  Building2,
  Banknote,
} from "lucide-react";

/** Icon registry used by accounts (stored as string keys in local storage). */
export const ACCOUNT_ICONS = {
  wallet: Wallet,
  smartphone: Smartphone,
  landmark: Landmark,
  card: CreditCard,
  piggy: PiggyBank,
  coins: Coins,
  building: Building2,
  banknote: Banknote,
} as const;

export type AccountIconKey = keyof typeof ACCOUNT_ICONS;

/** Direct image logos for accounts and MFS services */
export const ACCOUNT_LOGOS: Record<string, string> = {
  cash: "/logos/cash.png",
  bkash: "/logos/bkash.png",
  nagad: "/logos/nagad.png",
  rocket: "/logos/rocket.png",
};

export const ACCOUNT_COLORS = [
  "#2563EB",
  "#16A34A",
  "#F59E0B",
  "#DC2626",
  "#7C3AED",
  "#0891B2",
  "#DB2777",
  "#475569",
];

export const DEFAULT_ACCOUNTS: Account[] = [
  { id: "a0000000-0000-0000-0000-000000000001", name: "Cash", icon: "wallet", color: "#16A34A", type: "cash", openingBalance: 0, isDefault: true, providerId: "a0000000-0000-0000-0000-000000000001" },
  { id: "a0000000-0000-0000-0000-000000000002", name: "Bkash", icon: "smartphone", color: "#DB2777", type: "mfs", openingBalance: 0, isDefault: true, providerId: "a0000000-0000-0000-0000-000000000002" },
  { id: "a0000000-0000-0000-0000-000000000003", name: "Nagad", icon: "smartphone", color: "#F59E0B", type: "mfs", openingBalance: 0, isDefault: true, providerId: "a0000000-0000-0000-0000-000000000003" },
  { id: "a0000000-0000-0000-0000-000000000004", name: "Rocket", icon: "smartphone", color: "#7C3AED", type: "mfs", openingBalance: 0, isDefault: true, providerId: "a0000000-0000-0000-0000-000000000004" },
  { id: "a0000000-0000-0000-0000-000000000005", name: "Bank Account", icon: "landmark", color: "#2563EB", type: "bank", openingBalance: 0, isDefault: true, providerId: "a0000000-0000-0000-0000-000000000005" },
  { id: "a0000000-0000-0000-0000-000000000006", name: "Savings Wallet", icon: "piggy", color: "#059669", type: "savings", openingBalance: 0, isDefault: true, providerId: "a0000000-0000-0000-0000-000000000006" },
];

/** Maps payment_providers.id → default UI properties for virtual (no wallet yet) accounts */
export const PROVIDER_DEFAULTS: Record<string, { name: string; icon: string; color: string; type: string }> = {
  "a0000000-0000-0000-0000-000000000001": { name: "Cash", icon: "wallet", color: "#16A34A", type: "cash" },
  "a0000000-0000-0000-0000-000000000002": { name: "Bkash", icon: "smartphone", color: "#DB2777", type: "mfs" },
  "a0000000-0000-0000-0000-000000000003": { name: "Nagad", icon: "smartphone", color: "#F59E0B", type: "mfs" },
  "a0000000-0000-0000-0000-000000000004": { name: "Rocket", icon: "smartphone", color: "#7C3AED", type: "mfs" },
  "a0000000-0000-0000-0000-000000000005": { name: "Bank Account", icon: "landmark", color: "#2563EB", type: "bank" },
  "a0000000-0000-0000-0000-000000000006": { name: "Savings Wallet", icon: "piggy", color: "#059669", type: "savings" },
};

export const INCOME_CATEGORIES = [
  "Salary",
  "Freelancing", 
  "Business",
  "Investment",
  "Gift",
  "Bonus",
  "Loan Taken",
  "Loan Repayment",
  "Others",
];

export const EXPENSE_CATEGORIES = [
  "Food",
  "Groceries",
  "Shopping",
  "Clothing",
  "Transport",
  "Mobile Recharge",
  "Internet Bill",
  "Electricity",
  "Gas",
  "Rent",
  "Education",
  "Tuition",
  "Medicine",
  "Loan Given",
  "Loan Payment",
  "EMI",
  "Savings",
  "Entertainment",
  "Travel",
  "Others",
];

export const CATEGORY_COLORS = [
  "#2563EB",
  "#16A34A",
  "#F59E0B",
  "#DC2626",
  "#7C3AED",
  "#0891B2",
  "#DB2777",
  "#65A30D",
  "#EA580C",
  "#4F46E5",
  "#0D9488",
  "#B91C1C",
  "#8B5CF6",
  "#EC4899",
  "#10B981",
  "#F97316",
  "#6366F1",
  "#475569",
];
