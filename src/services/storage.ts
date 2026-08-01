import type { AppData } from "@/types";
import { DEFAULT_ACCOUNTS } from "@/constants";

const STORAGE_KEY = "bd-finance-tracker-v1";

/** Local-storage backed persistence layer (no backend). */

export const emptyData = (): AppData => ({
  accounts: DEFAULT_ACCOUNTS.map((a) => ({ ...a })),
  transactions: [],
  transfers: [],
  loans: [],
});

export function loadData(): AppData {
  if (typeof window === "undefined") return emptyData();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyData();
    const parsed = JSON.parse(raw) as Partial<AppData>;
    const base = emptyData();
    return {
      accounts: parsed.accounts?.length
        ? parsed.accounts.map((a) => {
            // Always keep name/icon/color in sync for default accounts
            const def = base.accounts.find((d) => d.id === a.id && d.isDefault);
            return def ? { ...a, name: def.name, icon: def.icon, color: def.color } : a;
          })
        : base.accounts,
      transactions: parsed.transactions ?? [],
      transfers: parsed.transfers ?? [],
      loans: parsed.loans ?? [],
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
