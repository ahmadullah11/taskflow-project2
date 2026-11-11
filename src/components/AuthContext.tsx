"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { AuthUser, WorkSessionDoc } from "@/lib/types";

interface AuthContextType {
  user: AuthUser | null;
  activeSession: WorkSessionDoc | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  signup: (data: { name: string; email: string; password?: string; role?: string; title?: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  quickLogin: (email: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  activeSession: null,
  loading: true,
  login: async () => ({ success: false }),
  signup: async () => ({ success: false }),
  logout: async () => {},
  refreshAuth: async () => {},
  quickLogin: async () => false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [activeSession, setActiveSession] = useState<WorkSessionDoc | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setActiveSession(data.activeSession);
      } else {
        setUser(null);
        setActiveSession(null);
      }
    } catch (err) {
      console.error("Auth check failed:", err);
      setUser(null);
      setActiveSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  const login = async (email: string, password = "password123") => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || "Login failed" };
      }
      await refreshAuth();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Network error" };
    }
  };

  const signup = async (formData: {
    name: string;
    email: string;
    password?: string;
    role?: string;
    title?: string;
  }) => {
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password || "password123",
          role: formData.role || "member",
          title: formData.title || "Software Engineer",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || "Signup failed" };
      }
      await refreshAuth();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Network error" };
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      setActiveSession(null);
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const quickLogin = async (email: string) => {
    const res = await login(email, "password123");
    return res.success;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        activeSession,
        loading,
        login,
        signup,
        logout,
        refreshAuth,
        quickLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
