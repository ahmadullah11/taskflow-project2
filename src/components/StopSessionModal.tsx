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
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to submit progress report.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                Finish Work Session
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {taskCode} · {taskTitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
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
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 placeholder:text-slate-400 transition-all resize-none text-slate-900"
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
          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !summary.trim()}
              className="px-5 py-2 text-xs font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl shadow-md shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-all"
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
