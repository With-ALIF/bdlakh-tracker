import { useMemo } from "react";
import { useFinance } from "@/context/FinanceContext";
import { accountBalance, formatMoney } from "@/utils/finance";

/** Derived balances + a currency formatter bound to settings. */
export function useBalances() {
  const { accounts, transactions, transfers } = useFinance();

  return useMemo(() => {
    const balances = new Map<string, number>();
    for (const a of accounts) balances.set(a.id, accountBalance(a, transactions, transfers));

    const sumByType = (type: string) =>
      accounts.filter((a) => a.type === type).reduce((s, a) => s + (balances.get(a.id) ?? 0), 0);

    const total = [...balances.values()].reduce((s, v) => s + v, 0);

    return {
      balances,
      total,
      cash: sumByType("cash"),
      bank: sumByType("bank"),
      mfs: sumByType("mfs"),
      money: (n: number) => formatMoney(n),
      accountName: (id: string) => accounts.find((a) => a.id === id)?.name ?? "Unknown",
      accountColor: (id: string) => accounts.find((a) => a.id === id)?.color ?? "#475569",
    };
  }, [accounts, transactions, transfers]);
}
