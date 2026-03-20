"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { getPermissions, type AppPermissions } from "@/lib/permissions";

const API_BASE = "/api/auth";

export function useAuth() {
  const router = useRouter();
  const { user, accessToken, isLoading, isAuthenticated, setAuth, clearAuth, setLoading } =
    useAuthStore();

  // Check auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch(`${API_BASE}/me`, { credentials: "include" });
        if (res.ok) {
          const { data } = await res.json();
          setAuth(data, "cookie-based");
        } else {
          // Try refresh
          const refreshRes = await fetch(`${API_BASE}/refresh`, {
            method: "POST",
            credentials: "include",
          });
          if (refreshRes.ok) {
            const meRes = await fetch(`${API_BASE}/me`, { credentials: "include" });
            if (meRes.ok) {
              const { data } = await meRes.json();
              setAuth(data, "cookie-based");
              return;
            }
          }
          clearAuth();
        }
      } catch {
        clearAuth();
      }
    };

    if (!isAuthenticated && isLoading) {
      checkAuth();
    }
  }, [isAuthenticated, isLoading, setAuth, clearAuth, setLoading]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao fazer login");

      setAuth(json.data.user, json.data.accessToken);
      router.push("/");
      return json.data;
    },
    [setAuth, router]
  );

  const logout = useCallback(async () => {
    await fetch(`${API_BASE}/me`, {
      method: "DELETE",
      credentials: "include",
    }).catch(() => {});
    clearAuth();
    router.push("/login");
  }, [clearAuth, router]);

  const permissions: AppPermissions | null = user?.role
    ? getPermissions(user.role)
    : null;

  return {
    user,
    accessToken,
    isLoading,
    isAuthenticated,
    permissions,
    login,
    logout,
  };
}
