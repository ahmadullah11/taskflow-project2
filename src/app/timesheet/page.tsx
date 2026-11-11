"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthContext";
import { WorkSessionDoc, UserDoc } from "@/lib/types";
import {
  formatDateFull,
  formatTimeRange,
  formatDurationSeconds,
  getInitials,
} from "@/lib/date-utils";
import {
  Clock,
  Calendar,
  CheckCircle2,
  User,
  ArrowRight,
  MessageSquareQuote,
  Filter,
  BarChart3,
} from "lucide-react";

export default function TimesheetPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("all");
  const [sessions, setSessions] = useState<WorkSessionDoc[]>([]);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [loading, setLoading] = useState(true);

  // Load team users
  useEffect(() => {
    fetch("/api/users")
      .then((res) => res.json())
      .then((data) => {
        setUsers(data.users || []);
      })
      .catch(console.error);
  }, []);

  // Fetch time logs
  useEffect(() => {
    async function fetchLogs() {
      setLoading(true);
      try {
        const endpoint =
          selectedUserId === "all"
            ? "/api/users/all/time-logs"
            : `/api/users/${selectedUserId}/time-logs`;

        const res = await fetch(endpoint, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setSessions(data.sessions || []);
          setTotalSeconds(data.totalDurationSeconds || 0);
        }
      } catch (err) {
        console.error("Failed to load time logs:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, [selectedUserId]);

  const completedSessions = sessions.filter((s) => s.status === "completed");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Team Timesheet & Work Logs
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Review detailed session histories, timestamps, and progress reports submitted by team members.
          </p>
        </div>

        {/* Member Filter Dropdown */}
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-slate-500">Filter Member:</span>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="text-xs font-semibold rounded-2xl border border-slate-200 px-3.5 py-2 bg-white text-slate-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">All Team Members</option>
            {users.map((u) => (
              <option key={u._id?.toString()} value={u._id?.toString()}>
                {u.name} ({u.title || u.role})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Logged Time
            </span>
            <div className="text-2xl font-black font-mono text-slate-900 mt-1">
              {formatDurationSeconds(totalSeconds)}
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Completed Sessions
            </span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {completedSessions.length}
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Active Members Logged
            </span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {new Set(completedSessions.map((s) => s.userId)).size}
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Sessions List */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
        <h3 className="text-base font-bold text-slate-900">
          Work History & Progress Reports
        </h3>

        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500 font-medium">Loading session history...</p>
          </div>
        ) : completedSessions.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-800">
              No completed work sessions found
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Work sessions will appear here as soon as members stop their timers and submit progress reports.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {completedSessions.map((session) => (
              <div
                key={session._id?.toString() || session.startTime.toString()}
                className="p-5 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors space-y-3"
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center border border-indigo-200">
                      {getInitials(session.userName)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-slate-900">
                          {session.userName}
                        </span>
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-xs text-slate-500 font-medium">
                          {session.userTitle || "Team Member"}
                        </span>
                      </div>
                      <Link
                        href={`/tasks/${session.taskId}`}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center space-x-1 group"
                      >
                        <span className="font-mono">{session.taskCode}</span>
                        <span>·</span>
                        <span className="group-hover:underline">{session.taskTitle}</span>
                        <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    </div>
                  </div>

                  {/* Date & Time Window */}
                  <div className="text-left sm:text-right">
                    <div className="text-xs font-semibold text-slate-800">
                      {formatDateFull(session.startTime)}
                    </div>
                    <div className="text-xs text-slate-500">
                      {formatTimeRange(session.startTime, session.endTime)}
                    </div>
                  </div>
                </div>

                {/* Duration and Summary */}
                <div className="pt-2 border-t border-slate-200/60 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      Accomplished Progress:
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-700 leading-relaxed shadow-2xs">
                      <div className="flex items-start space-x-2">
                        <MessageSquareQuote className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                        <span>{session.summary}</span>
                      </div>
                    </div>
                  </div>

                  <div className="sm:text-right flex-shrink-0 self-end sm:self-auto">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Logged Time
                    </div>
                    <div className="text-lg font-black font-mono text-slate-900">
                      {formatDurationSeconds(session.durationSeconds)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
