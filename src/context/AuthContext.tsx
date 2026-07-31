import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/** Local-only account record persisted in localStorage. */
export type LocalUser = {
  name: string;
  email: string;
  /** Hashed password — never store plaintext, even locally. */
  passwordHash: string;
  createdAt: string;
};

type AuthState = {
  ready: boolean;
  user: Omit<LocalUser, "passwordHash"> | null;
  hasAccount: boolean;
  signUp: (input: { name: string; email: string; password: string }) => Promise<void>;
  signIn: (input: { email: string; password: string }) => Promise<void>;
  signOut: () => void;
  resetAccount: () => void;
};

const USER_KEY = "moneymate.auth.user";
const SESSION_KEY = "moneymate.auth.session";

const AuthContext = createContext<AuthState | null>(null);

async function hashPassword(password: string) {
  const data = new TextEncoder().encode(`moneymate::${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function readUser(): LocalUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as LocalUser) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [account, setAccount] = useState<LocalUser | null>(null);
  const [signedIn, setSignedIn] = useState(false);

  // Hydrate after mount so SSR and the client render the same initial markup.
  useEffect(() => {
    const stored = readUser();
    setAccount(stored);
    setSignedIn(Boolean(stored) && localStorage.getItem(SESSION_KEY) === "active");
    setReady(true);
  }, []);

  const value = useMemo<AuthState>(() => {
    return {
      ready,
      hasAccount: Boolean(account),
      user: signedIn && account ? { name: account.name, email: account.email, createdAt: account.createdAt } : null,
      async signUp({ name, email, password }) {
        const record: LocalUser = {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          passwordHash: await hashPassword(password),
          createdAt: new Date().toISOString(),
        };
        localStorage.setItem(USER_KEY, JSON.stringify(record));
        localStorage.setItem(SESSION_KEY, "active");
        setAccount(record);
        setSignedIn(true);
      },
      async signIn({ email, password }) {
        const stored = readUser();
        if (!stored) throw new Error("No account found on this device. Please sign up first.");
        const hash = await hashPassword(password);
        if (stored.email !== email.trim().toLowerCase() || stored.passwordHash !== hash) {
          throw new Error("Incorrect email or password.");
        }
        localStorage.setItem(SESSION_KEY, "active");
        setAccount(stored);
        setSignedIn(true);
      },
      signOut() {
        localStorage.removeItem(SESSION_KEY);
        setSignedIn(false);
      },
      resetAccount() {
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(SESSION_KEY);
        setAccount(null);
        setSignedIn(false);
      },
    };
  }, [ready, account, signedIn]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
