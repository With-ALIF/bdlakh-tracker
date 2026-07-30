import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Receipt,
  Wallet,
  PieChart,
  BarChart3,
  CalendarDays,
  Settings as SettingsIcon,
  Plus,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TransactionDialog } from "@/components/TransactionDialog";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/transactions", label: "Transactions", icon: Receipt },
  { to: "/wallets", label: "Wallets", icon: Wallet },
  { to: "/transfer", label: "Transfer", icon: ArrowLeftRight },
  { to: "/chart", label: "Charts", icon: BarChart3 },
  { to: "/statistics", label: "Statistics", icon: PieChart },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
] as const;

const MOBILE_NAV = NAV.filter((n) =>
  ["/", "/transactions", "/wallets", "/statistics", "/settings"].includes(n.to),
);

export function AppLayout({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-sidebar px-4 py-6 lg:flex">
        <Brand />
        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                pathname === to && "bg-sidebar-accent text-sidebar-accent-foreground",
              )}
            >
              <Icon className="h-[18px] w-[18px]" />
              {label}
            </Link>
          ))}
        </nav>
        <button
          onClick={() => setOpen(true)}
          className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-card transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Add Transaction
        </button>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-card/90 px-4 py-3 backdrop-blur lg:hidden">
        <Brand />
        <button
          onClick={() => setOpen(true)}
          aria-label="Add transaction"
          className="rounded-xl bg-primary p-2.5 text-primary-foreground shadow-card"
        >
          <Plus className="h-4 w-4" />
        </button>
      </header>

      <main className="px-4 pb-28 pt-5 lg:ml-64 lg:px-8 lg:pb-10 lg:pt-8">{children}</main>

      {/* Mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {MOBILE_NAV.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className={cn(
              "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground transition-colors",
              pathname === to && "text-primary",
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="truncate">{label}</span>
          </Link>
        ))}
      </nav>

      <TransactionDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

function Brand() {
  return (
    <Link to="/" className="flex min-w-0 items-center gap-2.5">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-sm font-black text-primary-foreground">
        ৳
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold tracking-tight">TakaBook</span>
        <span className="block truncate text-[11px] text-muted-foreground">Income & Expense</span>
      </span>
    </Link>
  );
}
