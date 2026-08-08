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
import type {
  Account,
  AppData,
  Loan,
  LoanIncrease,
  LoanPayment,
  Transaction,
  Transfer,
  TransferCharge,
  TxType,
} from "@/types";
import { DEFAULT_ACCOUNTS, PROVIDER_DEFAULTS } from "@/constants";
import { supabase } from "@/lib/supabase";
import { today } from "@/lib/date";

/* ─── helpers ──────────────────────────────────────────────── */

const PROVIDER_MAP: Record<string, string> = {
  cash: "a0000000-0000-0000-0000-000000000001",
  bkash: "a0000000-0000-0000-0000-000000000002",
  nagad: "a0000000-0000-0000-0000-000000000003",
  rocket: "a0000000-0000-0000-0000-000000000004",
  bank: "a0000000-0000-0000-0000-000000000005",
};

function computeLoanStatus(
  isCompleted: boolean,
  paidAmount: number,
  totalAmount: number,
  dueDate?: string | null,
): Loan["status"] {
  if (isCompleted || paidAmount >= totalAmount) return "completed";
  if (dueDate && dueDate < today()) return "overdue";
  return "active";
}

/* ─── supabase row → app type mappers ─────────────────────── */

function rowToAccount(r: any): Account {
  return {
    id: r.id,
    name: r.name,
    icon: r.icon,
    color: r.color,
    type: r.type,
    openingBalance: Number(r.opening_balance),
    isDefault: r.is_default,
    providerId: r.provider_id ?? undefined,
  };
}

function rowToTransaction(r: any, catMap: Record<string, string>): Transaction {
  return {
    id: r.id,
    title: r.title,
    amount: Number(r.amount),
    type: r.is_income ? "income" : "expense",
    accountId: r.wallet_id,
    category: catMap[r.category_id] ?? r.category_id ?? "",
    date: r.transaction_date,
    createdAt: r.created_at,
    loanId: r.loan_id ?? undefined,
    loanPaymentId: r.loan_payment_id ?? undefined,
    loanIncreaseId: r.loan_increase_id ?? undefined,
  };
}

function rowToTransfer(r: any): Transfer {
  return {
    id: r.id,
    fromAccountId: r.from_wallet_id,
    toAccountId: r.to_wallet_id,
    amount: Number(r.amount),
    date: r.transfer_date,
    createdAt: r.created_at,
  };
}

function rowToLoan(r: any, payments: LoanPayment[], increases: LoanIncrease[]): Loan {
  const paidAmount = Number(r.paid_amount);
  const totalAmount = Number(r.total_amount);
  return {
    id: r.id,
    contactName: r.person_name,
    direction: r.is_receivable ? "receivable" : "payable",
    totalAmount,
    payments,
    increases,
    accountId: r.wallet_id,
    loanType: r.loan_type,
    loanDate: r.loan_date,
    dueDate: r.due_date ?? undefined,
    status: computeLoanStatus(r.is_completed, paidAmount, totalAmount, r.due_date),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function rowToLoanPayment(r: any): LoanPayment {
  return {
    id: r.id,
    date: r.payment_date,
    amount: Number(r.amount),
    accountId: r.account_id ?? undefined,
  };
}

function rowToLoanIncrease(r: any): LoanIncrease {
  return {
    id: r.id,
    date: r.increase_date,
    amount: Number(r.amount),
    accountId: r.account_id ?? undefined,
    isSpecialNumber: r.is_special_number ?? true,
  };
}

/* ─── supabase row → insert mappers ───────────────────────── */

function accountToRow(a: Account, userId: string) {
  return {
    name: a.name,
    icon: a.icon,
    color: a.color,
    type: a.type,
    opening_balance: a.openingBalance,
    is_default: a.isDefault ?? false,
    user_id: userId,
    provider_id: a.providerId ?? PROVIDER_MAP[a.type] ?? PROVIDER_MAP[a.id] ?? null,
  };
}

function transactionToRow(
  t: Omit<Transaction, "id" | "createdAt">,
  userId: string,
  catIdMap: Record<string, string>,
) {
  return {
    title: t.title,
    amount: t.amount,
    is_income: t.type === "income",
    wallet_id: t.accountId,
    category_id: catIdMap[t.category] ?? null,
    transaction_date: t.date,
    user_id: userId,
    loan_id: t.loanId ?? null,
    loan_payment_id: t.loanPaymentId ?? null,
    loan_increase_id: t.loanIncreaseId ?? null,
  };
}

function transferToRow(t: Omit<Transfer, "id" | "createdAt">, userId: string) {
  return {
    from_wallet_id: t.fromAccountId,
    to_wallet_id: t.toAccountId,
    amount: t.amount,
    transfer_date: t.date,
    user_id: userId,
  };
}

function loanToRow(
  l: Omit<Loan, "id" | "createdAt" | "updatedAt" | "payments" | "status">,
  userId: string,
) {
  return {
    person_name: l.contactName,
    is_receivable: l.direction === "receivable",
    total_amount: l.totalAmount,
    paid_amount: 0,
    remaining_amount: l.totalAmount,
    wallet_id: l.accountId,
    loan_type: l.loanType,
    loan_date: l.loanDate,
    due_date: l.dueDate ?? null,
    is_completed: false,
    user_id: userId,
  };
}

function loanPaymentToRow(p: Omit<LoanPayment, "id">, loanId: string, userId: string) {
  return {
    loan_id: loanId,
    amount: p.amount,
    payment_date: p.date,
    account_id: p.accountId ?? null,
    user_id: userId,
  };
}

function loanIncreaseToRow(inc: Omit<LoanIncrease, "id">, loanId: string, userId: string) {
  return {
    loan_id: loanId,
    amount: inc.amount,
    increase_date: inc.date,
    account_id: inc.accountId ?? null,
    is_special_number: inc.isSpecialNumber ?? true,
    user_id: userId,
  };
}

/* ─── interface ────────────────────────────────────────────── */

interface CategoryRow {
  id: string;
  name: string;
  is_income: boolean;
  is_default: boolean;
  is_enabled: boolean;
  user_id?: string | null;
}

interface FinanceContextValue extends AppData {
  ready: boolean;
  categories: CategoryRow[];
  incomeCategories: string[];
  expenseCategories: string[];
  transferCharges: TransferCharge[];
  addTransaction: (t: Omit<Transaction, "id" | "createdAt">) => Promise<boolean>;
  updateTransaction: (id: string, t: Omit<Transaction, "id" | "createdAt">) => void;
  deleteTransaction: (id: string) => void;
  addTransfer: (t: Omit<Transfer, "id" | "createdAt">) => void;
  deleteTransfer: (id: string) => void;
  addAccount: (a: Omit<Account, "id">) => void;
  updateAccount: (id: string, a: Omit<Account, "id">) => void;
  deleteAccount: (id: string) => void;
  addLoan: (l: Omit<Loan, "id" | "createdAt" | "updatedAt" | "payments" | "status">) => void;
  updateLoan: (id: string, l: Partial<Omit<Loan, "id" | "createdAt" | "payments">>) => void;
  deleteLoan: (id: string) => void;
  addLoanPayment: (loanId: string, p: Omit<LoanPayment, "id">) => void;
  deleteLoanPayment: (loanId: string, paymentId: string) => void;
  addLoanIncrease: (loanId: string, inc: Omit<LoanIncrease, "id">) => void;
  deleteLoanIncrease: (loanId: string, increaseId: string) => void;
  replaceAll: (data: AppData) => void;
  resetAll: () => void;
  addCategory: (name: string, isIncome: boolean) => Promise<void>;
  updateCategory: (id: string, name: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  toggleCategory: (id: string, enabled: boolean) => Promise<void>;
}

const FinanceContext = createContext<FinanceContextValue | null>(null);

/* ─── empty/default app data ───────────────────────────────── */

function emptyAppData(): AppData {
  return {
    accounts: [],
    transactions: [],
    transfers: [],
    loans: [],
  };
}

/* ─── category cache key: name (case-insensitive) + income flag ─── */

function catKey(name: string, isIncome: boolean) {
  return `${name.trim().toLowerCase()}|${isIncome ? "income" : "expense"}`;
}

/* ─── provider ─────────────────────────────────────────────── */

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(emptyAppData);
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [transferCharges, setTransferCharges] = useState<TransferCharge[]>([]);
  /** name+type → category id, so we never re-INSERT an existing category */
  const catCacheRef = useRef<Map<string, string>>(new Map());


  const patch = useCallback((fn: (d: AppData) => AppData) => setData((prev) => fn(prev)), []);

  /* ── load user & data on mount ──────────────────────────── */

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (cancelled) return;
        const uid = authData.user?.id;
        if (!uid) {
          setReady(true);
          return;
        }
        setUserId(uid);

        const [
          walletsRes,
          transactionsRes,
          transfersRes,
          loansRes,
          loanPaymentsRes,
          loanIncreasesRes,
          categoriesRes,
          userCategoriesRes,
          categorySettingsRes,
          transferChargesRes,
        ] = await Promise.all([
          supabase.from("wallets").select("*").eq("user_id", uid),
          supabase
            .from("transactions")
            .select("*")
            .eq("user_id", uid)
            .order("transaction_date", { ascending: false })
            .order("created_at", { ascending: false }),
          supabase.from("transfers").select("*").eq("user_id", uid),
          supabase.from("loans").select("*").eq("user_id", uid),
          supabase.from("loan_payments").select("*").eq("user_id", uid),
          supabase.from("loan_increases").select("*").eq("user_id", uid),
          // load default categories (no user_id column anymore)
          supabase.from("categories").select("*"),
          // load user's custom categories
          supabase.from("user_categories").select("*").eq("user_id", uid),
          // load per-user toggle overrides for default categories
          supabase.from("category_settings").select("*").eq("user_id", uid),
          // load transfer charges
          supabase.from("transfer_charges").select("*").eq("is_active", true),
        ]);

        if (cancelled) return;

        // Build a map: category_id → is_enabled from category_settings
        // A row in category_settings means is_enabled = false (disabled by user)
        const settingsMap = new Map<string, boolean>();
        (categorySettingsRes.data ?? []).forEach((s: any) => {
          settingsMap.set(s.category_id, s.is_enabled);
        });

        // Build category list from defaults + user custom categories
        const defaultCats = categoriesRes.data ?? [];
        const userCats = userCategoriesRes.data ?? [];

        const dbCategories: CategoryRow[] = [
          // Default categories (from categories table)
          ...defaultCats.map((c: any) => ({
            id: c.id,
            name: c.name,
            is_income: c.is_income,
            is_default: true,
            is_enabled: settingsMap.has(c.id) ? settingsMap.get(c.id)! : true,
            user_id: null as string | null,
          })),
          // User custom categories (from user_categories table)
          ...userCats.map((c: any) => ({
            id: c.id,
            name: c.name,
            is_income: c.is_income,
            is_default: false,
            is_enabled: c.is_enabled ?? true,
            user_id: c.user_id,
          })),
        ];

        setCategories(dbCategories);

        // Map transfer charges from DB
        const dbCharges: TransferCharge[] = (transferChargesRes.data ?? []).map((r: any) => ({
          id: r.id,
          fromProvider: r.from_provider,
          toProvider: r.to_provider,
          chargeRate: Number(r.charge_rate),
          flatFee: Number(r.flat_fee ?? 0),
          isSuperAgent: r.is_super_agent,
          label: r.label ?? null,
          isActive: r.is_active,
        }));
        setTransferCharges(dbCharges);

        // build category maps from BOTH tables (defaults + user custom)
        const catIdToName: Record<string, string> = {};
        const cache = new Map<string, string>();
        // Defaults first (always win in cache)
        defaultCats.forEach((c: any) => {
          catIdToName[c.id] = c.name;
          cache.set(catKey(c.name, !!c.is_income), c.id);
        });
        // User custom categories (only add if not already a default)
        userCats.forEach((c: any) => {
          catIdToName[c.id] = c.name;
          const key = catKey(c.name, !!c.is_income);
          if (!cache.has(key)) cache.set(key, c.id);
        });
        catCacheRef.current = cache;


        // wallets → accounts
        const dbWallets = (walletsRes.data ?? []).map(rowToAccount);

        // Merge DB wallets with DEFAULT_ACCOUNTS for in-memory frontend display
        // Old users with existing DB wallets won't get duplicate default cards!
        const mergedAccounts: Account[] = [...dbWallets];

        for (const def of DEFAULT_ACCOUNTS) {
          const alreadyExists = dbWallets.some((w) => {
            if (w.id === def.id || (w.providerId && def.providerId && w.providerId === def.providerId)) {
              return true;
            }
            const wName = w.name.trim().toLowerCase();
            const defName = def.name.trim().toLowerCase();
            if (wName === defName) return true;
            if (w.type === def.type && (w.type === "cash" || w.type === "bank")) return true;
            return false;
          });

          if (!alreadyExists) {
            mergedAccounts.push({ ...def });
          }
        }

        // transactions
        const transactions = (transactionsRes.data ?? []).map((r: any) =>
          rowToTransaction(r, catIdToName),
        );

        // transfers
        const transfers = (transfersRes.data ?? []).map(rowToTransfer);

        // loans + payments + increases
        const rawLoans = (loansRes.data ?? []) as any[];
        const rawPayments = (loanPaymentsRes.data ?? []) as any[];
        const rawIncreases = (loanIncreasesRes.data ?? []) as any[];

        const loans: Loan[] = rawLoans.map((lr) => {
          const pays = rawPayments.filter((p) => p.loan_id === lr.id).map(rowToLoanPayment);
          const incs = rawIncreases.filter((i) => i.loan_id === lr.id).map(rowToLoanIncrease);
          return rowToLoan(lr, pays, incs);
        });

        setData({ accounts: mergedAccounts, transactions, transfers, loans });
      } catch (err) {
        console.error("Failed to load data from Supabase", err);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /* ── category helper (name → id lookup, creating if needed) ── */

  const resolveCategoryId = useCallback(
    async (categoryName: string, isIncome: boolean): Promise<string | null> => {
      if (!userId) return null;
      const name = categoryName.trim();
      if (!name) return null;

      const key = catKey(name, isIncome);

      // 1) in-memory cache (built at load + updated on every create)
      const cached = catCacheRef.current.get(key);
      if (cached) return cached;

      // 2) look up in categories table (default categories, user_id IS NULL)
      const { data: defaultMatch } = await supabase
        .from("categories")
        .select("id")
        .ilike("name", name)
        .eq("is_income", isIncome)
        .is("user_id", null)
        .maybeSingle();

      if (defaultMatch) {
        catCacheRef.current.set(key, defaultMatch.id);
        return defaultMatch.id;
      }

      // 3) look up in user_categories table (user custom categories)
      const { data: userMatch } = await supabase
        .from("user_categories")
        .select("id")
        .ilike("name", name)
        .eq("is_income", isIncome)
        .eq("user_id", userId)
        .maybeSingle();

      if (userMatch) {
        catCacheRef.current.set(key, userMatch.id);
        return userMatch.id;
      }

      // 4) genuinely new → create in user_categories table
      const { data: created, error: createErr } = await supabase
        .from("user_categories")
        .insert({
          name,
          is_income: isIncome,
          is_enabled: true,
          user_id: userId,
        })
        .select("id,name,is_income")
        .single();

      if (createErr || !created) {
        console.error("resolveCategoryId create failed", createErr);
        return null;
      }

      catCacheRef.current.set(key, created.id);
      setCategories((prev) => [
        ...prev,
        {
          id: created.id,
          name: created.name,
          is_income: created.is_income,
          is_default: false,
          is_enabled: true,
          user_id: userId,
        },
      ]);
      return created.id;
    },
    [userId],
  );


  /* ─── wallet auto-create (for virtual / provider-only accounts) ── */

  /**
   * If `accountId` is a virtual account (provider UUID, no wallet row yet),
   * insert a wallet row and return the new wallet ID.
   * If it's already a real wallet, return the same ID.
   */
  const ensureWallet = useCallback(
    async (accountId: string): Promise<string> => {
      if (!userId) return accountId;

      const acct = data.accounts.find((a) => a.id === accountId);
      if (!acct) return accountId;

      // Check if this ID is a real wallet (exists in DB wallets table)
      const { data: existing } = await supabase
        .from("wallets")
        .select("id")
        .eq("id", accountId)
        .maybeSingle();

      if (existing) return accountId;

      // Virtual account (no DB row yet) → create wallet row in DB upon first entry
      const { data: newRow } = await supabase
        .from("wallets")
        .insert(accountToRow({ ...acct, id: "" }, userId))
        .select()
        .single();

      if (!newRow) return accountId;

      const created = rowToAccount(newRow);
      // Update state: replace virtual placeholder with real wallet
      patch((prev) => ({
        ...prev,
        accounts: prev.accounts.map((a) => (a.id === accountId ? created : a)),
      }));
      return created.id;
    },
    [userId, data.accounts, patch],
  );


  /* ─── CRUD ──────────────────────────────────────────────── */

  const addTransaction = useCallback(
    (t: Omit<Transaction, "id" | "createdAt">): Promise<boolean> => {
      if (!userId) return Promise.resolve(false);
      return (async () => {
        try {
          const rawWalletId =
            data.accounts.find((a) => a.id === t.accountId)?.id ??
            data.accounts.find(
              (a) => a.type === t.accountId || a.name.toLowerCase() === t.accountId.toLowerCase(),
            )?.id ??
            data.accounts[0]?.id ??
            t.accountId;

          // Auto-create wallet if it's a virtual provider account
          const walletId = await ensureWallet(rawWalletId);

          const txData = { ...t, accountId: walletId };
          const catId = await resolveCategoryId(t.category, t.type === "income");
          const { data: row, error } = await supabase
            .from("transactions")
            .insert({
              ...transactionToRow(txData, userId, {}),
              category_id: catId,
            })
            .select()
            .single();

          if (error) {
            console.error("addTransaction Supabase error:", error);
            return false;
          }
          if (row) {
            const catMap: Record<string, string> = {};
            if (catId) catMap[catId] = t.category;
            patch((d) => ({
              ...d,
              transactions: [rowToTransaction(row, catMap), ...d.transactions],
            }));
            return true;
          }
          return false;
        } catch (err) {
          console.error("addTransaction failed", err);
          return false;
        }
      })();
    },
    [userId, data.accounts, patch, resolveCategoryId, ensureWallet],
  );

  const updateTransaction = useCallback(
    (id: string, t: Omit<Transaction, "id" | "createdAt">) => {
      if (!userId) return;
      (async () => {
        try {
          const rawWalletId =
            data.accounts.find((a) => a.id === t.accountId)?.id ??
            data.accounts.find(
              (a) => a.type === t.accountId || a.name.toLowerCase() === t.accountId.toLowerCase(),
            )?.id ??
            data.accounts[0]?.id ??
            t.accountId;

          const walletId = await ensureWallet(rawWalletId);

          const catId = await resolveCategoryId(t.category, t.type === "income");
          const { error } = await supabase
            .from("transactions")
            .update({
              title: t.title,
              amount: t.amount,
              is_income: t.type === "income",
              wallet_id: walletId,
              category_id: catId,
              transaction_date: t.date,
              loan_id: t.loanId ?? null,
              loan_payment_id: t.loanPaymentId ?? null,
              loan_increase_id: t.loanIncreaseId ?? null,
            })
            .eq("id", id);

          if (error) {
            console.error("updateTransaction Supabase error:", error);
          }
          if (!error) {
            patch((d) => ({
              ...d,
              transactions: d.transactions.map((x) =>
                x.id === id ? { ...x, ...t, accountId: walletId } : x,
              ),
            }));
          }
        } catch (err) {
          console.error("updateTransaction failed", err);
        }
      })();
    },
    [userId, data.accounts, patch, resolveCategoryId, ensureWallet],
  );

  const deleteTransaction = useCallback(
    (id: string) => {
      if (!userId) return;
      (async () => {
        try {
          await supabase.from("transactions").delete().eq("id", id);
          patch((d) => ({
            ...d,
            transactions: d.transactions.filter((x) => x.id !== id),
          }));
        } catch (err) {
          console.error("deleteTransaction failed", err);
        }
      })();
    },
    [userId, patch],
  );

  const addTransfer = useCallback(
    (t: Omit<Transfer, "id" | "createdAt">) => {
      if (!userId) return;
      (async () => {
        try {
          // Auto-create wallets if they are virtual provider accounts
          const fromId = await ensureWallet(t.fromAccountId);
          const toId = await ensureWallet(t.toAccountId);
          const resolved = { ...t, fromAccountId: fromId, toAccountId: toId };

          const { data: row } = await supabase
            .from("transfers")
            .insert(transferToRow(resolved, userId))
            .select()
            .single();
          if (row) {
            patch((d) => ({
              ...d,
              transfers: [rowToTransfer(row), ...d.transfers],
            }));
          }
        } catch (err) {
          console.error("addTransfer failed", err);
        }
      })();
    },
    [userId, patch, ensureWallet],
  );

  const deleteTransfer = useCallback(
    (id: string) => {
      if (!userId) return;
      (async () => {
        try {
          // Find the transfer so we can locate its charge transaction
          const transfer = data.transfers.find((t) => t.id === id);

          await supabase.from("transfers").delete().eq("id", id);

          // Find and delete the associated "Transfer Charge" transaction
          let chargeId: string | null = null;
          if (transfer) {
            const chargeTx = data.transactions.find(
              (tx) =>
                tx.category === "Transfer Charge" &&
                tx.accountId === transfer.fromAccountId &&
                tx.date === transfer.date &&
                tx.type === "expense",
            );
            if (chargeTx) {
              chargeId = chargeTx.id;
              await supabase.from("transactions").delete().eq("id", chargeTx.id);
            }
          }

          patch((d) => ({
            ...d,
            transfers: d.transfers.filter((x) => x.id !== id),
            transactions: chargeId
              ? d.transactions.filter((x) => x.id !== chargeId)
              : d.transactions,
          }));
        } catch (err) {
          console.error("deleteTransfer failed", err);
        }
      })();
    },
    [userId, data.transfers, data.transactions, patch],
  );

  const addAccount = useCallback(
    (a: Omit<Account, "id">) => {
      if (!userId) return;
      (async () => {
        try {
          const { data: row } = await supabase
            .from("wallets")
            .insert(accountToRow({ ...a, id: "" }, userId))
            .select()
            .single();
          if (row) {
            patch((d) => ({
              ...d,
              accounts: [...d.accounts, rowToAccount(row)],
            }));
          }
        } catch (err) {
          console.error("addAccount failed", err);
        }
      })();
    },
    [userId, patch],
  );

  const updateAccount = useCallback(
    (id: string, a: Omit<Account, "id">) => {
      if (!userId) return;
      (async () => {
        try {
          const { data: existing } = await supabase
            .from("wallets")
            .select("id")
            .eq("id", id)
            .maybeSingle();

          if (!existing) {
            const { data: row } = await supabase
              .from("wallets")
              .insert(accountToRow({ ...a, id: "" }, userId))
              .select()
              .single();
            if (row) {
              const created = rowToAccount(row);
              patch((d) => ({
                ...d,
                accounts: d.accounts.map((x) => (x.id === id ? created : x)),
              }));
            }
          } else {
            const { error } = await supabase
              .from("wallets")
              .update({
                name: a.name,
                icon: a.icon,
                color: a.color,
                type: a.type,
                opening_balance: a.openingBalance,
                is_default: a.isDefault ?? false,
                provider_id: a.providerId ?? PROVIDER_MAP[a.type] ?? null,
              })
              .eq("id", id);
            if (!error) {
              patch((d) => ({
                ...d,
                accounts: d.accounts.map((x) => (x.id === id ? { ...x, ...a } : x)),
              }));
            }
          }
        } catch (err) {
          console.error("updateAccount failed", err);
        }
      })();
    },
    [userId, patch],
  );

  const deleteAccount = useCallback(
    (id: string) => {
      if (!userId) return;
      (async () => {
        try {
          // delete related transactions
          await supabase.from("transactions").delete().eq("wallet_id", id);
          // delete related transfers
          await supabase
            .from("transfers")
            .delete()
            .or(`from_wallet_id.eq.${id},to_wallet_id.eq.${id}`);
          // delete wallet
          await supabase.from("wallets").delete().eq("id", id);
          patch((d) => ({
            ...d,
            accounts: d.accounts.filter((x) => x.id !== id),
            transactions: d.transactions.filter((x) => x.accountId !== id),
            transfers: d.transfers.filter((x) => x.fromAccountId !== id && x.toAccountId !== id),
          }));
        } catch (err) {
          console.error("deleteAccount failed", err);
        }
      })();
    },
    [userId, patch],
  );

  const addLoan = useCallback(
    (l: Omit<Loan, "id" | "createdAt" | "updatedAt" | "payments" | "status">) => {
      if (!userId) return;
      (async () => {
        try {
          const isReceivable = l.direction === "receivable";
          const now = new Date().toISOString();
          const loanDate = l.loanDate;

          // 0. ensure wallet exists
          const walletId = await ensureWallet(l.accountId);

          // 1. insert loan
          const { data: loanRow } = await supabase
            .from("loans")
            .insert({ ...loanToRow(l, userId), wallet_id: walletId })
            .select()
            .single();
          if (!loanRow) return;

          // 2. resolve category for initial tx
          const initCategory = isReceivable ? "Loan Given" : "Loan Taken";
          const catId = await resolveCategoryId(initCategory, !isReceivable);

          // 3. insert initial transaction
          const { data: txRow } = await supabase
            .from("transactions")
            .insert({
              title: isReceivable ? `Loan to ${l.contactName}` : `Loan from ${l.contactName}`,
              amount: l.totalAmount,
              is_income: !isReceivable,
              wallet_id: walletId,
              category_id: catId,
              transaction_date: loanDate,
              user_id: userId,
              loan_id: loanRow.id,
            })
            .select()
            .single();

          const catMap: Record<string, string> = {};
          if (catId) catMap[catId] = initCategory;

          patch((d) => {
            const newLoan: Loan = {
              ...l,
              accountId: walletId,
              id: loanRow.id,
              payments: [],
              increases: [],
              status: "active",
              createdAt: loanRow.created_at,
              updatedAt: loanRow.updated_at,
            };
            const newTx = txRow
              ? rowToTransaction(txRow, catMap)
              : {
                  id: "temp",
                  title: isReceivable ? `Loan to ${l.contactName}` : `Loan from ${l.contactName}`,
                  amount: l.totalAmount,
                  type: (isReceivable ? "expense" : "income") as TxType,
                  accountId: walletId,
                  category: initCategory,
                  date: loanDate,
                  createdAt: now,
                  loanId: loanRow.id,
                };
            return {
              ...d,
              loans: [newLoan, ...d.loans],
              transactions: [newTx, ...d.transactions],
            };
          });
        } catch (err) {
          console.error("addLoan failed", err);
        }
      })();
    },
    [userId, patch, resolveCategoryId, ensureWallet],
  );

  const updateLoan = useCallback(
    (id: string, l: Partial<Omit<Loan, "id" | "createdAt" | "payments">>) => {
      if (!userId) return;
      (async () => {
        try {
          const now = new Date().toISOString();
          const existingLoan = data.loans.find((x) => x.id === id);

          // update loan row
          const updatePayload: Record<string, any> = {};
          if (l.contactName !== undefined) updatePayload.person_name = l.contactName;
          if (l.direction !== undefined) updatePayload.is_receivable = l.direction === "receivable";
          if (l.totalAmount !== undefined) updatePayload.total_amount = l.totalAmount;
          if (l.accountId !== undefined) updatePayload.wallet_id = l.accountId;
          if (l.loanType !== undefined) updatePayload.loan_type = l.loanType;
          if (l.loanDate !== undefined) updatePayload.loan_date = l.loanDate;
          if (l.dueDate !== undefined) updatePayload.due_date = l.dueDate ?? null;
          updatePayload.updated_at = now;

          await supabase.from("loans").update(updatePayload).eq("id", id);

          // find & update the initial transaction (the one with loanId === id and no loanPaymentId/loanIncreaseId)
          const dir = l.direction ?? existingLoan?.direction ?? "receivable";
          const contact = l.contactName ?? existingLoan?.contactName ?? "";
          const isReceivable = dir === "receivable";
          const initCat = isReceivable ? "Loan Given" : "Loan Taken";
          const catId = await resolveCategoryId(initCat, !isReceivable);

          const initTx = data.transactions.find(
            (tx) => tx.loanId === id && !tx.loanPaymentId && !tx.loanIncreaseId,
          );
          if (initTx) {
            await supabase
              .from("transactions")
              .update({
                title: isReceivable ? `Loan to ${contact}` : `Loan from ${contact}`,
                amount: l.totalAmount ?? initTx.amount,
                is_income: !isReceivable,
                wallet_id: l.accountId ?? initTx.accountId,
                category_id: catId,
                transaction_date: l.loanDate ?? initTx.date,
              })
              .eq("id", initTx.id);
          }

          patch((d) => {
            const updatedLoans = d.loans.map((x) =>
              x.id === id ? { ...x, ...l, updatedAt: now } : x,
            );
            const updatedTransactions = d.transactions.map((tx) => {
              if (tx.loanId === id && !tx.loanPaymentId && !tx.loanIncreaseId) {
                return {
                  ...tx,
                  title: isReceivable ? `Loan to ${contact}` : `Loan from ${contact}`,
                  amount: l.totalAmount ?? tx.amount,
                  type: (isReceivable ? "expense" : "income") as TxType,
                  accountId: l.accountId ?? tx.accountId,
                  category: initCat,
                  date: l.loanDate ?? tx.date,
                };
              }
              return tx;
            });
            return { ...d, loans: updatedLoans, transactions: updatedTransactions };
          });
        } catch (err) {
          console.error("updateLoan failed", err);
        }
      })();
    },
    [userId, patch, data.loans, data.transactions, resolveCategoryId],
  );

  const deleteLoan = useCallback(
    (id: string) => {
      if (!userId) return;
      (async () => {
        try {
          // delete related transactions
          await supabase.from("transactions").delete().eq("loan_id", id);
          // delete payments & increases
          await supabase.from("loan_payments").delete().eq("loan_id", id);
          await supabase.from("loan_increases").delete().eq("loan_id", id);
          // delete loan
          await supabase.from("loans").delete().eq("id", id);
          patch((d) => ({
            ...d,
            loans: d.loans.filter((x) => x.id !== id),
            transactions: d.transactions.filter((tx) => tx.loanId !== id),
          }));
        } catch (err) {
          console.error("deleteLoan failed", err);
        }
      })();
    },
    [userId, patch],
  );

  const addLoanPayment = useCallback(
    (loanId: string, p: Omit<LoanPayment, "id">) => {
      if (!userId) return;
      (async () => {
        try {
          const targetLoan = data.loans.find((l) => l.id === loanId);
          if (!targetLoan) return;

          // 0. ensure wallet exists
          const accountId = await ensureWallet(p.accountId || targetLoan.accountId);

          // 1. insert payment
          const { data: payRow } = await supabase
            .from("loan_payments")
            .insert({ ...loanPaymentToRow(p, loanId, userId), account_id: accountId })
            .select()
            .single();
          if (!payRow) return;

          const newPayments = [...targetLoan.payments, rowToLoanPayment(payRow)];
          const newPaid = newPayments.reduce((s, x) => s + x.amount, 0);
          const isCompleted = newPaid >= targetLoan.totalAmount;
          const newStatus = computeLoanStatus(
            isCompleted,
            newPaid,
            targetLoan.totalAmount,
            targetLoan.dueDate,
          );

          // 2. update loan
          await supabase
            .from("loans")
            .update({
              paid_amount: newPaid,
              remaining_amount: Math.max(0, targetLoan.totalAmount - newPaid),
              is_completed: isCompleted,
              updated_at: new Date().toISOString(),
            })
            .eq("id", loanId);

          // 3. insert transaction
          const isReceivable = targetLoan.direction === "receivable";
          const txCategory = isReceivable ? "Loan Repayment" : "Loan Payment";
          const catId = await resolveCategoryId(txCategory, isReceivable);

          const { data: txRow } = await supabase
            .from("transactions")
            .insert({
              title: isReceivable
                ? `Loan Repayment from ${targetLoan.contactName}`
                : `Loan Repayment to ${targetLoan.contactName}`,
              amount: p.amount,
              is_income: isReceivable,
              wallet_id: accountId,
              category_id: catId,
              transaction_date: p.date,
              user_id: userId,
              loan_id: loanId,
              loan_payment_id: payRow.id,
            })
            .select()
            .single();

          const catMap: Record<string, string> = {};
          if (catId) catMap[catId] = txCategory;

          patch((d) => {
            const updatedLoans = d.loans.map((loan) =>
              loan.id === loanId
                ? {
                    ...loan,
                    payments: newPayments,
                    status: newStatus,
                    updatedAt: new Date().toISOString(),
                  }
                : loan,
            );
            const newTx = txRow
              ? rowToTransaction(txRow, catMap)
              : {
                  id: payRow.id,
                  title: isReceivable
                    ? `Loan Repayment from ${targetLoan.contactName}`
                    : `Loan Repayment to ${targetLoan.contactName}`,
                  amount: p.amount,
                  type: (isReceivable ? "income" : "expense") as TxType,
                  accountId,
                  category: txCategory,
                  date: p.date,
                  createdAt: new Date().toISOString(),
                  loanId,
                  loanPaymentId: payRow.id,
                };
            return {
              ...d,
              loans: updatedLoans,
              transactions: [newTx, ...d.transactions],
            };
          });
        } catch (err) {
          console.error("addLoanPayment failed", err);
        }
      })();
    },
    [userId, patch, data.loans, resolveCategoryId, ensureWallet],
  );

  const deleteLoanPayment = useCallback(
    (loanId: string, paymentId: string) => {
      if (!userId) return;
      (async () => {
        try {
          const targetLoan = data.loans.find((l) => l.id === loanId);
          if (!targetLoan) return;

          // 1. delete payment
          await supabase.from("loan_payments").delete().eq("id", paymentId);

          const newPayments = targetLoan.payments.filter((p) => p.id !== paymentId);
          const newPaid = newPayments.reduce((s, x) => s + x.amount, 0);
          const isCompleted = newPaid >= targetLoan.totalAmount;
          const newStatus = computeLoanStatus(
            isCompleted,
            newPaid,
            targetLoan.totalAmount,
            targetLoan.dueDate,
          );

          // 2. update loan
          await supabase
            .from("loans")
            .update({
              paid_amount: newPaid,
              remaining_amount: Math.max(0, targetLoan.totalAmount - newPaid),
              is_completed: isCompleted,
              updated_at: new Date().toISOString(),
            })
            .eq("id", loanId);

          // 3. delete transaction
          await supabase.from("transactions").delete().eq("loan_payment_id", paymentId);

          patch((d) => {
            const updatedLoans = d.loans.map((loan) =>
              loan.id === loanId
                ? {
                    ...loan,
                    payments: newPayments,
                    status: newStatus,
                    updatedAt: new Date().toISOString(),
                  }
                : loan,
            );
            return {
              ...d,
              loans: updatedLoans,
              transactions: d.transactions.filter((tx) => tx.loanPaymentId !== paymentId),
            };
          });
        } catch (err) {
          console.error("deleteLoanPayment failed", err);
        }
      })();
    },
    [userId, patch, data.loans],
  );

  const addLoanIncrease = useCallback(
    (loanId: string, inc: Omit<LoanIncrease, "id">) => {
      if (!userId) return;
      (async () => {
        try {
          const targetLoan = data.loans.find((l) => l.id === loanId);
          if (!targetLoan) return;

          // 0. ensure wallet exists
          const accountId = await ensureWallet(inc.accountId || targetLoan.accountId);

          // 1. insert increase
          const { data: incRow } = await supabase
            .from("loan_increases")
            .insert({ ...loanIncreaseToRow(inc, loanId, userId), account_id: accountId })
            .select()
            .single();
          if (!incRow) return;

          const newIncreases = [...(targetLoan.increases ?? []), rowToLoanIncrease(incRow)];
          const newTotal = targetLoan.totalAmount + inc.amount;
          const paid = targetLoan.payments.reduce((s, x) => s + x.amount, 0);
          const isCompleted = paid >= newTotal;
          const newStatus = computeLoanStatus(isCompleted, paid, newTotal, targetLoan.dueDate);

          // 2. update loan total
          await supabase
            .from("loans")
            .update({
              total_amount: newTotal,
              remaining_amount: Math.max(0, newTotal - paid),
              is_completed: isCompleted,
              updated_at: new Date().toISOString(),
            })
            .eq("id", loanId);

          // 3. insert transaction
          const isReceivable = targetLoan.direction === "receivable";
          const txCategory = isReceivable ? "Loan Given" : "Loan Taken";
          const catId = await resolveCategoryId(txCategory, !isReceivable);

          const { data: txRow } = await supabase
            .from("transactions")
            .insert({
              title: isReceivable
                ? `Additional Loan Given to ${targetLoan.contactName}`
                : `Additional Loan Taken from ${targetLoan.contactName}`,
              amount: inc.amount,
              is_income: !isReceivable,
              wallet_id: accountId,
              category_id: catId,
              transaction_date: inc.date,
              user_id: userId,
              loan_id: loanId,
              loan_increase_id: incRow.id,
            })
            .select()
            .single();

          const catMap: Record<string, string> = {};
          if (catId) catMap[catId] = txCategory;

          patch((d) => {
            const updatedLoans = d.loans.map((loan) =>
              loan.id === loanId
                ? {
                    ...loan,
                    totalAmount: newTotal,
                    increases: newIncreases,
                    status: newStatus,
                    updatedAt: new Date().toISOString(),
                  }
                : loan,
            );
            const newTx = txRow
              ? rowToTransaction(txRow, catMap)
              : {
                  id: incRow.id,
                  title: isReceivable
                    ? `Additional Loan Given to ${targetLoan.contactName}`
                    : `Additional Loan Taken from ${targetLoan.contactName}`,
                  amount: inc.amount,
                  type: (isReceivable ? "expense" : "income") as TxType,
                  accountId,
                  category: txCategory,
                  date: inc.date,
                  createdAt: new Date().toISOString(),
                  loanId,
                  loanIncreaseId: incRow.id,
                };
            return {
              ...d,
              loans: updatedLoans,
              transactions: [newTx, ...d.transactions],
            };
          });
        } catch (err) {
          console.error("addLoanIncrease failed", err);
        }
      })();
    },
    [userId, patch, data.loans, resolveCategoryId, ensureWallet],
  );

  const deleteLoanIncrease = useCallback(
    (loanId: string, increaseId: string) => {
      if (!userId) return;
      (async () => {
        try {
          const targetLoan = data.loans.find((l) => l.id === loanId);
          if (!targetLoan) return;

          const targetIncrease = targetLoan.increases?.find((inc) => inc.id === increaseId);
          if (!targetIncrease) return;

          // 1. delete increase
          await supabase.from("loan_increases").delete().eq("id", increaseId);

          const newIncreases = targetLoan.increases?.filter((inc) => inc.id !== increaseId) ?? [];
          const newTotal = Math.max(0, targetLoan.totalAmount - targetIncrease.amount);
          const paid = targetLoan.payments.reduce((s, x) => s + x.amount, 0);
          const isCompleted = paid >= newTotal;
          const newStatus = computeLoanStatus(isCompleted, paid, newTotal, targetLoan.dueDate);

          // 2. update loan total
          await supabase
            .from("loans")
            .update({
              total_amount: newTotal,
              remaining_amount: Math.max(0, newTotal - paid),
              is_completed: isCompleted,
              updated_at: new Date().toISOString(),
            })
            .eq("id", loanId);

          // 3. delete transaction
          await supabase.from("transactions").delete().eq("loan_increase_id", increaseId);

          patch((d) => {
            const updatedLoans = d.loans.map((loan) =>
              loan.id === loanId
                ? {
                    ...loan,
                    totalAmount: newTotal,
                    increases: newIncreases,
                    status: newStatus,
                    updatedAt: new Date().toISOString(),
                  }
                : loan,
            );
            return {
              ...d,
              loans: updatedLoans,
              transactions: d.transactions.filter((tx) => tx.loanIncreaseId !== increaseId),
            };
          });
        } catch (err) {
          console.error("deleteLoanIncrease failed", err);
        }
      })();
    },
    [userId, patch, data.loans],
  );

  const replaceAll = useCallback(
    (next: AppData) => {
      if (!userId) return;
      (async () => {
        try {
          // delete all existing user data
          await Promise.all([
            supabase.from("transactions").delete().eq("user_id", userId),
            supabase.from("transfers").delete().eq("user_id", userId),
            supabase.from("wallets").delete().eq("user_id", userId),
            supabase.from("loan_payments").delete().eq("user_id", userId),
            supabase.from("loan_increases").delete().eq("user_id", userId),
            supabase.from("loans").delete().eq("user_id", userId),
          ]);

          // build category maps from both categories and user_categories tables
          const catNameToId: Record<string, string> = {};
          const { data: cats } = await supabase
            .from("categories")
            .select("id,name");
          (cats ?? []).forEach((c: any) => {
            catNameToId[c.name] = c.id;
          });
          const { data: userCats } = await supabase
            .from("user_categories")
            .select("id,name")
            .eq("user_id", userId);
          (userCats ?? []).forEach((c: any) => {
            catNameToId[c.name] = c.id;
          });

          // insert wallets
          const walletIdMap: Record<string, string> = {};
          for (const acc of next.accounts) {
            const { data: row } = await supabase
              .from("wallets")
              .insert(accountToRow(acc, userId))
              .select()
              .single();
            if (row) walletIdMap[acc.id] = row.id;
          }

          // insert transactions
          for (const tx of next.transactions) {
            const walletId = walletIdMap[tx.accountId] ?? tx.accountId;
            const catId = catNameToId[tx.category] ?? null;
            await supabase.from("transactions").insert({
              ...transactionToRow({ ...tx, accountId: walletId }, userId, {}),
              category_id: catId,
            });
          }

          // insert transfers
          for (const tr of next.transfers) {
            await supabase.from("transfers").insert(
              transferToRow(
                {
                  ...tr,
                  fromAccountId: walletIdMap[tr.fromAccountId] ?? tr.fromAccountId,
                  toAccountId: walletIdMap[tr.toAccountId] ?? tr.toAccountId,
                },
                userId,
              ),
            );
          }

          // insert loans
          for (const loan of next.loans) {
            const walletId = walletIdMap[loan.accountId] ?? loan.accountId;
            const { data: loanRow } = await supabase
              .from("loans")
              .insert(loanToRow({ ...loan, accountId: walletId }, userId))
              .select()
              .single();
            if (!loanRow) continue;

            // insert loan payments
            for (const pay of loan.payments) {
              await supabase
                .from("loan_payments")
                .insert(loanPaymentToRow(pay, loanRow.id, userId));
            }
            // insert loan increases
            for (const inc of loan.increases ?? []) {
              await supabase
                .from("loan_increases")
                .insert(loanIncreaseToRow(inc, loanRow.id, userId));
            }
          }

          setData(next);
        } catch (err) {
          console.error("replaceAll failed", err);
        }
      })();
    },
    [userId],
  );

  const resetAll = useCallback(() => {
    if (!userId) return;
    (async () => {
      try {
        await Promise.all([
          supabase.from("transactions").delete().eq("user_id", userId),
          supabase.from("transfers").delete().eq("user_id", userId),
          supabase.from("wallets").delete().eq("user_id", userId),
          supabase.from("loan_payments").delete().eq("user_id", userId),
          supabase.from("loan_increases").delete().eq("user_id", userId),
          supabase.from("loans").delete().eq("user_id", userId),
        ]);
        setData(emptyAppData());
      } catch (err) {
        console.error("resetAll failed", err);
      }
    })();
  }, [userId]);

  /* ─── category CRUD ─────────────────────────────────────── */

  const addCategory = useCallback(
    async (name: string, isIncome: boolean) => {
      if (!userId) return;
      const trimmed = name.trim();
      if (!trimmed) return;

      // Guard: same name + type already exists (locally — including shared defaults)
      const key = catKey(trimmed, isIncome);
      if (
        catCacheRef.current.has(key) ||
        categories.some((c) => catKey(c.name, c.is_income) === key)
      ) {
        console.warn("addCategory skipped — category already exists:", trimmed);
        return;
      }

      // Insert into user_categories table
      const { data, error } = await supabase
        .from("user_categories")
        .insert({
          name: trimmed,
          is_income: isIncome,
          is_enabled: true,
          user_id: userId,
        })
        .select()
        .single();

      if (error) {
        console.error("addCategory failed", error);
        return;
      }
      if (data) {
        catCacheRef.current.set(key, data.id);
        setCategories((prev) => [
          ...prev,
          {
            id: data.id,
            name: data.name,
            is_income: data.is_income,
            is_default: false,
            is_enabled: true,
            user_id: userId,
          },
        ]);
      }
    },
    [userId, categories],
  );


  const updateCategory = useCallback(
    async (id: string, name: string) => {
      if (!userId) return;
      const cat = categories.find((c) => c.id === id);
      // Only user-owned (non-default) categories can be renamed
      if (!cat || cat.is_default) return;
      const trimmed = name.trim();
      if (!trimmed) return;

      const { error } = await supabase
        .from("user_categories")
        .update({ name: trimmed, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", userId);

      if (error) {
        console.error("updateCategory failed", error);
        return;
      }
      // keep the dedupe cache in sync with the new name
      catCacheRef.current.delete(catKey(cat.name, cat.is_income));
      catCacheRef.current.set(catKey(trimmed, cat.is_income), id);
      setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, name: trimmed } : c)));
    },
    [userId, categories],
  );

  const deleteCategory = useCallback(
    async (id: string) => {
      if (!userId) return;

      const cat = categories.find((c) => c.id === id);
      // Only user-owned (non-default) categories can be deleted
      if (!cat || cat.is_default) return;

      // Clean up any category_settings rows for this category (safety)
      await supabase
        .from("category_settings")
        .delete()
        .eq("category_id", id)
        .eq("user_id", userId);

      // Unlink any transactions still referencing this category to avoid the
      // FK constraint (transactions_category_id_fkey) from blocking the delete.
      const { error: unlinkError } = await supabase
        .from("transactions")
        .update({ category_id: null })
        .eq("category_id", id)
        .eq("user_id", userId);

      if (unlinkError) {
        console.error("deleteCategory – unlink transactions failed", unlinkError);
        throw unlinkError;
      }

      const { error } = await supabase
        .from("user_categories")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);
      if (error) {
        console.error("deleteCategory failed", error);
        throw error;
      }
      catCacheRef.current.delete(catKey(cat.name, cat.is_income));
      setCategories((prev) => prev.filter((c) => c.id !== id));

      // Clear the category label on any local transaction that had this category
      patch((d) => ({
        ...d,
        transactions: d.transactions.map((t) =>
          t.category === cat.name ? { ...t, category: "" } : t,
        ),
      }));
    },
    [userId, categories, patch],
  );

  const toggleCategory = useCallback(
    async (id: string, enabled: boolean) => {
      if (!userId) return;

      const cat = categories.find((c) => c.id === id);
      if (!cat) return;

      if (cat.is_default) {
        // ── Default category: use category_settings table ──────────────
        if (enabled) {
          const { error } = await supabase
            .from("category_settings")
            .delete()
            .eq("user_id", userId)
            .eq("category_id", id);
          if (error) {
            console.error("toggleCategory (default→enable) failed", error);
            return;
          }
        } else {
          const { error } = await supabase
            .from("category_settings")
            .upsert(
              { user_id: userId, category_id: id, is_enabled: false },
              { onConflict: "user_id,category_id" },
            );
          if (error) {
            console.error("toggleCategory (default→disable) failed", error);
            return;
          }
        }
      } else {
        // ── User custom category: toggle user_categories.is_enabled ──
        const { error } = await supabase
          .from("user_categories")
          .update({ is_enabled: enabled, updated_at: new Date().toISOString() })
          .eq("id", id)
          .eq("user_id", userId);

        if (error) {
          console.error("toggleCategory (custom) failed", error);
          return;
        }
      }

      // Update local state
      setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, is_enabled: enabled } : c)));
    },
    [userId, categories],
  );

  /* ─── memoised value ────────────────────────────────────── */

  const incomeCategories = useMemo(
    () =>
      Array.from(
        new Set(
          categories
            .filter((c) => c.is_income && c.is_enabled)
            .map((c) => c.name),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [categories],
  );
  const expenseCategories = useMemo(
    () =>
      Array.from(
        new Set(
          categories
            .filter((c) => !c.is_income && c.is_enabled)
            .map((c) => c.name),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [categories],
  );

  const value = useMemo<FinanceContextValue>(
    () => ({
      ...data,
      ready,
      categories,
      incomeCategories,
      expenseCategories,
      transferCharges,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      addTransfer,
      deleteTransfer,
      addAccount,
      updateAccount,
      deleteAccount,
      addLoan,
      updateLoan,
      deleteLoan,
      addLoanPayment,
      deleteLoanPayment,
      addLoanIncrease,
      deleteLoanIncrease,
      replaceAll,
      resetAll,
      addCategory,
      updateCategory,
      deleteCategory,
      toggleCategory,
    }),
    [
      data,
      ready,
      categories,
      incomeCategories,
      expenseCategories,
      transferCharges,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      addTransfer,
      deleteTransfer,
      addAccount,
      updateAccount,
      deleteAccount,
      addLoan,
      updateLoan,
      deleteLoan,
      addLoanPayment,
      deleteLoanPayment,
      addLoanIncrease,
      deleteLoanIncrease,
      replaceAll,
      resetAll,
      addCategory,
      updateCategory,
      deleteCategory,
      toggleCategory,
    ],
  );

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error("useFinance must be used inside FinanceProvider");
  return ctx;
}
