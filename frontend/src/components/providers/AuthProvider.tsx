"use client";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth.store";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const { token, fetchMe } = useAuthStore();

  useEffect(() => {
    const initAuth = async () => {
      try {
        // If a token was found in localStorage (via Zustand persist)
        if (token) {
          await fetchMe();
        }
      } catch (e) {
        console.error("Session restoration failed:", e);
      } finally {
        // Always set ready to true so the app actually loads
        setReady(true);
      }
    };

    initAuth();
  }, [fetchMe, token]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-civic-600 flex items-center justify-center shadow-lg">
            <span className="text-white font-bold">CI</span>
          </div>
          <div className="w-5 h-5 border-2 border-civic-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-medium">Loading session...</p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}