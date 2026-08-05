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
  Flame,
  Calendar,
  Hash,
  Trophy,
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
import { now } from "@/lib/date";
import { groupByCategory, sumBy } from "@/utils/finance";
import { CATEGORY_COLORS } from "@/constants";

export const Route = createFileRoute("/chart")({
  head: () => ({
    meta: [
      { title: "Charts & Analytics — Money Mate" },
      {
        name: "description",
        content: "Interactive visual charts, expense trends, and financial breakdown.",
      },
      { property: "og:title", content: "Charts & Analytics — Money Mate" },
      {
        property: "og:description",
        content: "Detailed visual charts of your income, expenses, and savings.",
      },
    ],
  }),
  component: ChartPage,
});

type TimeRange =
  | "today"
  | "this_week"
  | "15_days"
  | "this_month"
  | "this_year"
  | "lifetime"
  | "custom";

function ChartPage() {
  const { transactions } = useFinance();
  const b = useBalances();
  const [range, setRange] = useState<TimeRange>("this_month");
  const [customFrom, setCustomFrom] = useState(() =>
    now().subtract(30, "day").format("YYYY-MM-DD"),
  );
  const [customTo, setCustomTo] = useState(() => now().format("YYYY-MM-DD"));

  // Filter transactions based on selected range
  const filteredTxs = useMemo(() => {
    const cur = now();
    return transactions.filter((t) => {
      const d = dayjs(t.date);
      if (range === "today") return d.isSame(cur, "day");
      if (range === "this_week") return d.isSame(cur, "week");
      if (range === "15_days") return d.isAfter(cur.subtract(15, "day"));
      if (range === "this_month") return d.isSame(cur, "month");
      if (range === "this_year") return d.isSame(cur, "year");
      if (range === "lifetime") return true;
      if (range === "custom") {
        const from = dayjs(customFrom);
        const to = dayjs(customTo).endOf("day");
        return (
          (d.isAfter(from) || d.isSame(from, "day")) && (d.isBefore(to) || d.isSame(to, "day"))
        );
      }
      return true;
    });
  }, [transactions, range, customFrom, customTo]);

  const totalIncome = useMemo(() => sumBy(filteredTxs, "income"), [filteredTxs]);
  const totalExpense = useMemo(() => sumBy(filteredTxs, "expense"), [filteredTxs]);
  const netSavings = totalIncome - totalExpense;
  const savingsRate =
    totalIncome > 0 ? Math.max(0, Math.round((netSavings / totalIncome) * 100)) : 0;

  // Monthly / Period chart data
  const chartData = useMemo(() => {
    if (range === "today") {
      const d = now();
      const txs = filteredTxs;
      return [
        {
          month: d.format("DD MMM"),
          Income: sumBy(txs, "income"),
          Expense: sumBy(txs, "expense"),
          Net: sumBy(txs, "income") - sumBy(txs, "expense"),
        },
      ];
    }
    if (range === "this_week") {
      return Array.from({ length: 7 }, (_, i) => {
        const d = now().startOf("week").add(i, "day");
        const txs = filteredTxs.filter((t) => dayjs(t.date).isSame(d, "day"));
        const inc = sumBy(txs, "income");
        const exp = sumBy(txs, "expense");
        return { month: d.format("ddd"), Income: inc, Expense: exp, Net: inc - exp };
      });
    }
    if (range === "15_days") {
      return Array.from({ length: 15 }, (_, i) => {
        const d = now().subtract(14 - i, "day");
        const txs = filteredTxs.filter((t) => dayjs(t.date).isSame(d, "day"));
        const inc = sumBy(txs, "income");
        const exp = sumBy(txs, "expense");
        return { month: d.format("DD MMM"), Income: inc, Expense: exp, Net: inc - exp };
      });
    }

    let monthCount = 1;
    if (range === "this_year") monthCount = now().month() + 1;
    else if (range === "lifetime") {
      if (filteredTxs.length === 0) return [];
      const sorted = [...filteredTxs].sort((a, b) => a.date.localeCompare(b.date));
      const from = dayjs(sorted[0].date).startOf("month");
      const to = now();
      const months = to.diff(from, "month") + 1;
      return Array.from({ length: months }, (_, i) => {
        const m = from.add(i, "month");
        const txs = filteredTxs.filter((t) => dayjs(t.date).isSame(m, "month"));
        const inc = sumBy(txs, "income");
        const exp = sumBy(txs, "expense");
        return { month: m.format("MMM YYYY"), Income: inc, Expense: exp, Net: inc - exp };
      });
    }

    if (range === "custom") {
      const from = dayjs(customFrom);
      const to = dayjs(customTo);
      const months = to.diff(from, "month") + 1;
      return Array.from({ length: Math.max(months, 1) }, (_, i) => {
        const m = from.add(i, "month");
        const txs = filteredTxs.filter((t) => dayjs(t.date).isSame(m, "month"));
        const inc = sumBy(txs, "income");
        const exp = sumBy(txs, "expense");
        return { month: m.format("MMM YYYY"), Income: inc, Expense: exp, Net: inc - exp };
      });
    }

    return Array.from({ length: monthCount }, (_, i) => {
      const m = now().subtract(monthCount - 1 - i, "month");
      const txs = filteredTxs.filter((t) => dayjs(t.date).isSame(m, "month"));
      const inc = sumBy(txs, "income");
      const exp = sumBy(txs, "expense");
      return {
        month: m.format("MMM YYYY"),
        Income: inc,
        Expense: exp,
        Net: inc - exp,
      };
    });
  }, [filteredTxs, range]);

  // Daily trend based on selected range
  const dayCount = useMemo(() => {
    if (range === "today") return 1;
    if (range === "this_week") return now().day() + 1;
    if (range === "15_days") return 15;
    if (range === "this_month") return now().date();
    if (range === "this_year") return now().diff(now().startOf("year"), "day") + 1;
    if (range === "lifetime") {
      if (filteredTxs.length === 0) return 1;
      const sorted = [...filteredTxs].sort((a, b) => a.date.localeCompare(b.date));
      return now().diff(dayjs(sorted[0].date), "day") + 1;
    }
    if (range === "custom") return dayjs(customTo).diff(dayjs(customFrom), "day") + 1;
    return 14;
  }, [range, customFrom, customTo]);

  const dailyData = useMemo(() => {
    const from = range === "custom" ? dayjs(customFrom) : now().subtract(dayCount - 1, "day");
    return Array.from({ length: dayCount }, (_, i) => {
      const d = from.add(i, "day");
      const txs = filteredTxs.filter((t) => dayjs(t.date).isSame(d, "day"));
      return {
        date: d.format("DD MMM"),
        Income: sumBy(txs, "income"),
        Expense: sumBy(txs, "expense"),
      };
    });
  }, [filteredTxs, dayCount, range, customFrom]);

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

  const insights = useMemo(() => {
    const expenses = filteredTxs.filter((t) => t.type === "expense");
    const dayMap = new Map<string, number>();
    for (const t of expenses) {
      dayMap.set(t.date, (dayMap.get(t.date) ?? 0) + t.amount);
    }
    const mostExpensiveDay = [...dayMap.entries()].sort((a, b) => b[1] - a[1])[0];

    const cur = now();
    let currentTxs = filteredTxs;
    let prevTxs: typeof transactions;

    if (range === "today") {
      const yesterday = cur.subtract(1, "day");
      prevTxs = transactions.filter((t) => dayjs(t.date).isSame(yesterday, "day"));
    } else if (range === "this_week") {
      const lastWeek = cur.subtract(1, "week");
      prevTxs = transactions.filter((t) => dayjs(t.date).isSame(lastWeek, "week"));
    } else if (range === "15_days") {
      const from = cur.subtract(30, "day");
      const mid = cur.subtract(15, "day");
      prevTxs = transactions.filter((t) => {
        const d = dayjs(t.date);
        return d.isAfter(from) && d.isBefore(mid);
      });
    } else if (range === "this_month") {
      const lastMonth = cur.subtract(1, "month");
      prevTxs = transactions.filter((t) => dayjs(t.date).isSame(lastMonth, "month"));
    } else if (range === "this_year") {
      const lastYear = cur.subtract(1, "year");
      prevTxs = transactions.filter((t) => dayjs(t.date).isSame(lastYear, "year"));
    } else if (range === "lifetime") {
      prevTxs = transactions.filter((t) => dayjs(t.date).isSame(cur.subtract(1, "year"), "year"));
    } else if (range === "custom") {
      const from = dayjs(customFrom);
      const to = dayjs(customTo);
      const diff = to.diff(from, "day");
      const prevTo = from.subtract(1, "day");
      const prevFrom = prevTo.subtract(diff, "day");
      prevTxs = transactions.filter((t) => {
        const d = dayjs(t.date);
        return (d.isAfter(prevFrom) || d.isSame(prevFrom, "day")) && (d.isBefore(prevTo) || d.isSame(prevTo, "day"));
      });
    } else {
      prevTxs = [];
    }

    const currentIncome = sumBy(currentTxs, "income");
    const prevIncome = sumBy(prevTxs, "income");
    const growth = prevIncome > 0
      ? Math.round(((currentIncome - prevIncome) / prevIncome) * 100)
      : currentIncome > 0 ? 100 : 0;

    return {
      topCategory: categoryData[0]?.name ?? "—",
      topCategoryAmount: categoryData[0]?.value ?? 0,
      totalTransactions: filteredTxs.length,
      mostExpensiveDay: mostExpensiveDay
        ? { date: mostExpensiveDay[0], amount: mostExpensiveDay[1] }
        : null,
      growth,
    };
  }, [filteredTxs, categoryData, transactions, range, customFrom, customTo]);

  const rangeLabel = useMemo(() => {
    const cur = now();
    const fmt = "DD MMM YYYY";
    if (range === "today") return cur.format(fmt);
    if (range === "this_week") return `${cur.startOf("week").format(fmt)} – ${cur.format(fmt)}`;
    if (range === "15_days") return `${cur.subtract(14, "day").format(fmt)} – ${cur.format(fmt)}`;
    if (range === "this_month") return `${cur.startOf("month").format(fmt)} – ${cur.format(fmt)}`;
    if (range === "this_year") return `${cur.startOf("year").format(fmt)} – ${cur.format(fmt)}`;
    if (range === "lifetime") {
      if (filteredTxs.length === 0) return cur.format(fmt);
      const sorted = [...filteredTxs].sort((a, b) => a.date.localeCompare(b.date));
      return `${dayjs(sorted[0].date).format(fmt)} – ${cur.format(fmt)}`;
    }
    if (range === "custom") return `${dayjs(customFrom).format(fmt)} – ${dayjs(customTo).format(fmt)}`;
    return "";
  }, [range, filteredTxs, customFrom, customTo]);

  const hasData = transactions.length > 0;

  return (
    <AppLayout>
      <PageHeader
        title="Charts & Analytics"
        subtitle="Visualise income, expense patterns and net balance trends"
        action={
          <div className="w-full sm:w-auto">
            {/* Desktop buttons */}
            <div className="hidden items-center gap-1.5 rounded-xl border border-border bg-card p-1 text-xs lg:flex">
              <button
                onClick={() => setRange("today")}
                className={`rounded-lg px-2.5 py-1.5 font-medium transition ${
                  range === "today"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setRange("this_week")}
                className={`rounded-lg px-2.5 py-1.5 font-medium transition ${
                  range === "this_week"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                This Week
              </button>
              <button
                onClick={() => setRange("15_days")}
                className={`rounded-lg px-2.5 py-1.5 font-medium transition ${
                  range === "15_days"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                15 Days
              </button>
              <button
                onClick={() => setRange("this_month")}
                className={`rounded-lg px-2.5 py-1.5 font-medium transition ${
                  range === "this_month"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                This Month
              </button>
              <button
                onClick={() => setRange("this_year")}
                className={`rounded-lg px-2.5 py-1.5 font-medium transition ${
                  range === "this_year"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                This Year
              </button>
              <button
                onClick={() => setRange("lifetime")}
                className={`rounded-lg px-2.5 py-1.5 font-medium transition ${
                  range === "lifetime"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Lifetime
              </button>
              <button
                onClick={() => setRange("custom")}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-medium transition ${
                  range === "custom"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Calendar className="h-3 w-3" /> Custom
              </button>
            </div>
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
              <option value="this_year">This Year</option>
              <option value="lifetime">Lifetime</option>
              <option value="custom">Custom Range</option>
            </select>
            {/* Custom date range picker */}
            {range === "custom" && (
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="h-8 w-full rounded-lg border border-border bg-card px-2 text-xs outline-none focus:ring-2 focus:ring-ring/40 sm:w-auto"
                  />
                </div>
                <span className="text-xs font-bold text-muted-foreground">to</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="h-8 w-full rounded-lg border border-border bg-card px-2 text-xs outline-none focus:ring-2 focus:ring-ring/40 sm:w-auto"
                />
              </div>
            )}
            {rangeLabel && (
              <p className="mt-1.5 text-[11px] font-medium text-indigo-500 lg:text-center">{rangeLabel}</p>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Income"
          value={b.money(totalIncome)}
          icon={TrendingUp}
          tone="success"
        />
        <StatCard
          label="Total Expense"
          value={b.money(totalExpense)}
          icon={TrendingDown}
          tone="danger"
        />
        <StatCard
          label="Net Savings"
          value={b.money(netSavings)}
          icon={PiggyBank}
          tone={netSavings >= 0 ? "primary" : "danger"}
        />
        <StatCard
          label="Savings Rate"
          value={`${savingsRate}%`}
          icon={Percent}
          tone={savingsRate >= 20 ? "success" : "warning"}
          hint="Target > 20%"
        />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:mt-4 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Highest expense category"
          value={insights.topCategory}
          hint={b.money(insights.topCategoryAmount)}
          icon={Flame}
          tone="danger"
        />
        <StatCard
          label="Total Transactions"
          value={String(insights.totalTransactions)}
          icon={Hash}
          tone="default"
        />
        <StatCard
          label="Most Expensive Day"
          value={insights.mostExpensiveDay ? b.money(insights.mostExpensiveDay.amount) : "—"}
          hint={
            insights.mostExpensiveDay
              ? dayjs(insights.mostExpensiveDay.date).format("DD MMM")
              : undefined
          }
          icon={Trophy}
          tone="danger"
        />
        <StatCard
          label="Growth"
          value={`${insights.growth >= 0 ? "+" : ""}${insights.growth}%`}
          icon={TrendingUp}
          tone={insights.growth >= 0 ? "success" : "danger"}
        />
      </div>

      {!hasData ? (
        <Panel className="mt-4">
          <EmptyState
            icon={BarChart3}
            title="No transaction records"
            description="Start logging transactions to view detailed chart analytics."
          />
        </Panel>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {/* Income vs Expense Area Chart */}
          <Panel
            title={`Income vs Expense (${range === "today" ? "Today" : range === "this_week" ? "This Week" : range === "15_days" ? "Last 15 Days" : range === "this_month" ? "This Month" : range === "lifetime" ? "Lifetime" : "This Year"})`}
          >
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
                  <Area
                    type="monotone"
                    dataKey="Income"
                    stroke="#16A34A"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorInc)"
                  />
                  <Area
                    type="monotone"
                    dataKey="Expense"
                    stroke="#DC2626"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorExp)"
                  />
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
                    <Pie
                      data={categoryData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                    >
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
                    <Pie
                      data={incomeData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                    >
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
          <Panel
            title={`Daily Trend (${range === "today" ? "Today" : range === "this_week" ? "This Week" : range === "15_days" ? "Last 15 Days" : range === "this_month" ? "This Month" : range === "lifetime" ? "Lifetime" : "This Year"})`}
          >
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
        </div>
      )}
    </AppLayout>
  );
}
