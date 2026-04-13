"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import api from "@/lib/api";

export interface User {
  id?: string; _id?: string;
  name: string; username: string; email: string;
  avatar: { url: string; public_id?: string };
  bio: string; location: string; website: string; category: string;
  skills: string[]; interests: string[];
  followers_count: number; following_count: number; posts_count: number;
  impact_score: number; is_verified: boolean; role: string;
  auth_provider: string; created_at: string;
  last_claim_date?: string; claim_streak?: number; can_claim_today?: boolean;
}

interface AuthState {
  user:            User | null;
  token:           string | null;
  isLoading:       boolean;
  isAuthenticated: boolean;
  setAuth:  (user: User, token: string) => void;
  setUser:  (user: User) => void;
  logout:   () => void;
  fetchMe:  () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null, token: null, isLoading: false, isAuthenticated: false,

      setAuth: (user, token) => {
        if (typeof window !== "undefined") localStorage.setItem("ci_token", token);
        set({ user, token, isAuthenticated: true });
      },

      setUser: (user) => set({ user }),

      logout: () => {
        if (typeof window !== "undefined") localStorage.removeItem("ci_token");
        set({ user: null, token: null, isAuthenticated: false });
      },

      fetchMe: async () => {
        const token = get().token;
        if (!token) {
          set({ isAuthenticated: false });
          return;
        }

        set({ isLoading: true });
        try {
          const { data } = await api.get("/auth/me");
          // Re-sync the user data and confirm authentication
          set({ user: data.user ?? data, isAuthenticated: true });
        } catch (error) {
          // If the token is dead, wipe the session
          if (typeof window !== "undefined") localStorage.removeItem("ci_token");
          set({ user: null, token: null, isAuthenticated: false });
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: "ci_auth_v3",
      storage: createJSONStorage(() => localStorage),
      // CRITICAL: This saves the 'logged in' state to the browser
      partialize: (state) => ({ 
        token: state.token, 
        user: state.user, 
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);