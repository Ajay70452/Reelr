import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase } from "@/lib/supabase";

interface User {
  id: string;
  email: string;
  name?: string;
  credits: number;
  plan: "free" | "basic" | "pro" | "premium";
}

interface UserState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setUser: (user: Partial<User> & { id: string; email: string }) => void;
  updateCredits: (credits: number) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
  initAuth: () => Promise<void>;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,

      setUser: (userData) => {
        const user: User = {
          credits: 0,
          plan: "free",
          ...userData,
        };
        set({ user, isAuthenticated: true, isLoading: false });
      },

      updateCredits: (credits) => {
        set((state) => ({
          user: state.user ? { ...state.user, credits } : null,
        }));
      },

      setLoading: (loading) => {
        set({ isLoading: loading });
      },

      logout: async () => {
        await supabase.auth.signOut();
        set({ user: null, isAuthenticated: false, isLoading: false });
      },

      initAuth: async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();

          if (session?.user) {
            const user: User = {
              id: session.user.id,
              email: session.user.email || "",
              name: session.user.user_metadata?.name || session.user.email?.split("@")[0],
              credits: get().user?.credits ?? 0,
              plan: (get().user?.plan as User["plan"]) ?? "free",
            };
            set({ user, isAuthenticated: true, isLoading: false });
          } else {
            set({ user: null, isAuthenticated: false, isLoading: false });
          }
        } catch {
          set({ isLoading: false });
        }

        // Listen for auth state changes
        supabase.auth.onAuthStateChange((_event, session) => {
          if (session?.user) {
            const currentUser = get().user;
            const user: User = {
              id: session.user.id,
              email: session.user.email || "",
              name: session.user.user_metadata?.name || session.user.email?.split("@")[0],
              credits: currentUser?.credits ?? 0,
              plan: (currentUser?.plan as User["plan"]) ?? "free",
            };
            set({ user, isAuthenticated: true, isLoading: false });
          } else {
            set({ user: null, isAuthenticated: false, isLoading: false });
          }
        });
      },
    }),
    {
      name: "user-storage",
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
