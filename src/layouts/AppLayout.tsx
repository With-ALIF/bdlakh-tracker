import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Receipt,
  Wallet,
  BarChart3,
  CalendarDays,
  User,
  Plus,
  Banknote,
  LogOut,
  Loader2,
  Bell,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TransactionDialog } from "@/components/TransactionDialog";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/context/AuthContext";
import { UserAvatar } from "@/components/UserAvatar";
import { useNotifications } from "@/context/NotificationContext";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/transactions", label: "Transactions", icon: Receipt },
  { to: "/wallets", label: "Wallets", icon: Wallet },
  { to: "/transfer", label: "Transfer", icon: ArrowLeftRight },
  { to: "/loan", label: "Loans", icon: Banknote },
  { to: "/chart", label: "Charts", icon: BarChart3 },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/settings", label: "Profile", icon: User },
] as const;

export function AppLayout({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const { ready, user, signOut } = useAuth();
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();

  // Local auth gate: unauthenticated visitors land on the sign in / sign up page.
  useEffect(() => {
    if (ready && !user) navigate({ to: "/auth", replace: true });
  }, [ready, user, navigate]);

  if (!ready || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
          <Link
            to="/notifications"
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              pathname === "/notifications" && "bg-sidebar-accent text-sidebar-accent-foreground",
            )}
          >
            <span className="relative">
              <Bell className="h-[18px] w-[18px]" />
              {unreadCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-danger px-0.5 text-[8px] font-bold text-danger-foreground">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </span>
            Notifications
          </Link>
        </nav>

        <div className="mt-3 flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2">
          <span className="text-xs font-medium text-muted-foreground">Appearance</span>
          <ThemeToggle />
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-card p-2.5">
          <UserAvatar
            photoUrl={user.photoUrl}
            displayName={user.displayName}
            email={user.email}
            className="h-8 w-8 text-xs font-bold"
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-semibold">{user.name}</span>
            <span className="block truncate text-[11px] text-muted-foreground">{user.email}</span>
          </span>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-card/90 px-4 py-3 backdrop-blur lg:hidden">
        <Brand />
        <div className="flex items-center gap-2">
          <Link
            to="/notifications"
            className={cn(
              "relative rounded-xl p-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              pathname === "/notifications" && "bg-muted text-foreground",
            )}
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-danger-foreground">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Link>
          <ThemeToggle />
          {pathname === "/" && (
            <button
              onClick={() => setOpen(true)}
              aria-label="Add transaction"
              className="rounded-xl bg-primary p-2.5 text-primary-foreground shadow-card"
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
          <UserAvatar
            photoUrl={user.photoUrl}
            displayName={user.displayName}
            email={user.email}
            className="h-9 w-9 border border-border text-xs font-bold"
          />
        </div>
      </header>

      <main className="px-4 pb-28 pt-5 lg:ml-64 lg:px-8 lg:pb-10 lg:pt-8">{children}</main>

      {/* Mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-9 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {NAV.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className={cn(
              "flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground transition-colors h-14",
              pathname === to && "text-primary",
            )}
          >
            <Icon className="h-5 w-5" />
          </Link>
        ))}
      </nav>

      <TransactionDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

function Brand() {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <img
        src="https://i.postimg.cc/LsGN35xY/moneymate.png"
        alt="Money Mate Logo"
        className="h-9 w-9"
      />
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold tracking-tight text-primary">
          MoneyMate
        </span>
      </span>
    </div>
  );
}
