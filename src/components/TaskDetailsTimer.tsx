"use client";

import React, { useState, useEffect } from "react";
import { formatDigitalTimer, formatTimeOnly } from "@/lib/date-utils";
import { Play, Square, AlertCircle, Clock, ShieldAlert } from "lucide-react";
import { TaskDoc, AuthUser, WorkSessionDoc } from "@/lib/types";
import StopSessionModal from "./StopSessionModal";
import Link from "next/link";

interface TaskDetailsTimerProps {
  task: TaskDoc;
  currentUser: AuthUser | null;
  userActiveSession: WorkSessionDoc | null;
  onSessionUpdated: () => Promise<void>;
}

export default function TaskDetailsTimer({
  task,
  currentUser,
  userActiveSession,
  onSessionUpdated,
}: TaskDetailsTimerProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeTaskSession = task.activeSession;
  const isCurrentTaskRunning = Boolean(activeTaskSession);
  const isStartedByMe = Boolean(
    currentUser && activeTaskSession && activeTaskSession.userId === currentUser.id
  );

  // Check if current user has an active session on ANOTHER task
  const hasActiveSessionOnOtherTask = Boolean(
    userActiveSession &&
      userActiveSession.status === "active" &&
      userActiveSession.taskId !== task._id?.toString()
  );

  const isAssignee = Boolean(
    currentUser && task.assigneeId && task.assigneeId === currentUser.id
  );
  const isAdminUser = Boolean(
    currentUser && currentUser.role === "admin"
  );

  // Live timer tick
  useEffect(() => {
    if (!activeTaskSession || !activeTaskSession.startTime) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setElapsedSeconds(0);
      return;
    }

    const startMs = new Date(activeTaskSession.startTime).getTime();
    const update = () => {
      const now = Date.now();
      setElapsedSeconds(Math.max(0, Math.floor((now - startMs) / 1000)));
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [activeTaskSession]);

  const handleStartWorking = async () => {
    if (!currentUser) {
      setErrorMessage("Please log in to start working on this task.");
      return;
    }

    setErrorMessage(null);
    setActionLoading(true);
    try {
      const res = await fetch(`/api/tasks/${task._id || task.taskCode}/start`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to start working session");
      }
      await onSessionUpdated();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to start session");
    } finally {
      setActionLoading(false);
    }
  };

  const handleStopSubmit = async (data: { summary: string; markCompleted: boolean }) => {
    const res = await fetch(`/api/tasks/${task._id || task.taskCode}/stop`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const resData = await res.json();
    if (!res.ok) {
      throw new Error(resData.error || "Failed to stop session");
    }
    await onSessionUpdated();
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            Working session
          </h2>
        </div>
        {isCurrentTaskRunning && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
            ● Active Session Running
          </span>
        )}
      </div>

      {/* Error banner */}
      {errorMessage && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-start space-x-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
          <div>
            <p className="font-semibold">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Warning if user is working on another task */}
      {hasActiveSessionOnOtherTask && (
        <div className="mb-6 p-4 bg-amber-50/80 border border-amber-200 rounded-2xl text-xs text-amber-800 flex items-start space-x-3">
          <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
          <div>
            <p className="font-semibold text-amber-900">
              Active Session in Progress on Another Task
            </p>
            <p className="mt-0.5 text-amber-700">
              You already have a running session on{" "}
              <Link
                href={`/tasks/${userActiveSession?.taskId}`}
                className="underline font-semibold hover:text-amber-950"
              >
                {userActiveSession?.taskCode} ({userActiveSession?.taskTitle})
              </Link>
              . Under team business rules, a member cannot run multiple sessions at once.
            </p>
          </div>
        </div>
      )}

      {/* Main Digital Timer Display */}
      <div className="py-4 text-center sm:text-left">
        <div className="text-5xl sm:text-6xl font-black font-mono tracking-tight text-slate-900 mb-2">
          {formatDigitalTimer(elapsedSeconds)}
        </div>
        <p className="text-sm font-medium text-slate-500">
          Elapsed working time
        </p>

        {isCurrentTaskRunning && activeTaskSession?.startTime ? (
          <div className="mt-2 inline-flex items-center space-x-1.5 text-xs text-slate-600 bg-slate-50 px-3 py-1 rounded-full border border-slate-200">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>
              Started at {formatTimeOnly(activeTaskSession.startTime)} by{" "}
              <strong>{activeTaskSession.userName}</strong>
            </span>
          </div>
        ) : (
          <p className="mt-2 text-xs text-slate-400">
            Click &ldquo;Start Working&rdquo; to begin tracking time for this task.
          </p>
        )}
      </div>

      {/* Button Controls */}
      <div className="mt-6 pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
        <div>
          {isCurrentTaskRunning ? (
            <button
              onClick={() => setIsModalOpen(true)}
              disabled={actionLoading || (!isStartedByMe && !isAdminUser)}
              className="inline-flex items-center space-x-2.5 px-6 py-3 rounded-2xl font-bold text-sm bg-gradient-to-r from-rose-500 to-amber-600 hover:from-rose-600 hover:to-amber-700 text-white shadow-lg shadow-rose-200 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed group active:scale-95"
            >
              <Square className="w-4 h-4 fill-white text-white group-hover:scale-110 transition-transform" />
              <span>End / Finish Task</span>
            </button>
          ) : (
            <button
              onClick={handleStartWorking}
              disabled={
                actionLoading ||
                hasActiveSessionOnOtherTask ||
                (!isAssignee && !isAdminUser && Boolean(task.assigneeId))
              }
              className="inline-flex items-center space-x-2.5 px-6 py-3 rounded-2xl font-bold text-sm bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-lg shadow-indigo-200 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed group active:scale-95"
            >
              <Play className="w-4 h-4 fill-white text-white group-hover:scale-110 transition-transform" />
              <span>
                {actionLoading ? "Starting..." : "Start Working"}
              </span>
            </button>
          )}
        </div>

        {/* Informative footer note */}
        <div className="text-xs text-slate-400 font-medium">
          {isCurrentTaskRunning ? (
            <span className="flex items-center space-x-1.5 text-amber-600">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <span>Timer active · stopping will prompt for progress report</span>
            </span>
          ) : (
            <span>Auto-synced with server timestamp (UTC)</span>
          )}
        </div>
      </div>

      {/* Pop-up Log Modal */}
      <StopSessionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleStopSubmit}
        elapsedSeconds={elapsedSeconds}
        taskTitle={task.title}
        taskCode={task.taskCode}
      />
    </div>
  );
}
