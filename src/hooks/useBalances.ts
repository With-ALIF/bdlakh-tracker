import { useMemo } from "react";
import { useFinance } from "@/context/FinanceContext";
import { accountBalance, formatMoney } from "@/utils/finance";
import { BANK_ACCOUNT_IDS, CASH_ACCOUNT_IDS, MFS_ACCOUNT_IDS } from "@/constants";

/** Derived balances + a currency formatter bound to settings. */
export function useBalances() {
  const { accounts, transactions, transfers, settings } = useFinance();

  return useMemo(() => {
    const balances = new Map<string, number>();
    for (const a of accounts) balances.set(a.id, accountBalance(a, transactions, transfers));

    const sumOf = (ids: string[]) =>
      accounts.filter((a) => ids.includes(a.id)).reduce((s, a) => s + (balances.get(a.id) ?? 0), 0);

    const total = [...balances.values()].reduce((s, v) => s + v, 0);

    return {
      balances,
      total,
      cash: sumOf(CASH_ACCOUNT_IDS),
      bank: sumOf(BANK_ACCOUNT_IDS),
      mfs: sumOf(MFS_ACCOUNT_IDS),
      money: (n: number) => formatMoney(n, settings.currency, settings.numberFormat),
      accountName: (id: string) => accounts.find((a) => a.id === id)?.name ?? "Unknown",
      accountColor: (id: string) => accounts.find((a) => a.id === id)?.color ?? "#475569",
    };
  }, [accounts, transactions, transfers, settings]);
}
