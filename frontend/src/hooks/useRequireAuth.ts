import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
export function useRequireAuth(redirect = "/login") {
  const { isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();
  useEffect(() => { if (!isLoading && !isAuthenticated) router.replace(redirect); }, [isAuthenticated, isLoading]);
  return { isAuthenticated, isLoading };
}
