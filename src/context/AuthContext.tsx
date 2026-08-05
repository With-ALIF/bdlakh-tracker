import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import { normalizePhotoUrl } from "@/routes/utils";
import type { User } from "@supabase/supabase-js";

export type UserProfile = {
  id: string;
  name: string;
  displayName: string | null;
  email: string;
  photoUrl: string | null;
  role: string | null;
  createdAt: string;
};

type DbProfile = {
  display_name?: string | null;
  email?: string | null;
  photo_url?: string | null;
  role?: string | null;
};

type AuthState = {
  ready: boolean;
  user: UserProfile | null;
  hasAccount: boolean;
  signUp: (input: { name: string; email: string; password: string }) => Promise<void>;
  signIn: (input: { email: string; password: string }) => Promise<void>;
  signOut: () => void;
  resetAccount: () => void;
  refetchProfile: () => Promise<void>;
  updatePassword: (input: { currentPassword: string; newPassword: string }) => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

function mapUser(authUser: User | null, profile?: DbProfile | null): UserProfile | null {
  if (!authUser) return null;

  const displayName =
    profile?.display_name?.trim() ||
    authUser.user_metadata?.full_name?.trim() ||
    authUser.user_metadata?.name?.trim() ||
    null;
  const email = profile?.email?.trim() || authUser.email || "";
  const photoUrl = normalizePhotoUrl(profile?.photo_url?.trim() || "") || null;
  const role = profile?.role || null;
  const name = displayName || email || "User";

  return {
    id: authUser.id,
    name,
    displayName,
    email,
    photoUrl,
    role,
    createdAt: authUser.created_at,
  };
}

async function fetchDbProfile(userId: string): Promise<DbProfile | null> {
  try {
    // 1. Fetch from `profiles` table first
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("display_name, email, role")
      .eq("id", userId)
      .maybeSingle();

    // 2. Fetch photo from `user_photos` (global photo table)
    const { data: photoData } = await supabase
      .from("user_photos")
      .select("photo_url")
      .eq("user_id", userId)
      .maybeSingle();

    if (!profileError && profileData) {
      return {
        ...profileData,
        photo_url: photoData?.photo_url ?? null,
      };
    }

    // 3. Fallback to `users` table
    const { data: userData } = await supabase
      .from("users")
      .select("full_name, email")
      .eq("id", userId)
      .maybeSingle();

    if (userData) {
      return {
        display_name: userData.full_name,
        email: userData.email,
        photo_url: photoData?.photo_url ?? null,
      };
    }
  } catch (err) {
    console.error("Error fetching profile:", err);
  }

  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [currentAuthUser, setCurrentAuthUser] = useState<User | null>(null);

  const loadUserAndProfile = useCallback(async (authUser: User | null) => {
    setCurrentAuthUser(authUser);
    if (!authUser) {
      setUser(null);
      return;
    }
    const dbProf = await fetchDbProfile(authUser.id);
    setUser(mapUser(authUser, dbProf));
  }, []);

  const refetchProfile = useCallback(async () => {
    if (currentAuthUser) {
      const dbProf = await fetchDbProfile(currentAuthUser.id);
      setUser(mapUser(currentAuthUser, dbProf));
    }
  }, [currentAuthUser]);

  useEffect(() => {
    let realtimeChannel: any = null;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const authUser = session?.user ?? null;
      await loadUserAndProfile(authUser);
      setReady(true);

      if (authUser) {
        realtimeChannel = supabase
          .channel(`public:user_photos:${authUser.id}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "user_photos",
              filter: `user_id=eq.${authUser.id}`,
            },
            (payload) => {
              refetchProfile();
            },
          )
          .subscribe();
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const authUser = session?.user ?? null;
      await loadUserAndProfile(authUser);
    });

    return () => {
      subscription.unsubscribe();
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
      }
    };
  }, [loadUserAndProfile]);

  const value = useMemo<AuthState>(
    () => ({
      ready,
      user,
      hasAccount: true,
      async signUp({ name, email, password }) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        });
        if (error) throw error;
      },
      async signIn({ email, password }) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      },
      async signOut() {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      },
      async resetAccount() {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      },
      async updatePassword({ currentPassword, newPassword }) {
        const email = currentAuthUser?.email;
        if (!email) throw new Error("No authenticated user");

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password: currentPassword,
        });
        if (signInError) throw new Error("Current password is incorrect");

        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
      },
      refetchProfile,
    }),
    [ready, user, refetchProfile, currentAuthUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
