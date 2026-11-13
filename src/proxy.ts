import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import { AUTH_COOKIE_NAME, JWT_SECRET } from "@/lib/auth-constants";

/**
 * Routes that require an authenticated session. Every dashboard route must be
 * listed here so unauthenticated visitors are redirected to /login before the
 * page is ever rendered.
 */
const PROTECTED_ROUTES = ["/", "/tasks", "/timesheet", "/users"];

/**
 * Public auth pages. Signed-in users are sent straight to the dashboard.
 */
const AUTH_ROUTES = ["/login", "/signup"];

function matchesRoute(pathname: string, route: string): boolean {
  if (route === "/") return pathname === "/";
  return pathname === route || pathname.startsWith(`${route}/`);
}

function isAuthenticated(token: string | undefined): boolean {
  if (!token) return false;

  try {
    jwt.verify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const authenticated = isAuthenticated(token);

  if (PROTECTED_ROUTES.some((route) => matchesRoute(pathname, route))) {
    if (!authenticated) {
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  if (AUTH_ROUTES.some((route) => matchesRoute(pathname, route)) && authenticated) {
    return NextResponse.redirect(new URL("/tasks", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/tasks/:path*",
    "/timesheet/:path*",
    "/users/:path*",
    "/login",
    "/signup",
  ],
};
