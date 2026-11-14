"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./AuthContext";
import { formatDigitalTimer, getInitials } from "@/lib/date-utils";
import {
  Clock,
  CheckSquare,
  BarChart2,
  Users,
  LogOut,
  ChevronDown,
  ArrowRight,
  Menu,
  X,
} from "lucide-react";

export default function Navbar() {
  const { user, activeSession, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Live timer for active session in navbar
  useEffect(() => {
    if (!activeSession || !activeSession.startTime) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setElapsedSeconds(0);
      return;
    }

    const startMs = new Date(activeSession.startTime).getTime();
    const update = () => {
      const now = Date.now();
      setElapsedSeconds(Math.max(0, Math.floor((now - startMs) / 1000)));
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileMenuOpen]);

  const navLinks = [
    {
      href: "/tasks",
      label: "Tasks",
      icon: CheckSquare,
      active: pathname.startsWith("/tasks"),
    },
    {
      href: "/timesheet",
      label: "Work Logs",
      icon: BarChart2,
      active: pathname === "/timesheet",
    },
    ...(user?.role === "admin"
      ? [
          {
            href: "/users",
            label: "Team",
            icon: Users,
            active: pathname.startsWith("/users"),
          },
        ]
      : []),
  ];

  const handleLogout = async () => {
    await logout();
    setDropdownOpen(false);
    setMobileMenuOpen(false);
    router.replace("/login");
    router.refresh();
  };

  return (
    <>
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-2 sm:gap-3">
          {/* Logo & Main Nav */}
          <div className="flex min-w-0 items-center gap-3 sm:gap-8">
            <Link
              href="/tasks"
              className="group flex shrink-0 items-center space-x-2 sm:space-x-2.5"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-sm shadow-indigo-200 transition-transform group-hover:scale-105">
                <Clock className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-bold leading-tight tracking-tight text-slate-900">
                  NexTrack
                </span>
                <span className="hidden text-[10px] font-semibold uppercase tracking-wider text-indigo-600 sm:block">
                  Time &amp; Tasks
                </span>
              </div>
            </Link>

            {user && (
              <nav className="hidden items-center space-x-1 md:flex">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center space-x-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                      link.active
                        ? "bg-slate-100 font-semibold text-slate-900"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <link.icon className="h-4 w-4 text-slate-500" />
                    <span>{link.label}</span>
                  </Link>
                ))}
              </nav>
            )}
          </div>

          {/* Right Actions: Active Timer & User Profile */}
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            {/* Live Active Session Banner */}
            {activeSession && (
              <Link
                href={`/tasks/${activeSession.taskId}`}
                className="group flex items-center space-x-1.5 rounded-full border border-amber-200/80 bg-amber-50 px-2 py-1.5 text-xs font-medium text-amber-900 shadow-sm transition-all hover:bg-amber-100/90 sm:space-x-2 sm:px-3"
                title="Active work session in progress"
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                </span>
                <span className="font-mono font-semibold tracking-wide text-amber-950">
                  {formatDigitalTimer(elapsedSeconds)}
                </span>
                <span className="hidden text-amber-800 sm:inline">
                  · {activeSession.taskCode}
                </span>
                <ArrowRight className="h-3 w-3 text-amber-700 transition-transform group-hover:translate-x-0.5" />
              </Link>
            )}

            {/* User Profile */}
            {loading ? (
              <div className="h-8 w-8 animate-pulse rounded-lg bg-slate-100" />
            ) : user ? (
              <div className="relative">
                <button
                  onClick={() => {
                    setDropdownOpen(!dropdownOpen);
                    setMobileMenuOpen(false);
                  }}
                  aria-label="Open user menu"
                  className="flex items-center space-x-2 rounded-xl border border-transparent p-1.5 transition-colors hover:border-slate-200 hover:bg-slate-100 sm:space-x-2.5"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-100 text-xs font-bold text-indigo-700">
                    {getInitials(user.name)}
                  </div>
                  <div className="hidden text-left lg:block">
                    <p className="text-xs font-semibold leading-tight text-slate-900">
                      {user.name}
                    </p>
                    <p className="text-[11px] capitalize text-slate-500">
                      {user.title || user.role}
                    </p>
                  </div>
                  <ChevronDown className="hidden h-3.5 w-3.5 text-slate-400 sm:block" />
                </button>

                {dropdownOpen && (
                  <div
                    className="absolute right-0 z-50 mt-2 w-[min(18rem,calc(100vw-1.5rem))] rounded-2xl border border-slate-200 bg-white py-2 shadow-xl animate-in fade-in slide-in-from-top-2"
                    onMouseLeave={() => setDropdownOpen(false)}
                  >
                    <div className="border-b border-slate-100 px-4 py-2.5">
                      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                        Signed in as
                      </p>
                      <p className="text-sm font-semibold text-slate-900">
                        {user.name}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {user.email}
                      </p>
                      <span className="mt-1 inline-block rounded-md border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-700">
                        {user.title ? `${user.role} · ${user.title}` : user.role}
                      </span>
                    </div>

                    <div className="pt-1">
                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center space-x-2 px-4 py-2 text-left text-xs font-medium text-rose-600 transition-colors hover:bg-rose-50"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  href="/login"
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
                >
                  Log In
                </Link>
                <Link
                  href="/signup"
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
                >
                  Sign Up
                </Link>
              </div>
            )}

            {/* Mobile menu trigger */}
            {user && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(true);
                  setDropdownOpen(false);
                }}
                aria-label="Open navigation menu"
                aria-expanded={mobileMenuOpen}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 md:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>

      {/* Mobile navigation drawer */}
      {user && mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close navigation menu"
            className="absolute inset-0 h-full w-full bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />

          <aside className="absolute right-0 top-0 flex h-full w-[84vw] max-w-xs flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
              <Link
                href="/tasks"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center space-x-2.5"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-sm shadow-indigo-200">
                  <Clock className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-base font-bold leading-tight text-slate-900">
                    NexTrack
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600">
                    Time &amp; Tasks
                  </span>
                </div>
              </Link>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation menu"
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto p-3">
              <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Navigation
              </p>
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${
                    link.active
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <span className="flex items-center space-x-3">
                    <link.icon
                      className={`h-4 w-4 ${
                        link.active ? "text-indigo-600" : "text-slate-400"
                      }`}
                    />
                    <span>{link.label}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 opacity-40" />
                </Link>
              ))}

              {activeSession && (
                <div className="pt-3">
                  <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Active Session
                  </p>
                  <Link
                    href={`/tasks/${activeSession.taskId}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs font-semibold text-amber-900"
                  >
                    <span className="min-w-0 truncate">
                      {activeSession.taskCode} · {activeSession.taskTitle}
                    </span>
                    <span className="ml-2 shrink-0 font-mono">
                      {formatDigitalTimer(elapsedSeconds)}
                    </span>
                  </Link>
                </div>
              )}
            </nav>

            <div className="border-t border-slate-100 p-3">
              <div className="mb-2 flex items-center space-x-3 rounded-xl bg-slate-50 px-3 py-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-100 text-xs font-bold text-indigo-700">
                  {getInitials(user.name)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-900">
                    {user.name}
                  </p>
                  <p className="truncate text-[11px] capitalize text-slate-500">
                    {user.role} · {user.title || "Team Member"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center space-x-2 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}