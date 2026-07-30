import type { AppData } from "@/types";
import { DEFAULT_ACCOUNTS, DEFAULT_SETTINGS, STORAGE_KEY } from "@/constants";

/** Local-storage backed persistence layer (no backend). */

export const emptyData = (): AppData => ({
  accounts: DEFAULT_ACCOUNTS.map((a) => ({ ...a })),
  transactions: [],
  transfers: [],
  budgets: [],
  settings: { ...DEFAULT_SETTINGS },
});

export function loadData(): AppData {
  if (typeof window === "undefined") return emptyData();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyData();
    const parsed = JSON.parse(raw) as Partial<AppData>;
    const base = emptyData();
    return {
      accounts: parsed.accounts?.length ? parsed.accounts : base.accounts,
      transactions: parsed.transactions ?? [],
      transfers: parsed.transfers ?? [],
      budgets: parsed.budgets ?? [],
      settings: { ...base.settings, ...(parsed.settings ?? {}) },
    };
  } catch (err) {
    console.error("Failed to read saved data", err);
    return emptyData();
  }
}

export function saveData(data: AppData) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error("Failed to save data", err);
  }
}

export function clearData() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
