"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthContext";
import { formatDigitalTimer } from "@/lib/date-utils";
import {
  Clock,
  CheckSquare,
  BarChart2,
  User,
  LogOut,
  ChevronDown,
  Sparkles,
  ArrowRight,
} from "lucide-react";

export default function Navbar() {
  const { user, activeSession, logout, quickLogin } = useAuth();
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Live timer for active session in navbar
  useEffect(() => {
    if (!activeSession || !activeSession.startTime) {
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

  const teamMembers = [
    { name: "Ahmad Ullah", email: "ahmad@company.com", role: "Software Engineer" },
    { name: "Sarah Jenkins", email: "sarah@company.com", role: "Product Manager" },
    { name: "Alex Rivera", email: "alex@company.com", role: "Frontend Developer" },
    { name: "System Admin", email: "admin@company.com", role: "Admin" },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Main Nav */}
          <div className="flex items-center space-x-8">
            <Link href="/tasks" className="flex items-center space-x-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-sm shadow-indigo-200 group-hover:scale-105 transition-transform">
                <Clock className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-slate-900 tracking-tight text-base leading-tight">
                  NexTrack
                </span>
                <span className="text-[10px] uppercase font-semibold tracking-wider text-indigo-600">
                  Time & Tasks
                </span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center space-x-1">
              <Link
                href="/tasks"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                  pathname.startsWith("/tasks")
                    ? "bg-slate-100 text-slate-900 font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <CheckSquare className="w-4 h-4 text-slate-500" />
                <span>Tasks</span>
              </Link>
              <Link
                href="/timesheet"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                  pathname === "/timesheet"
                    ? "bg-slate-100 text-slate-900 font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <BarChart2 className="w-4 h-4 text-slate-500" />
                <span>Work Logs</span>
              </Link>
            </nav>
          </div>

          {/* Right Actions: Active Timer & User Profile */}
          <div className="flex items-center space-x-3">
            {/* Live Active Session Banner */}
            {activeSession && (
              <Link
                href={`/tasks/${activeSession.taskId}`}
                className="flex items-center space-x-2 px-3 py-1.5 bg-amber-50 border border-amber-200/80 text-amber-900 rounded-full text-xs font-medium hover:bg-amber-100/90 transition-all shadow-sm group"
                title="Active work session in progress"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                <span className="font-mono font-semibold tracking-wide text-amber-950">
                  {formatDigitalTimer(elapsedSeconds)}
                </span>
                <span className="text-amber-800 hidden sm:inline">
                  · {activeSession.taskCode}
                </span>
                <ArrowRight className="w-3 h-3 text-amber-700 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            )}

            {/* User Profile / Quick Switcher */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center space-x-2.5 p-1.5 rounded-xl hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
                >
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center border border-indigo-200">
                    {user.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="text-left hidden lg:block">
                    <p className="text-xs font-semibold text-slate-900 leading-tight">
                      {user.name}
                    </p>
                    <p className="text-[11px] text-slate-500 capitalize">
                      {user.title || user.role}
                    </p>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {dropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2"
                    onMouseLeave={() => setDropdownOpen(false)}
                  >
                    <div className="px-4 py-2.5 border-b border-slate-100">
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                        Signed in as
                      </p>
                      <p className="text-sm font-semibold text-slate-900">
                        {user.name}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{user.email}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {user.role} · {user.title}
                      </span>
                    </div>

                    <div className="px-3 py-2 border-b border-slate-100">
                      <div className="flex items-center justify-between mb-1.5 px-1">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                          Switch Demo User
                        </span>
                        <Sparkles className="w-3 h-3 text-amber-500" />
                      </div>
                      <div className="space-y-1">
                        {teamMembers.map((member) => (
                          <button
                            key={member.email}
                            onClick={async () => {
                              await quickLogin(member.email);
                              setDropdownOpen(false);
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                              user.email === member.email
                                ? "bg-indigo-50 text-indigo-900 font-semibold"
                                : "text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            <div>
                              <p className="font-medium">{member.name}</p>
                              <p className="text-[10px] text-slate-500">{member.role}</p>
                            </div>
                            {user.email === member.email && (
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pt-1">
                      <button
                        onClick={async () => {
                          await logout();
                          setDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 flex items-center space-x-2 transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5" />
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
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Log In
                </Link>
                <Link
                  href="/signup"
                  className="px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
