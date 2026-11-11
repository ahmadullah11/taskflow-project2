"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthContext";
import { Clock, Lock, Mail, ArrowRight, Sparkles, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login, quickLogin } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);
    setError(null);
    const result = await login(email, password);
    if (result.success) {
      router.push("/tasks");
    } else {
      setError(result.error || "Login failed.");
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail: string) => {
    setLoading(true);
    setError(null);
    const success = await quickLogin(demoEmail);
    if (success) {
      router.push("/tasks");
    } else {
      setError("Demo login failed. Make sure database is seeded.");
      setLoading(false);
    }
  };

  const demoAccounts = [
    { name: "Ahmad Ullah", email: "ahmad@company.com", role: "Software Engineer" },
    { name: "Sarah Jenkins", email: "sarah@company.com", role: "Product Manager" },
    { name: "Alex Rivera", email: "alex@company.com", role: "Frontend Developer" },
    { name: "System Admin", email: "admin@company.com", role: "Administrator" },
  ];

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-6">
        {/* Logo and Header */}
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white mx-auto shadow-md shadow-indigo-200 mb-3">
            <Clock className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Welcome back
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Sign in to track tasks and log your team hours
          </p>
        </div>

        {/* Demo Fast Login Panel */}
        <div className="bg-indigo-50/70 border border-indigo-100 rounded-3xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-900 flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>1-Click Demo Profiles</span>
            </span>
            <span className="text-[10px] text-indigo-600 font-semibold bg-indigo-100 px-2 py-0.5 rounded-full">
              Instant
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {demoAccounts.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => handleDemoLogin(account.email)}
                disabled={loading}
                className="text-left p-2.5 rounded-xl bg-white border border-indigo-100 hover:border-indigo-300 hover:shadow-xs transition-all group disabled:opacity-50"
              >
                <p className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 leading-tight">
                  {account.name}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                  {account.role}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-10 pr-4 py-2.5 text-xs font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 text-xs font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md shadow-indigo-200 disabled:opacity-50 transition-all flex items-center justify-center space-x-1.5"
            >
              <span>{loading ? "Signing In..." : "Sign In"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Don&apos;t have an account?{" "}
              <Link
                href="/signup"
                className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
              >
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
