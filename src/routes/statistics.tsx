import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import dayjs from "dayjs";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Flame, CalendarClock, CreditCard } from "lucide-react";
import { AppLayout } from "@/layouts/AppLayout";
import { PageHeader, Panel, StatCard, EmptyState } from "@/components/ui-kit";
import { useFinance } from "@/context/FinanceContext";
import { useBalances } from "@/hooks/useBalances";
import { groupByCategory, sumBy } from "@/utils/finance";
import { CATEGORY_COLORS } from "@/constants";

export const Route = createFileRoute("/statistics")({
  head: () => ({
    meta: [
      { title: "Statistics — Money Mate" },
      { name: "description", content: "Visualise spending trends, category breakdowns and account distribution." },
      { property: "og:title", content: "Statistics — Money Mate" },
      { property: "og:description", content: "Charts and insights for your monthly income and expenses." },
    ],
  }),
  component: StatisticsPage,
});

function StatisticsPage() {
  const { transactions, accounts } = useFinance();
  const b = useBalances();

  const monthly = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => {
        const m = dayjs().subtract(5 - i, "month");
        const txs = transactions.filter((t) => dayjs(t.date).isSame(m, "month"));
        return { month: m.format("MMM"), Income: sumBy(txs, "income"), Expense: sumBy(txs, "expense") };
      }),
    [transactions],
  );

  const weekly = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = dayjs().subtract(6 - i, "day");
        const txs = transactions.filter((t) => dayjs(t.date).isSame(d, "day"));
        return { day: d.format("ddd"), Spent: sumBy(txs, "expense") };
      }),
    [transactions],
  );

  const trend = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const m = dayjs().subtract(11 - i, "month");
        const txs = transactions.filter((t) => dayjs(t.date).isSame(m, "month"));
        return { month: m.format("MMM YY"), Net: sumBy(txs, "income") - sumBy(txs, "expense") };
      }),
    [transactions],
  );

  const byCategory = useMemo(
    () => groupByCategory(transactions.filter((t) => t.type === "expense")),
    [transactions],
  );

  const distribution = accounts
    .map((a) => ({ name: a.name, value: Math.max(b.balances.get(a.id) ?? 0, 0), color: a.color }))
    .filter((d) => d.value > 0);

  const insights = useMemo(() => {
    const expenses = transactions.filter((t) => t.type === "expense");
    const days = new Set(expenses.map((t) => t.date)).size || 1;
    const accountUse = new Map<string, number>();
    for (const t of transactions) accountUse.set(t.accountId, (accountUse.get(t.accountId) ?? 0) + 1);
    const mostUsed = [...accountUse.entries()].sort((a, c) => c[1] - a[1])[0];
    return {
      topCategory: byCategory[0]?.name ?? "—",
      topCategoryAmount: byCategory[0]?.value ?? 0,
      avgDaily: expenses.reduce((s, t) => s + t.amount, 0) / days,
      mostUsedAccount: mostUsed ? b.accountName(mostUsed[0]) : "—",
    };
  }, [transactions, byCategory, b]);

  const hasData = transactions.length > 0;

  return (
    <AppLayout>
      <PageHeader title="Statistics" subtitle="Understand where your money goes" />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Highest expense category" value={insights.topCategory} hint={b.money(insights.topCategoryAmount)} icon={Flame} tone="danger" />
        <StatCard label="Average daily spending" value={b.money(insights.avgDaily || 0)} icon={CalendarClock} tone="warning" />
        <StatCard label="Most used account" value={insights.mostUsedAccount} icon={CreditCard} tone="primary" />
      </div>

      {!hasData ? (
        <Panel className="mt-4">
          <EmptyState icon={Flame} title="No data to analyse yet" description="Add transactions to unlock charts and insights." />
        </Panel>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Panel title="Monthly income vs expense">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} width={48} />
                  <Tooltip formatter={(v: number) => b.money(v)} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Income" fill="#16A34A" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Expense" fill="#DC2626" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title="Expense by category">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byCategory} dataKey="value" nameKey="name" outerRadius={92}>
                    {byCategory.map((_, i) => (
                      <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => b.money(v)} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title="Account balance distribution">
            {distribution.length ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={distribution} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90}>
                      {distribution.map((d, i) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => b.money(v)} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState icon={CreditCard} title="No positive balances" />
            )}
          </Panel>

          <Panel title="Weekly spending">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekly}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} width={48} />
                  <Tooltip formatter={(v: number) => b.money(v)} />
                  <Bar dataKey="Spent" fill="#2563EB" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title="Monthly net trend (12 months)" className="lg:col-span-2">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} width={56} />
                  <Tooltip formatter={(v: number) => b.money(v)} />
                  <Line type="monotone" dataKey="Net" stroke="#2563EB" strokeWidth={3} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>
      )}
    </AppLayout>
  );
}
