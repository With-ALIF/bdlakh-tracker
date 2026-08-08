import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import dayjs from "dayjs";
import {
  LogOut,
  Sun,
  Moon,
  ChevronRight,
  ChevronDown,
  Lock,
  Loader2,
  CheckCircle2,
  Tags,
  Camera,
  Info,
  Globe,
} from "lucide-react";
import { AppLayout } from "@/layouts/AppLayout";
import { PageHeader, Panel } from "@/components/ui-kit";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useFinance } from "@/context/FinanceContext";
import { now } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/UserAvatar";
import { toast } from "sonner";
import { CategoryManager } from "@/components/CategoryManager";
import { supabase } from "@/lib/supabase";
import { normalizePhotoUrl } from "@/routes/utils";

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
  const { user, signOut, updatePassword, refetchProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const { categories } = useFinance();
  const [catOpen, setCatOpen] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
  const [savingPhoto, setSavingPhoto] = useState(false);

  useEffect(() => {
    if (user?.photoUrl) {
      setPhotoUrl(user.photoUrl);
    }
  }, [user?.photoUrl]);

  const memberSince = user?.createdAt
    ? dayjs(user.createdAt).format("DD, MMM, YYYY")
    : now().format("DD, MMM, YYYY");

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

  const handleSavePhoto = async () => {
    if (!user?.id) return;
    setSavingPhoto(true);
    try {
      const { error } = await supabase.rpc("upsert_user_photo", {
        p_user_id: user.id,
        p_photo_url: normalizePhotoUrl(photoUrl.trim()) || null,
      });
      if (error) throw error;
      await refetchProfile();
      toast.success("Photo updated successfully");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update photo");
    } finally {
      setSavingPhoto(false);
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

        {/* Profile Photo */}
        <Panel>
          <div className="mb-4 flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary-soft text-primary">
              <Camera className="h-4 w-4" />
            </span>
            <h3 className="text-sm font-bold">Profile Photo</h3>
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Photo URL
              </Label>
              <Input
                type="text"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder="Paste your photo URL here"
                autoComplete="off"
              />
            </div>
            <Button onClick={handleSavePhoto} disabled={savingPhoto} className="gap-2">
              {savingPhoto ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {savingPhoto ? "Saving..." : "Save Photo"}
            </Button>
          </div>
        </Panel>

        {/* About Section */}
        <AboutSection />

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

        {/* Logout */}
        <Button variant="destructive" className="w-full" onClick={signOut}>
          <LogOut className="mr-2 h-4 w-4" /> Log Out
        </Button>
      </div>
    </AppLayout>
  );
}

const ABOUT_CONTENT = {
  en: {
    title: "About Money Mate",
    subtitle: "A smarter way to manage your personal finances",

    sections: [
      {
        heading: "What is Money Mate?",
        body: "Money Mate is a simple yet powerful personal finance management app designed to help you take control of your money. Track your income, expenses, transfers, and loans in one organized place, so you always have a clear understanding of your financial activity.",
      },

      {
        heading: "How to Use Money Mate?",
        body: [
          "Create your account and set up your profile",
          "Add your wallets such as Cash, bKash, Nagad, Rocket, or Bank",
          "Add your income whenever you receive money",
          "Record your daily expenses and assign the appropriate category",
          "Transfer money between your wallets whenever needed",
          "Add and manage loans with payment history",
          "Use charts and the calendar view to understand your spending patterns",
          "Create custom categories to organize your transactions your way",
          "Review your financial activity regularly to build better money habits",
        ],
      },

      {
        heading: "Key Features",
        body: [
          "Track income and expenses with customizable categories",
          "Manage multiple wallets — Cash, bKash, Nagad, Rocket, and Bank",
          "Transfer money seamlessly between wallets",
          "Track loans with detailed payment history",
          "Understand your spending through visual charts and calendar views",
          "Create and manage your own custom categories",
          "Switch between Light and Dark themes",
        ],
      },

      {
        heading: "Who is Money Mate for?",
        body: "Money Mate is built for anyone who wants a clearer and more organized view of their finances. Whether you're a student managing a monthly budget, a freelancer tracking payments, a small business owner monitoring cash flow, or simply someone who wants to build better financial habits, Money Mate keeps everything within reach.",
      },

      {
        heading: "Your Privacy Matters",
        body: "We take your financial privacy seriously. Your data is stored securely and access is protected through your account. Money Mate is designed to keep your financial information private and give you control over your personal data.",
      },
    ],

    version: "Version",
    developer: "Designed & developed with care",
  },

  bn: {
    title: "মানি মেট সম্পর্কে",
    subtitle: "আপনার ব্যক্তিগত অর্থ ব্যবস্থাপনার আরও স্মার্ট উপায়",

    sections: [
      {
        heading: "মানি মেট কী?",
        body: "মানি মেট একটি সহজ ও শক্তিশালী ব্যক্তিগত অর্থ ব্যবস্থাপনা অ্যাপ, যা আপনাকে আপনার অর্থের উপর আরও ভালো নিয়ন্ত্রণ রাখতে সাহায্য করে। আয়, খরচ, টাকা স্থানান্তর এবং ঋণের হিসাব এক জায়গায় সুন্দরভাবে পরিচালনা করুন এবং সবসময় আপনার আর্থিক অবস্থার একটি পরিষ্কার ধারণা রাখুন।",
      },

      {
        heading: "মানি মেট কীভাবে ব্যবহার করবেন?",
        body: [
          "প্রথমে আপনার অ্যাকাউন্ট তৈরি করে প্রোফাইল সেটআপ করুন",
          "ক্যাশ, বিকাশ, নগদ, রকেট বা ব্যাংকের মতো আপনার মানিব্যাগগুলো যোগ করুন",
          "টাকা পাওয়ার পর আপনার আয় হিসেবে তা রেকর্ড করুন",
          "প্রতিদিনের খরচগুলো রেকর্ড করে উপযুক্ত ক্যাটাগরি নির্বাচন করুন",
          "প্রয়োজন অনুযায়ী এক মানিব্যাগ থেকে অন্য মানিব্যাগে টাকা স্থানান্তর করুন",
          "ঋণ যোগ করুন এবং প্রতিটি পেমেন্টের হিসাব সংরক্ষণ করুন",
          "চার্ট ও ক্যালেন্ডার ভিউ ব্যবহার করে আপনার খরচের ধরন বিশ্লেষণ করুন",
          "আপনার প্রয়োজন অনুযায়ী কাস্টম ক্যাটাগরি তৈরি করুন",
          "নিয়মিত আপনার আর্থিক হিসাব পর্যালোচনা করে ভালো অর্থ ব্যবস্থাপনার অভ্যাস গড়ে তুলুন",
        ],
      },

      {
        heading: "মূল বৈশিষ্ট্য",
        body: [
          "কাস্টমাইজযোগ্য ক্যাটাগরির মাধ্যমে আয় ও খরচ ট্র্যাক করুন",
          "একাধিক মানিব্যাগ পরিচালনা করুন — ক্যাশ, বিকাশ, নগদ, রকেট ও ব্যাংক",
          "সহজেই এক মানিব্যাগ থেকে অন্য মানিব্যাগে টাকা স্থানান্তর করুন",
          "বিস্তারিত পেমেন্ট ইতিহাসসহ ঋণের হিসাব রাখুন",
          "ভিজ্যুয়াল চার্ট ও ক্যালেন্ডার ভিউয়ের মাধ্যমে খরচের ধরন বুঝুন",
          "নিজের প্রয়োজন অনুযায়ী কাস্টম ক্যাটাগরি তৈরি ও পরিচালনা করুন",
          "লাইট ও ডার্ক থিমের মধ্যে পরিবর্তন করুন",
        ],
      },

      {
        heading: "মানি মেট কাদের জন্য?",
        body: "মানি মেট তাদের জন্য তৈরি, যারা নিজেদের আর্থিক ব্যবস্থাপনাকে আরও সহজ ও গোছানো করতে চান। মাসিক বাজেট পরিচালনাকারী শিক্ষার্থী, পেমেন্ট ট্র্যাক করা ফ্রিল্যান্সার, ক্যাশ ফ্লো পর্যবেক্ষণকারী ছোট ব্যবসায়ী কিংবা ভালো আর্থিক অভ্যাস গড়ে তুলতে আগ্রহী যে কেউ—মানি মেট তাদের দৈনন্দিন অর্থ ব্যবস্থাপনাকে আরও সহজ করে তোলে।",
      },

      {
        heading: "আপনার গোপনীয়তা আমাদের কাছে গুরুত্বপূর্ণ",
        body: "আপনার আর্থিক তথ্যের গোপনীয়তাকে আমরা গুরুত্বের সাথে বিবেচনা করি। আপনার তথ্য নিরাপদভাবে সংরক্ষণ করা হয় এবং আপনার অ্যাকাউন্টের মাধ্যমে এর অ্যাক্সেস সুরক্ষিত থাকে। মানি মেট এমনভাবে তৈরি করা হয়েছে, যাতে আপনার আর্থিক তথ্য ব্যক্তিগত থাকে এবং আপনার ব্যক্তিগত ডেটার উপর আপনার নিয়ন্ত্রণ বজায় থাকে।",
      },
    ],

    version: "ভার্সন",
    developer: "যত্ন ও দায়িত্বের সাথে তৈরি",
  },
} as const;

function AboutSection() {
  const [isOpen, setIsOpen] = useState(false);
  const [lang, setLang] = useState<"en" | "bn">("en");
  const t = ABOUT_CONTENT[lang];

  return (
    <Panel className="transition-colors">
      <div
        className="flex cursor-pointer items-center justify-between"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
            <Info className="h-5 w-5" />
          </span>
          <div className="text-left">
            <h3 className="text-sm font-bold">{t.title}</h3>
            <p className="text-xs text-muted-foreground">{t.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isOpen && (
            <div
              className="flex items-center gap-1 rounded-lg bg-muted p-0.5"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setLang("en")}
                className={cn(
                  "flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
                  lang === "en"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Globe className="h-3 w-3" />
                EN
              </button>
              <button
                type="button"
                onClick={() => setLang("bn")}
                className={cn(
                  "flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
                  lang === "bn"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Globe className="h-3 w-3" />
                BN
              </button>
            </div>
          )}
          <ChevronDown
            className={cn(
              "h-5 w-5 text-muted-foreground transition-transform duration-200",
              isOpen && "rotate-180",
            )}
          />
        </div>
      </div>

      {isOpen && (
        <div className="mt-4 border-t border-border pt-4">
          <div className="space-y-4">
            {t.sections.map((s) => (
              <div key={s.heading}>
                <h4 className="mb-1 text-xs font-bold uppercase tracking-wide text-primary">
                  {s.heading}
                </h4>
                {Array.isArray(s.body) ? (
                  <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                    {s.body.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 border-t border-border pt-3 text-center text-[10px] text-muted-foreground/60">
            {t.version} 1.0.0 &middot; {t.developer} &hearts;
          </div>
        </div>
      )}
    </Panel>
  );
}
