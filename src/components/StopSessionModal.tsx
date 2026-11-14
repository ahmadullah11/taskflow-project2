"use client";

import React, { useState } from "react";
import { formatDigitalTimer, formatDurationSeconds } from "@/lib/date-utils";
import { Clock, CheckCircle2, AlertCircle, X, Sparkles } from "lucide-react";

interface StopSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { summary: string; markCompleted: boolean }) => Promise<void>;
  elapsedSeconds: number;
  taskTitle: string;
  taskCode: string;
}

export default function StopSessionModal({
  isOpen,
  onClose,
  onSubmit,
  elapsedSeconds,
  taskTitle,
  taskCode,
}: StopSessionModalProps) {
  const [summary, setSummary] = useState("");
  const [markCompleted, setMarkCompleted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    // Reset transient state so a previous submission can never leak into the
    // next session (e.g. leaving "Mark task as Completed" checked).
    setError(null);
    setSummary("");
    setMarkCompleted(false);
    onClose();
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.trim() || summary.trim().length < 5) {
      setError("Please describe what you accomplished during this session (at least 5 characters).");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await onSubmit({ summary: summary.trim(), markCompleted });
      setSummary("");
      setMarkCompleted(false);
      setError(null);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit progress report.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 p-3 backdrop-blur-sm sm:p-4">
      <div className="relative max-h-[90vh] w-[94vw] max-w-lg overflow-y-auto rounded-2xl border border-slate-100 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur-sm sm:px-6 sm:py-5">
          <div className="flex min-w-0 items-center space-x-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-indigo-100 bg-indigo-50 text-indigo-600">
              <Clock className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold leading-tight text-slate-900">
                Finish Work Session
              </h3>
              <p className="truncate text-xs font-medium text-slate-500">
                {taskCode} · {taskTitle}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            aria-label="Close session modal"
            className="shrink-0 rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-5 p-5 sm:p-6">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Session Duration Highlight Box */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-2xl shadow-inner flex items-center justify-between">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block mb-0.5">
                Session Duration
              </span>
              <div className="text-3xl font-extrabold font-mono tracking-tight text-white">
                {formatDigitalTimer(elapsedSeconds)}
              </div>
              <span className="text-xs text-emerald-400 font-medium mt-0.5 block">
                ≈ {formatDurationSeconds(elapsedSeconds)} logged
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/15">
              <Sparkles className="w-6 h-6 text-indigo-300" />
            </div>
          </div>

          {/* Mandatory Progress Report */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="summary"
                className="text-xs font-semibold text-slate-800 flex items-center space-x-1"
              >
                <span>What did you accomplish during these hours?</span>
                <span className="text-rose-500 font-bold">*</span>
              </label>
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                Mandatory
              </span>
            </div>
            <textarea
              id="summary"
              rows={4}
              required
              value={summary}
              onChange={(e) => {
                setSummary(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g., Implemented JWT authentication, configured access tokens and refresh tokens, and tested login APIs."
              className="w-full resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 text-base text-slate-900 placeholder:text-slate-400 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <p className="text-[11px] text-slate-500">
              This summary will be added to the task&apos;s public work history log for team accountability and timesheet tracking.
            </p>
          </div>

          {/* Mark Task as Completed Checkbox */}
          <label className="flex items-start space-x-3 p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={markCompleted}
              onChange={(e) => setMarkCompleted(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <div className="text-xs">
              <span className="font-semibold text-slate-900 block">
                Mark task as Completed
              </span>
              <span className="text-slate-500 font-normal">
                Check this if all deliverables for this task are finished and verified.
              </span>
            </div>
          </label>

          {/* Actions */}
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="w-full rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-800 sm:w-auto sm:py-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !summary.trim()}
              className="flex w-full items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-200 transition-all hover:from-indigo-700 hover:to-violet-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:py-2"
            >
              {loading ? (
                <span>Logging Session...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Submit Progress Report & Log Time</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
