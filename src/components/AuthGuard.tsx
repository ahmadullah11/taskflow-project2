"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./AuthContext";

const PUBLIC_ROUTES = ["/login", "/signup"];

function SessionLoader() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-slate-400">
      <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
      <p className="text-xs font-medium">Checking your session...</p>
    </div>
  );
}

/**
 * Client-side auth guard. The proxy already blocks unauthenticated requests
 * server-side, but this guard also covers client-side navigation and sign-out
 * so protected content is never shown without a signed-in user.
 */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isPublicRoute = pathname
    ? PUBLIC_ROUTES.some(
        (route) => pathname === route || pathname.startsWith(`${route}/`)
      )
    : false;

  useEffect(() => {
    if (loading || isPublicRoute) return;
    if (!user) {
      router.replace("/login");
    }
  }, [loading, isPublicRoute, user, router]);

  if (isPublicRoute) return <>{children}</>;

  if (loading || !user) {
    return <SessionLoader />;
  }

  return <>{children}</>;
}
