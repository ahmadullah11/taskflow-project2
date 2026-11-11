"use client";

import React from "react";
import { WorkSessionDoc } from "@/lib/types";
import {
  formatDateFull,
  formatTimeRange,
  formatDurationSeconds,
  getInitials,
} from "@/lib/date-utils";
import { Clock, CheckCircle2, History, MessageSquareQuote } from "lucide-react";

interface WorkHistoryListProps {
  sessions: WorkSessionDoc[];
  totalDurationSeconds: number;
}

export default function WorkHistoryList({
  sessions,
  totalDurationSeconds,
}: WorkHistoryListProps) {
  const completedSessions = sessions.filter((s) => s.status === "completed");

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 leading-tight">
              Work History
            </h3>
            <p className="text-xs text-slate-500">
              {completedSessions.length} logged {completedSessions.length === 1 ? "session" : "sessions"}
            </p>
          </div>
        </div>

        {/* Aggregated Total Time Badge */}
        <div className="flex items-center space-x-2 px-3.5 py-1.5 bg-slate-50 border border-slate-200/80 rounded-2xl">
          <Clock className="w-4 h-4 text-indigo-600" />
          <span className="text-xs text-slate-500 font-medium">Total Time Tracked:</span>
          <span className="text-xs font-bold text-slate-900">
            {formatDurationSeconds(totalDurationSeconds)}
          </span>
        </div>
      </div>

      {/* Session Entries */}
      <div className="mt-6 space-y-5">
        {completedSessions.length === 0 ? (
          <div className="text-center py-10 px-4">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 mb-3">
              <Clock className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-slate-800">
              No work sessions logged yet
            </p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              Start working on this task and click &ldquo;End / Finish Task&rdquo; to log your hours and progress report.
            </p>
          </div>
        ) : (
          completedSessions.map((session) => (
            <div
              key={session._id?.toString() || session.startTime.toString()}
              className="p-5 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors space-y-4"
            >
              {/* Member & Session Meta Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center border border-indigo-200/70">
                    {getInitials(session.userName)}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-slate-900">
                        {session.userName}
                      </span>
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Completed</span>
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {session.userTitle || "Team Member"}
                    </p>
                  </div>
                </div>

                {/* Date & Exact Time Window */}
                <div className="text-left sm:text-right">
                  <div className="text-xs font-semibold text-slate-800">
                    {formatDateFull(session.startTime)}
                  </div>
                  <div className="text-xs text-slate-500 font-medium">
                    {formatTimeRange(session.startTime, session.endTime)}
                  </div>
                </div>
              </div>

              {/* Duration and Summary Section */}
              <div className="pt-2 border-t border-slate-200/60">
                <div className="flex items-baseline space-x-2 mb-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Duration:
                  </span>
                  <span className="text-base font-extrabold text-slate-900 font-mono">
                    {formatDurationSeconds(session.durationSeconds)}
                  </span>
                </div>

                {/* Written Progress Summary */}
                {session.summary ? (
                  <div className="relative bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
                    <div className="flex items-start space-x-2">
                      <MessageSquareQuote className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal">
                        {session.summary}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs italic text-slate-400">
                    No progress report notes provided.
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
