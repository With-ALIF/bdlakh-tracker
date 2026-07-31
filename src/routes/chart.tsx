import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  TrendingUp,
  TrendingDown,
  PiggyBank,
  PieChart as PieChartIcon,
  BarChart3,
  Percent,
  Layers,
  Flame,
  CalendarClock,
  CreditCard,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
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
import { AppLayout } from "@/layouts/AppLayout";
import { PageHeader, Panel, StatCard, EmptyState } from "@/components/ui-kit";
import { useFinance } from "@/context/FinanceContext";
import { useBalances } from "@/hooks/useBalances";
import { groupByCategory, sumBy } from "@/utils/finance";
import { CATEGORY_COLORS } from "@/constants";

export const Route = createFileRoute("/chart")({
  head: () => ({
    meta: [
      { title: "Charts & Analytics — Money Mate" },
      { name: "description", content: "Interactive visual charts, expense trends, and financial breakdown." },
      { property: "og:title", content: "Charts & Analytics — Money Mate" },
      { property: "og:description", content: "Detailed visual charts of your income, expenses, and savings." },
    ],
  }),
  component: ChartPage,
});

type TimeRange = "today" | "this_week" | "15_days" | "this_month" | "3_months" | "6_months" | "this_year";

function ChartPage() {
  const { transactions, accounts } = useFinance();
  const b = useBalances();
  const [range, setRange] = useState<TimeRange>("6_months");

  // Filter transactions based on selected range
  const filteredTxs = useMemo(() => {
    const now = dayjs();
    return transactions.filter((t) => {
      const d = dayjs(t.date);
      if (range === "today") return d.isSame(now, "day");
      if (range === "this_week") return d.isSame(now, "week");
      if (range === "15_days") return d.isAfter(now.subtract(15, "day"));
      if (range === "this_month") return d.isSame(now, "month");
      if (range === "3_months") return d.isAfter(now.subtract(3, "month"));
      if (range === "6_months") return d.isAfter(now.subtract(6, "month"));
      if (range === "this_year") return d.isSame(now, "year");
      return true;
    });
  }, [transactions, range]);

  const totalIncome = useMemo(() => sumBy(filteredTxs, "income"), [filteredTxs]);
  const totalExpense = useMemo(() => sumBy(filteredTxs, "expense"), [filteredTxs]);
  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.max(0, Math.round((netSavings / totalIncome) * 100)) : 0;

  // Monthly / Period chart data
  const chartData = useMemo(() => {
    let monthCount = 6;
    if (range === "today" || range === "this_week" || range === "15_days") monthCount = 1;
    else if (range === "this_month") monthCount = 1;
    else if (range === "3_months") monthCount = 3;
    else if (range === "6_months") monthCount = 6;
    else if (range === "this_year") monthCount = dayjs().month() + 1;

    return Array.from({ length: monthCount }, (_, i) => {
      const m = dayjs().subtract(monthCount - 1 - i, "month");
      const txs = transactions.filter((t) => dayjs(t.date).isSame(m, "month"));
      const inc = sumBy(txs, "income");
      const exp = sumBy(txs, "expense");
      return {
        month: m.format("MMM YYYY"),
        Income: inc,
        Expense: exp,
        Net: inc - exp,
      };
    });
  }, [transactions, range]);

  // Daily trend based on selected range
  const dayCount = useMemo(() => {
    if (range === "today") return 1;
    if (range === "this_week") return dayjs().day() + 1;
    if (range === "15_days") return 15;
    if (range === "this_month") return dayjs().date();
    if (range === "3_months") return 90;
    if (range === "6_months") return 180;
    if (range === "this_year") return dayjs().diff(dayjs().startOf("year"), "day") + 1;
    return 14;
  }, [range]);

  const dailyData = useMemo(() => {
    return Array.from({ length: dayCount }, (_, i) => {
      const d = dayjs().subtract(dayCount - 1 - i, "day");
      const txs = transactions.filter((t) => dayjs(t.date).isSame(d, "day"));
      return {
        date: d.format("DD MMM"),
        Income: sumBy(txs, "income"),
        Expense: sumBy(txs, "expense"),
      };
    });
  }, [transactions, dayCount]);

  // Expense by Category
  const categoryData = useMemo(() => {
    const expenses = filteredTxs.filter((t) => t.type === "expense");
    return groupByCategory(expenses);
  }, [filteredTxs]);

  // Income by Category
  const incomeData = useMemo(() => {
    const incomes = filteredTxs.filter((t) => t.type === "income");
    return groupByCategory(incomes);
  }, [filteredTxs]);

  // Account Distribution
  const accountData = useMemo(() => {
    return accounts
      .map((a) => ({ name: a.name, value: Math.max(b.balances.get(a.id) ?? 0, 0), color: a.color }))
      .filter((d) => d.value > 0);
  }, [accounts, b]);

  // Weekly spending (last 7 days)
  const weeklyData = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = dayjs().subtract(6 - i, "day");
        const txs = transactions.filter((t) => dayjs(t.date).isSame(d, "day"));
        return { day: d.format("ddd"), Spent: sumBy(txs, "expense") };
      }),
    [transactions],
  );

  const insights = useMemo(() => {
    const expenses = transactions.filter((t) => t.type === "expense");
    const days = new Set(expenses.map((t) => t.date)).size || 1;
    const accountUse = new Map<string, number>();
    for (const t of transactions) accountUse.set(t.accountId, (accountUse.get(t.accountId) ?? 0) + 1);
    const mostUsed = [...accountUse.entries()].sort((a, c) => c[1] - a[1])[0];
    return {
      topCategory: categoryData[0]?.name ?? "—",
      topCategoryAmount: categoryData[0]?.value ?? 0,
      avgDaily: expenses.reduce((s, t) => s + t.amount, 0) / days,
      mostUsedAccount: mostUsed ? b.accountName(mostUsed[0]) : "—",
    };
  }, [transactions, categoryData, b]);

  const hasData = transactions.length > 0;

  return (
    <AppLayout>
      <PageHeader
        title="Charts & Analytics"
        subtitle="Visualise income, expense patterns and net balance trends"
        action={
          <div>
            {/* Mobile dropdown */}
            <select
              value={range}
              onChange={(e) => setRange(e.target.value as TimeRange)}
              className="h-9 rounded-xl border border-border bg-card px-3 text-xs font-medium lg:hidden"
            >
              <option value="today">Today</option>
              <option value="this_week">This Week</option>
              <option value="15_days">15 Days</option>
              <option value="this_month">This Month</option>
              <option value="3_months">3 Months</option>
              <option value="6_months">6 Months</option>
              <option value="this_year">This Year</option>
            </select>
            {/* Desktop buttons */}
            <div className="hidden items-center gap-1.5 rounded-xl border border-border bg-card p-1 text-xs lg:flex">
              <button
                onClick={() => setRange("today")}
                className={`rounded-lg px-2.5 py-1.5 font-medium transition ${
                  range === "today" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setRange("this_week")}
                className={`rounded-lg px-2.5 py-1.5 font-medium transition ${
                  range === "this_week" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                This Week
              </button>
              <button
                onClick={() => setRange("15_days")}
                className={`rounded-lg px-2.5 py-1.5 font-medium transition ${
                  range === "15_days" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                15 Days
              </button>
              <button
                onClick={() => setRange("this_month")}
                className={`rounded-lg px-2.5 py-1.5 font-medium transition ${
                  range === "this_month" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                This Month
              </button>
              <button
                onClick={() => setRange("3_months")}
                className={`rounded-lg px-2.5 py-1.5 font-medium transition ${
                  range === "3_months" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                3 Months
              </button>
              <button
                onClick={() => setRange("6_months")}
                className={`rounded-lg px-2.5 py-1.5 font-medium transition ${
                  range === "6_months" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                6 Months
              </button>
              <button
                onClick={() => setRange("this_year")}
                className={`rounded-lg px-2.5 py-1.5 font-medium transition ${
                  range === "this_year" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                This Year
              </button>
            </div>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-4">
        <StatCard label="Total Income" value={b.money(totalIncome)} icon={TrendingUp} tone="success" />
        <StatCard label="Total Expense" value={b.money(totalExpense)} icon={TrendingDown} tone="danger" />
        <StatCard label="Net Savings" value={b.money(netSavings)} icon={PiggyBank} tone={netSavings >= 0 ? "primary" : "danger"} />
        <StatCard label="Savings Rate" value={`${savingsRate}%`} icon={Percent} tone={savingsRate >= 20 ? "success" : "warning"} hint="Target > 20%" />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:mt-4 sm:grid-cols-3">
        <StatCard label="Highest expense category" value={insights.topCategory} hint={b.money(insights.topCategoryAmount)} icon={Flame} tone="danger" />
        <StatCard label="Average daily spending" value={b.money(insights.avgDaily || 0)} icon={CalendarClock} tone="warning" />
        <StatCard label="Most used account" value={insights.mostUsedAccount} icon={CreditCard} tone="primary" />
      </div>

      {!hasData ? (
        <Panel className="mt-4">
          <EmptyState icon={BarChart3} title="No transaction records" description="Start logging transactions to view detailed chart analytics." />
        </Panel>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {/* Income vs Expense Area Chart */}
          <Panel title="Income vs Expense Overview">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16A34A" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#16A34A" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#DC2626" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#DC2626" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} width={52} />
                  <Tooltip formatter={(v: number) => b.money(v)} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="Income" stroke="#16A34A" strokeWidth={2.5} fillOpacity={1} fill="url(#colorInc)" />
                  <Area type="monotone" dataKey="Expense" stroke="#DC2626" strokeWidth={2.5} fillOpacity={1} fill="url(#colorExp)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          {/* Expense Category Breakdown Pie Chart */}
          <Panel title="Expense by Category">
            {categoryData.length ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={3}>
                      {categoryData.map((_, i) => (
                        <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => b.money(v)} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState icon={PieChartIcon} title="No expenses recorded for this period" />
            )}
          </Panel>

          {/* Income Category Breakdown Pie Chart */}
          <Panel title="Income by Category">
            {incomeData.length ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={incomeData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={3}>
                      {incomeData.map((_, i) => (
                        <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => b.money(v)} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState icon={PieChartIcon} title="No income recorded for this period" />
            )}
          </Panel>

          {/* Daily Trend Bar Chart */}
          <Panel title={`Daily Trend (${dayCount === 14 ? "Last 14 Days" : range === "this_year" ? "This Year" : `Last ${dayCount} Days`})`}>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} width={48} />
                  <Tooltip formatter={(v: number) => b.money(v)} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Income" fill="#16A34A" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Expense" fill="#DC2626" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          {/* Weekly Spending */}
          <Panel title="Weekly Spending">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} width={48} />
                  <Tooltip formatter={(v: number) => b.money(v)} />
                  <Bar dataKey="Spent" fill="#2563EB" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          {/* Wallet Balance Distribution */}
          <Panel title="Current Wallet Balances">
            {accountData.length ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={accountData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                    <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} />
                    <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} fontSize={12} width={80} />
                    <Tooltip formatter={(v: number) => b.money(v)} />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                      {accountData.map((d, i) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState icon={Layers} title="No active wallet balances" />
            )}
          </Panel>
        </div>
      )}
    </AppLayout>
  );
}
