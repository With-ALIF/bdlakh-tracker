import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2, Lock, Mail, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign In or Sign Up — Money Mate" },
      { property: "og:title", content: "Sign In or Sign Up — Money Mate" },
    ],
  }),
  component: AuthPage,
});

const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(6, "Minimum 6 characters").max(100),
});

const signUpSchema = signInSchema.extend({
  name: z.string().trim().min(2, "Enter your name").max(60),
});

function AuthPage() {
  const { ready, hasAccount, user, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (ready) setMode(hasAccount ? "signin" : "signup");
  }, [ready, hasAccount]);

  useEffect(() => {
    if (user) navigate({ to: "/", replace: true });
  }, [user, navigate]);

  const form = useForm<{ name?: string; email: string; password: string }>({
    resolver: zodResolver(mode === "signup" ? signUpSchema : signInSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const submitting = form.formState.isSubmitting;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (mode === "signup") {
        await signUp({ name: values.name ?? "", email: values.email, password: values.password });
        toast.success("Account created — welcome to Money Mate!");
      } else {
        await signIn({ email: values.email, password: values.password });
        toast.success("Signed in successfully");
      }
      navigate({ to: "/", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    }
  });

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <img src="https://i.postimg.cc/LsGN35xY/moneymate.png" alt="Money Mate Logo" className="h-16 w-16 rounded-2xl border-2 border-primary p-1" />
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-primary">
            {mode === "signup" ? "Create your Money Mate profile" : "Welcome back"}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {mode === "signup"
              ? "Your account stays on this device — no server, no sign-up email."
              : "Sign in to unlock your income and expense records."}
          </p>
        </div>

        <div className="card-surface animate-rise p-5 sm:p-6">
          <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  form.reset({ name: "", email: "", password: "" });
                }}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                  mode === m ? "bg-card text-foreground shadow-card" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "signin" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {mode === "signup" ? (
              <Field label="Full name" icon={<UserIcon className="h-4 w-4" />} error={form.formState.errors.name?.message}>
                <Input placeholder="Rahim Uddin" autoComplete="name" {...form.register("name")} />
              </Field>
            ) : null}

            <Field label="Email" icon={<Mail className="h-4 w-4" />} error={form.formState.errors.email?.message}>
              <Input type="email" placeholder="you@example.com" autoComplete="email" {...form.register("email")} />
            </Field>

            <Field label="Password" icon={<Lock className="h-4 w-4" />} error={form.formState.errors.password?.message}>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  {...form.register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {mode === "signup" ? "Create account" : "Sign in"}
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  icon,
  error,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </Label>
      {children}
      {error ? <p className="text-xs font-medium text-danger">{error}</p> : null}
    </div>
  );
}
