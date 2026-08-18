import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import { useFinance } from "@/context/FinanceContext";
import type { GoalStatus, SavingContribution, SavingWithdrawal, SavingsGoal, WithdrawalReason } from "@/types";

/* ─── row mappers ─────────────────────────────────────────── */

function rowToGoal(r: Record<string, any>): SavingsGoal {
  return {
    id: r.id,
    name: r.name,
    targetAmount: Number(r.target_amount ?? 0),
    deadline: r.deadline ?? undefined,
    status: (r.status ?? "active") as GoalStatus,
    createdAt: r.created_at ?? new Date().toISOString(),
    updatedAt: r.updated_at ?? new Date().toISOString(),
  };
}

function rowToContribution(r: Record<string, any>): SavingContribution {
  return {
    id: r.id,
    goalId: r.goal_id,
    walletId: r.wallet_id ?? undefined,
    savingsWalletId: r.savings_wallet_id ?? undefined,
    transferId: r.transfer_id ?? undefined,
    amount: Number(r.amount ?? 0),
    date: r.saving_date,
    note: r.note ?? undefined,
    createdAt: r.created_at ?? new Date().toISOString(),
  };
}

function rowToWithdrawal(r: Record<string, any>): SavingWithdrawal {
  return {
    id: r.id,
    goalId: r.goal_id,
    walletId: r.wallet_id ?? undefined,
    savingsWalletId: r.savings_wallet_id ?? undefined,
    transferId: r.transfer_id ?? undefined,
    amount: Number(r.amount ?? 0),
    reason: r.reason ?? "Other",
    date: r.withdraw_date,
    createdAt: r.created_at ?? new Date().toISOString(),
  };
}

/* ─── types ───────────────────────────────────────────────── */

export interface GoalInput {
  name: string;
  targetAmount: number;
  deadline?: string;
}

export interface ContributionInput {
  goalId: string;
  walletId?: string;
  amount: number;
  date: string;
  note?: string;
}

export interface WithdrawalInput {
  goalId: string;
  walletId?: string;
  amount: number;
  reason: WithdrawalReason;
  date: string;
}

interface SavingsContextValue {
  ready: boolean;
  goals: SavingsGoal[];
  contributions: SavingContribution[];
  withdrawals: SavingWithdrawal[];
  contributionsFor: (goalId: string) => SavingContribution[];
  withdrawalsFor: (goalId: string) => SavingWithdrawal[];
  savedFor: (goalId: string) => number;
  totalWithdrawnFor: (goalId: string) => number;
  addGoal: (input: GoalInput) => Promise<string | null>;
  updateGoal: (id: string, input: GoalInput) => Promise<boolean>;
  setGoalStatus: (id: string, status: GoalStatus) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  addContribution: (input: ContributionInput) => Promise<boolean>;
  updateContribution: (id: string, input: ContributionInput) => Promise<boolean>;
  deleteContribution: (id: string) => Promise<void>;
  addWithdrawal: (input: WithdrawalInput) => Promise<boolean>;
  updateWithdrawal: (id: string, input: WithdrawalInput) => Promise<boolean>;
  deleteWithdrawal: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const SavingsContext = createContext<SavingsContextValue | null>(null);

/* ─── provider ────────────────────────────────────────────── */

export function SavingsProvider({ children }: { children: ReactNode }) {
  const {
    ensureWallet,
    ensureSavingsWallet,
    createTransferApi,
    updateTransferApi,
    deleteTransferApi,
  } = useFinance();
  const [userId, setUserId] = useState<string | null>(null);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [contributions, setContributions] = useState<SavingContribution[]>([]);
  const [withdrawals, setWithdrawals] = useState<SavingWithdrawal[]>([]);
  const [ready, setReady] = useState(false);
  const loadRef = useRef<(uid: string | null) => Promise<void>>(async () => {});

  /* auth + initial load */
  useEffect(() => {
    let cancelled = false;

    const load = async (uid: string | null) => {
      if (!uid) {
        if (!cancelled) {
          setUserId(null);
          setGoals([]);
          setContributions([]);
          setWithdrawals([]);
          setReady(true);
        }
        return;
      }
      if (!cancelled) setUserId(uid);

      const [g, c, w] = await Promise.all([
        supabase
          .from("savings_goals")
          .select("*")
          .eq("user_id", uid)
          .order("created_at", { ascending: false }),
        supabase
          .from("saving_contributions")
          .select("*")
          .eq("user_id", uid)
          .order("saving_date", { ascending: false }),
        supabase
          .from("savings_withdrawals")
          .select("*")
          .eq("user_id", uid)
          .order("withdraw_date", { ascending: false }),
      ]);

      if (cancelled) return;
      if (g.error) console.error("savings_goals load error:", g.error.message);
      if (c.error) console.error("saving_contributions load error:", c.error.message);
      if (w.error) console.error("savings_withdrawals load error:", w.error.message);
      setGoals((g.data ?? []).map(rowToGoal));
      setContributions((c.data ?? []).map(rowToContribution));
      setWithdrawals((w.data ?? []).map(rowToWithdrawal));
      setReady(true);
    };

    loadRef.current = load;

    supabase.auth.getUser().then(({ data }) => load(data.user?.id ?? null));

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        setReady(false);
        load(session?.user?.id ?? null);
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setReady(false);
    await loadRef.current(userId);
  }, [userId]);

  const contributionsFor = useCallback(
    (goalId: string) =>
      contributions
        .filter((c) => c.goalId === goalId)
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
    [contributions],
  );

  const savedFor = useCallback(
    (goalId: string) => {
      const totalContrib = contributions.filter((c) => c.goalId === goalId).reduce((s, c) => s + c.amount, 0);
      const totalWithdraw = withdrawals.filter((w) => w.goalId === goalId).reduce((s, w) => s + w.amount, 0);
      return totalContrib - totalWithdraw;
    },
    [contributions, withdrawals],
  );

  const withdrawalsFor = useCallback(
    (goalId: string) =>
      withdrawals
        .filter((w) => w.goalId === goalId)
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
    [withdrawals],
  );

  const totalWithdrawnFor = useCallback(
    (goalId: string) =>
      withdrawals.filter((w) => w.goalId === goalId).reduce((s, w) => s + w.amount, 0),
    [withdrawals],
  );

 
  const syncGoalTotals = useCallback(
    async (goalId: string, contribList: SavingContribution[], withdrawList: SavingWithdrawal[]) => {
      const goal = goals.find((g) => g.id === goalId);
      if (!goal) return;
      const totalContrib = contribList.filter((c) => c.goalId === goalId).reduce((s, c) => s + c.amount, 0);
      const totalWithdraw = withdrawList.filter((w) => w.goalId === goalId).reduce((s, w) => s + w.amount, 0);
      const saved = totalContrib - totalWithdraw;

      let status: GoalStatus = goal.status;
      if (goal.status !== "cancelled") {
        status = goal.targetAmount > 0 && saved >= goal.targetAmount ? "completed" : "active";
      }

      const updatedAt = new Date().toISOString();
      setGoals((prev) =>
        prev.map((g) => (g.id === goalId ? { ...g, status, updatedAt } : g)),
      );
      await supabase
        .from("savings_goals")
        .update({ saved_amount: saved, status, updated_at: updatedAt })
        .eq("id", goalId);
    },
    [goals],
  );

  /* ─── goal CRUD ───────────────────────────────────────── */

  const addGoal = useCallback(
    async (input: GoalInput) => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("savings_goals")
        .insert({
          user_id: userId,
          name: input.name,
          target_amount: input.targetAmount,
          deadline: input.deadline ?? null,
          status: "active",
          saved_amount: 0,
        })
        .select()
        .single();
      if (error || !data) {
        console.error("addGoal error:", error?.message);
        return null;
      }
      const goal = rowToGoal(data);
      setGoals((prev) => [goal, ...prev]);
      return goal.id;
    },
    [userId],
  );

  const updateGoal = useCallback(
    async (id: string, input: GoalInput) => {
      if (!userId) return false;
      const updatedAt = new Date().toISOString();
      const { error } = await supabase
        .from("savings_goals")
        .update({
          name: input.name,
          target_amount: input.targetAmount,
          deadline: input.deadline ?? null,
          updated_at: updatedAt,
        })
        .eq("id", id);
      if (error) {
        console.error("updateGoal error:", error.message);
        return false;
      }
      setGoals((prev) =>
        prev.map((g) => (g.id === id ? { ...g, ...input, updatedAt } : g)),
      );
      return true;
    },
    [userId],
  );

  const setGoalStatus = useCallback(async (id: string, status: GoalStatus) => {
    const updatedAt = new Date().toISOString();
    const { error } = await supabase
      .from("savings_goals")
      .update({ status, updated_at: updatedAt })
      .eq("id", id);
    if (error) {
      console.error("setGoalStatus error:", error.message);
      return;
    }
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, status, updatedAt } : g)));
  }, []);

  const deleteGoal = useCallback(
    async (id: string) => {
      const goalContribs = contributions.filter((c) => c.goalId === id);
      for (const c of goalContribs) {
        if (c.transferId) {
          await deleteTransferApi(c.transferId);
        }
      }
      const goalWithdrawals = withdrawals.filter((w) => w.goalId === id);
      for (const w of goalWithdrawals) {
        if (w.transferId) {
          await deleteTransferApi(w.transferId);
        }
      }
      await supabase.from("saving_contributions").delete().eq("goal_id", id);
      await supabase.from("savings_withdrawals").delete().eq("goal_id", id);
      const { error } = await supabase.from("savings_goals").delete().eq("id", id);
      if (error) {
        console.error("deleteGoal error:", error.message);
        return;
      }
      setGoals((prev) => prev.filter((g) => g.id !== id));
      setContributions((prev) => prev.filter((c) => c.goalId !== id));
      setWithdrawals((prev) => prev.filter((w) => w.goalId !== id));
    },
    [contributions, withdrawals, deleteTransferApi],
  );

  /* ─── contribution CRUD ───────────────────────────────── */

  const addContribution = useCallback(
    async (input: ContributionInput) => {
      if (!userId) return false;
      const fromWalletId = input.walletId ? await ensureWallet(input.walletId) : null;
      const savingsWalletId = await ensureSavingsWallet();

      let transferId: string | null = null;
      if (fromWalletId && savingsWalletId) {
        const transferObj = await createTransferApi({
          fromAccountId: fromWalletId,
          toAccountId: savingsWalletId,
          amount: input.amount,
          date: input.date,
        });
        if (transferObj) {
          transferId = transferObj.id;
        }
      }

      let payload: Record<string, any> = {
        user_id: userId,
        goal_id: input.goalId,
        wallet_id: fromWalletId,
        savings_wallet_id: savingsWalletId || null,
        transfer_id: transferId,
        amount: input.amount,
        saving_date: input.date,
      };

      let { data, error } = await supabase
        .from("saving_contributions")
        .insert(payload)
        .select()
        .single();

      if (error && (error.code === "42703" || error.code === "PGRST204" || error.message.includes("column"))) {
        delete payload.transfer_id;
        delete payload.savings_wallet_id;
        const res = await supabase
          .from("saving_contributions")
          .insert(payload)
          .select()
          .single();
        data = res.data;
        error = res.error;
      }

      if (error || !data) {
        console.error("addContribution error:", error?.message);
        if (transferId) await deleteTransferApi(transferId);
        return false;
      }
      const created = rowToContribution(data);
      const next = [created, ...contributions];
      setContributions(next);
      await syncGoalTotals(input.goalId, next, withdrawals);
      return true;
    },
    [
      userId,
      contributions,
      ensureWallet,
      ensureSavingsWallet,
      createTransferApi,
      deleteTransferApi,
      syncGoalTotals,
    ],
  );

  const updateContribution = useCallback(
    async (id: string, input: ContributionInput) => {
      if (!userId) return false;
      const target = contributions.find((c) => c.id === id);
      const fromWalletId = input.walletId ? await ensureWallet(input.walletId) : null;
      const savingsWalletId = await ensureSavingsWallet();

      let transferId = target?.transferId ?? null;

      if (fromWalletId && savingsWalletId) {
        if (transferId) {
          await updateTransferApi(transferId, {
            fromAccountId: fromWalletId,
            toAccountId: savingsWalletId,
            amount: input.amount,
            date: input.date,
          });
        } else {
          const transferObj = await createTransferApi({
            fromAccountId: fromWalletId,
            toAccountId: savingsWalletId,
            amount: input.amount,
            date: input.date,
          });
          if (transferObj) transferId = transferObj.id;
        }
      }

      let updatePayload: Record<string, any> = {
        wallet_id: fromWalletId,
        savings_wallet_id: savingsWalletId || null,
        transfer_id: transferId,
        amount: input.amount,
        saving_date: input.date,
        updated_at: new Date().toISOString(),
      };

      let { error } = await supabase
        .from("saving_contributions")
        .update(updatePayload)
        .eq("id", id);

      if (error && (error.code === "42703" || error.code === "PGRST204" || error.message.includes("column"))) {
        delete updatePayload.transfer_id;
        delete updatePayload.savings_wallet_id;
        const res = await supabase
          .from("saving_contributions")
          .update(updatePayload)
          .eq("id", id);
        error = res.error;
      }

      if (error) {
        console.error("updateContribution error:", error.message);
        return false;
      }
      const next = contributions.map((c) =>
        c.id === id
          ? {
            ...c,
            walletId: fromWalletId ?? undefined,
            savingsWalletId: savingsWalletId || undefined,
            transferId: transferId ?? undefined,
            amount: input.amount,
            date: input.date,
          }
          : c,
      );
      setContributions(next);
      await syncGoalTotals(input.goalId, next, withdrawals);
      return true;
    },
    [
      userId,
      contributions,
      withdrawals,
      ensureWallet,
      ensureSavingsWallet,
      createTransferApi,
      updateTransferApi,
      syncGoalTotals,
    ],
  );

  const deleteContribution = useCallback(
    async (id: string) => {
      const target = contributions.find((c) => c.id === id);
      if (target?.transferId) {
        await deleteTransferApi(target.transferId);
      }
      const { error } = await supabase.from("saving_contributions").delete().eq("id", id);
      if (error) {
        console.error("deleteContribution error:", error.message);
        return;
      }
      const next = contributions.filter((c) => c.id !== id);
      setContributions(next);
      if (target) await syncGoalTotals(target.goalId, next, withdrawals);
    },
    [contributions, withdrawals, deleteTransferApi, syncGoalTotals],
  );

  /* ─── withdrawal CRUD ─────────────────────────────────── */

  const addWithdrawal = useCallback(
    async (input: WithdrawalInput) => {
      if (!userId) return false;
      const savingsWalletId = await ensureSavingsWallet();
      const toWalletId = input.walletId ? await ensureWallet(input.walletId) : null;

      let transferId: string | null = null;
      if (savingsWalletId && toWalletId) {
        const transferObj = await createTransferApi({
          fromAccountId: savingsWalletId,
          toAccountId: toWalletId,
          amount: input.amount,
          date: input.date,
        });
        if (transferObj) {
          transferId = transferObj.id;
        }
      }

      const payload: Record<string, any> = {
        user_id: userId,
        goal_id: input.goalId,
        wallet_id: toWalletId,
        savings_wallet_id: savingsWalletId || null,
        transfer_id: transferId,
        amount: input.amount,
        reason: input.reason,
        withdraw_date: input.date,
      };

      let { data, error } = await supabase
        .from("savings_withdrawals")
        .insert(payload)
        .select()
        .single();

      if (error && (error.code === "42703" || error.message.includes("column"))) {
        const fallback = { ...payload };
        delete fallback.transfer_id;
        delete fallback.savings_wallet_id;
        delete fallback.note;
        const res = await supabase
          .from("savings_withdrawals")
          .insert(fallback)
          .select()
          .single();
        data = res.data;
        error = res.error;
      }

      if (error || !data) {
        console.error("addWithdrawal error:", error?.message);
        if (transferId) await deleteTransferApi(transferId);
        return false;
      }
      const created = rowToWithdrawal(data);
      const next = [created, ...withdrawals];
      setWithdrawals(next);
      await syncGoalTotals(input.goalId, contributions, next);
      return true;
    },
    [
      userId,
      contributions,
      withdrawals,
      ensureWallet,
      ensureSavingsWallet,
      createTransferApi,
      deleteTransferApi,
      syncGoalTotals,
    ],
  );

  const updateWithdrawal = useCallback(
    async (id: string, input: WithdrawalInput) => {
      if (!userId) return false;
      const target = withdrawals.find((w) => w.id === id);
      const savingsWalletId = await ensureSavingsWallet();
      const toWalletId = input.walletId ? await ensureWallet(input.walletId) : null;

      let transferId = target?.transferId ?? null;

      if (savingsWalletId && toWalletId) {
        if (transferId) {
          await updateTransferApi(transferId, {
            fromAccountId: savingsWalletId,
            toAccountId: toWalletId,
            amount: input.amount,
            date: input.date,
          });
        } else {
          const transferObj = await createTransferApi({
            fromAccountId: savingsWalletId,
            toAccountId: toWalletId,
            amount: input.amount,
            date: input.date,
          });
          if (transferObj) transferId = transferObj.id;
        }
      }

      const updatePayload: Record<string, any> = {
        wallet_id: toWalletId,
        savings_wallet_id: savingsWalletId || null,
        transfer_id: transferId,
        amount: input.amount,
        reason: input.reason,
        withdraw_date: input.date,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("savings_withdrawals")
        .update(updatePayload)
        .eq("id", id);

      if (error) {
        console.error("updateWithdrawal error:", error.message);
        return false;
      }
      const next = withdrawals.map((w) =>
        w.id === id
          ? {
              ...w,
              walletId: toWalletId ?? undefined,
              savingsWalletId: savingsWalletId || undefined,
              transferId: transferId ?? undefined,
              amount: input.amount,
              reason: input.reason as WithdrawalReason,
              date: input.date,
            }
          : w,
      );
      setWithdrawals(next);
      await syncGoalTotals(input.goalId, contributions, next);
      return true;
    },
    [
      userId,
      withdrawals,
      contributions,
      ensureWallet,
      ensureSavingsWallet,
      createTransferApi,
      updateTransferApi,
      syncGoalTotals,
    ],
  );

  const deleteWithdrawal = useCallback(
    async (id: string) => {
      const target = withdrawals.find((w) => w.id === id);
      if (target?.transferId) {
        await deleteTransferApi(target.transferId);
      }
      const { error } = await supabase.from("savings_withdrawals").delete().eq("id", id);
      if (error) {
        console.error("deleteWithdrawal error:", error.message);
        return;
      }
      const next = withdrawals.filter((w) => w.id !== id);
      setWithdrawals(next);
      if (target) await syncGoalTotals(target.goalId, contributions, next);
    },
    [withdrawals, contributions, deleteTransferApi, syncGoalTotals],
  );

  const value = useMemo<SavingsContextValue>(
    () => ({
      ready,
      goals,
      contributions,
      withdrawals,
      contributionsFor,
      withdrawalsFor,
      savedFor,
      totalWithdrawnFor,
      addGoal,
      updateGoal,
      setGoalStatus,
      deleteGoal,
      addContribution,
      updateContribution,
      deleteContribution,
      addWithdrawal,
      updateWithdrawal,
      deleteWithdrawal,
      refresh,
    }),
    [
      ready,
      goals,
      contributions,
      withdrawals,
      contributionsFor,
      withdrawalsFor,
      savedFor,
      totalWithdrawnFor,
      addGoal,
      updateGoal,
      setGoalStatus,
      deleteGoal,
      addContribution,
      updateContribution,
      deleteContribution,
      addWithdrawal,
      updateWithdrawal,
      deleteWithdrawal,
      refresh,
    ],
  );

  return <SavingsContext.Provider value={value}>{children}</SavingsContext.Provider>;
}

export function useSavings() {
  const ctx = useContext(SavingsContext);
  if (!ctx) throw new Error("useSavings must be used inside SavingsProvider");
  return ctx;
}

/** Safe variant for shared hooks that may render outside the provider. */
export function useSavingsOptional() {
  return useContext(SavingsContext);
}
