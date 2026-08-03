import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import dayjs from "dayjs";
import {
  LogOut,
  Sun,
  Moon,
  ChevronRight,
  Wallet,
  Lock,
  Loader2,
  CheckCircle2,
  Tags,
} from "lucide-react";
import { AppLayout } from "@/layouts/AppLayout";
import { PageHeader, Panel } from "@/components/ui-kit";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useFinance } from "@/context/FinanceContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/UserAvatar";
import { toast } from "sonner";
import { CategoryManager } from "@/components/CategoryManager";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Profile — Money Mate" },
      { name: "description", content: "Manage your Money Mate profile, wallets, and local data." },
      { property: "og:title", content: "Profile — Money Mate" },
      {
        property: "og:description",
        content: "Manage your Money Mate profile, wallets, and local data.",
      },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, signOut, updatePassword } = useAuth();
  const { theme, setTheme } = useTheme();
  const { categories } = useFinance();
  const [catOpen, setCatOpen] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const memberSince = user?.createdAt
    ? dayjs(user.createdAt).format("DD, MMM, YYYY")
    : dayjs().format("DD, MMM, YYYY");

  const enabledCount = categories.filter((c) => c.is_enabled).length;

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("All fields are required");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    if (currentPassword === newPassword) {
      toast.error("New password must be different from current password");
      return;
    }

    setChangingPassword(true);
    try {
      await updatePassword({ currentPassword, newPassword });
      toast.success("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update password");
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <AppLayout>
      <PageHeader title="Profile" subtitle="Your account and preferences" />

      <div className="mx-auto max-w-2xl space-y-5">
        {/* Profile hero */}
        <div className="flex flex-col items-center text-center">
          <UserAvatar
            photoUrl={user?.photoUrl}
            displayName={user?.displayName}
            email={user?.email}
            className="h-24 w-24 text-2xl font-bold"
          />
          <h2 className="mt-4 text-xl font-bold tracking-tight">
            {user?.name ?? "Money Mate User"}
          </h2>
          <p className="text-sm text-muted-foreground">{user?.email ?? ""}</p>
          <p className="mt-1 text-xs text-muted-foreground">Member since {memberSince}</p>
        </div>

        {/* Account Information */}
        <Panel>
          <h3 className="mb-4 text-sm font-bold">Account Information</h3>
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Name
                </Label>
                <Input
                  value={user?.name ?? ""}
                  disabled
                  className="cursor-not-allowed opacity-60"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Email
                </Label>
                <Input
                  value={user?.email ?? ""}
                  disabled
                  className="cursor-not-allowed opacity-60"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Appearance
              </Label>
              <div className="grid grid-cols-2 gap-3">
                {(["light", "dark"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTheme(t)}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border p-3 text-sm font-semibold capitalize transition-colors",
                      theme === t
                        ? "border-primary bg-primary-soft text-primary"
                        : "border-border bg-card text-muted-foreground",
                    )}
                  >
                    {t === "light" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    {t} mode
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Panel>

        {/* Change Password */}
        <Panel>
          <div className="mb-4 flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-warning-soft text-warning">
              <Lock className="h-4 w-4" />
            </span>
            <h3 className="text-sm font-bold">Change Password</h3>
          </div>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Current Password
              </Label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  New Password
                </Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Confirm New Password
                </Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>
            </div>
            <Button type="submit" disabled={changingPassword} className="gap-2">
              {changingPassword ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {changingPassword ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </Panel>

        {/* Category Manager */}
        <button type="button" onClick={() => setCatOpen(true)} className="w-full text-left">
          <Panel className="transition-colors hover:bg-accent/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
                  <Tags className="h-5 w-5" />
                </span>
                <div className="text-left">
                  <h3 className="text-sm font-bold">Categories</h3>
                  <p className="text-xs text-muted-foreground">
                    {enabledCount} of {categories.length} enabled
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </Panel>
        </button>
        <CategoryManager open={catOpen} onOpenChange={setCatOpen} />

        {/* Wallets */}
        <Link to="/wallets">
          <Panel className="transition-colors hover:bg-accent/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-success-soft text-success">
                  <Wallet className="h-5 w-5" />
                </span>
                <div className="text-left">
                  <h3 className="text-sm font-bold">Wallets</h3>
                  <p className="text-xs text-muted-foreground">
                    Manage Cash, Bank, bKash, Nagad & Rocket
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </Panel>
        </Link>

        {/* Logout */}
        <Button variant="destructive" className="w-full" onClick={signOut}>
          <LogOut className="mr-2 h-4 w-4" /> Log Out
        </Button>
      </div>
    </AppLayout>
  );
}
