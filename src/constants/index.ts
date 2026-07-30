import type { Account, Settings } from "@/types";
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
  cash: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTMZNt3WzFNMK6lk77Md1I_Bz6GpXh8PWhYe-IFr0m2SA&s=10",
  bank: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQU0XsZiQqR6FJMcIyaCMYnDBVdySk4ZPHsUkRF-hrYJXzAnUxXyh7fOZ86&s=10",
  bkash: "https://static.vecteezy.com/system/resources/previews/039/340/798/non_2x/bkash-logo-free-vector.jpg",
  nagad: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ7x4tqkMqhSTJP70NjbamU4GjWZhAc1eSCwQPrqeJ7Dw&s=10",
  rocket: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTImDMUhElLiivUwlRk-xrcDLkSPvdOadomCn62o0cgzQ&s=10",
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
  { id: "cash", name: "Cash", icon: "wallet", color: "#16A34A", openingBalance: 0, isDefault: true },
  { id: "bkash", name: "bKash", icon: "smartphone", color: "#DB2777", openingBalance: 0, isDefault: true },
  { id: "nagad", name: "Nagad", icon: "smartphone", color: "#F59E0B", openingBalance: 0, isDefault: true },
  { id: "rocket", name: "Rocket", icon: "smartphone", color: "#7C3AED", openingBalance: 0, isDefault: true },
  { id: "bank", name: "Bank Account", icon: "landmark", color: "#2563EB", openingBalance: 0, isDefault: true },
];

/** Accounts grouped for dashboard summaries. */
export const MFS_ACCOUNT_IDS = ["bkash", "nagad", "rocket"];
export const CASH_ACCOUNT_IDS = ["cash"];
export const BANK_ACCOUNT_IDS = ["bank"];

export const INCOME_CATEGORIES = [
  "Salary",
  "Freelancing",
  "Business",
  "Investment",
  "Gift",
  "Bonus",
  "Others",
];

export const EXPENSE_CATEGORIES = [
  "Food",
  "Shopping",
  "Transport",
  "Mobile Recharge",
  "Internet",
  "Electricity",
  "Gas",
  "Rent",
  "Education",
  "Medicine",
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
  "#475569",
];

export const DEFAULT_SETTINGS: Settings = {
  currency: "৳",
  numberFormat: "en-US",
};

export const STORAGE_KEY = "bd-finance-tracker-v1";
