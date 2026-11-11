"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthContext";
import TaskDetailsTimer from "@/components/TaskDetailsTimer";
import WorkHistoryList from "@/components/WorkHistoryList";
import TaskAssigneeCard from "@/components/TaskAssigneeCard";
import { TaskDoc, WorkSessionDoc, TaskStatus } from "@/lib/types";
import {
  ArrowLeft,
  Calendar,
  Layers,
  Flag,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronRight,
  MoreVertical,
} from "lucide-react";

export default function TaskDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const taskId = resolvedParams.id;

  const { user: currentUser, activeSession: userActiveSession, refreshAuth } = useAuth();
  const [task, setTask] = useState<TaskDoc | null>(null);
  const [sessions, setSessions] = useState<WorkSessionDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTaskData = useCallback(async () => {
    try {
      const [taskRes, sessionsRes] = await Promise.all([
        fetch(`/api/tasks/${taskId}`, { cache: "no-store" }),
        fetch(`/api/tasks/${taskId}/sessions`, { cache: "no-store" }),
      ]);

      if (!taskRes.ok) {
        if (taskRes.status === 404) {
          setError("Task not found.");
        } else {
          setError("Failed to load task details.");
        }
        return;
      }

      const taskData = await taskRes.json();
      setTask(taskData.task);

      if (sessionsRes.ok) {
        const sessionsData = await sessionsRes.json();
        setSessions(sessionsData.sessions || []);
      }
    } catch (err: any) {
      console.error("Error loading task data:", err);
      setError("An unexpected error occurred while loading task data.");
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchTaskData();
  }, [fetchTaskData]);

  const handleSessionUpdated = async () => {
    await fetchTaskData();
    await refreshAuth();
  };

  const handleStatusChange = async (newStatus: TaskStatus) => {
    if (!task) return;
    try {
      const res = await fetch(`/api/tasks/${task._id || task.taskCode}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await fetchTaskData();
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Loading task details...
          </p>
        </div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="max-w-3xl mx-auto py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center mx-auto mb-4">
          <Clock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">
          {error || "Task Not Found"}
        </h2>
        <p className="text-sm text-slate-500 mb-6">
          The requested task might have been removed or the ID is incorrect.
        </p>
        <Link
          href="/tasks"
          className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-xs shadow-md shadow-indigo-200 hover:bg-indigo-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Tasks</span>
        </Link>
      </div>
    );
  }

  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case "In Progress":
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>In Progress</span>
          </span>
        );
      case "Completed":
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Completed</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            <span>Todo</span>
          </span>
        );
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "high":
        return "bg-orange-50 text-orange-700 border-orange-200";
      case "medium":
        return "bg-blue-50 text-blue-700 border-blue-200";
      default:
        return "bg-slate-50 text-slate-600 border-slate-200";
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500">
          <Link
            href="/tasks"
            className="hover:text-indigo-600 transition-colors flex items-center space-x-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Tasks</span>
          </Link>
          <ChevronRight className="w-3 h-3 text-slate-300" />
          <span className="text-slate-800 font-bold">{task.taskCode}</span>
        </div>

        {/* Quick Status Selector */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400 font-medium hidden sm:inline">
            Status:
          </span>
          <select
            value={task.status}
            onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
            className="text-xs font-semibold rounded-xl border border-slate-200 px-3 py-1.5 bg-white text-slate-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="Todo">Todo</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Main Task Header matching the prompt design */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Task Details
          </span>
          <span>·</span>
          {getStatusBadge(task.status)}
          <span
            className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getPriorityBadge(
              task.priority
            )}`}
          >
            {task.priority} priority
          </span>
        </div>

        {/* Large Crisp Title */}
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
          {task.title}
        </h1>

        {/* Task Code & Category */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-slate-500">
          <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
            {task.taskCode}
          </span>
          <span>·</span>
          <span className="flex items-center space-x-1">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span>{task.category || "General"}</span>
          </span>
          {task.createdBy && (
            <>
              <span>·</span>
              <span>Created by {task.createdBy.name}</span>
            </>
          )}
        </div>

        {/* Task Description */}
        {task.description && (
          <div className="mt-5 pt-5 border-t border-slate-100">
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {task.description}
            </p>
          </div>
        )}
      </div>

      {/* Two Column Layout: Assignee Card & Working Session Timer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Assignee Card */}
        <div className="lg:col-span-1 space-y-6">
          <TaskAssigneeCard
            task={task}
            currentUser={currentUser}
            onAssigneeUpdated={handleSessionUpdated}
          />

          {/* Quick Info Box */}
          <div className="bg-slate-50/70 rounded-3xl border border-slate-200/60 p-6 text-xs space-y-3">
            <div className="flex items-center justify-between text-slate-500 font-medium">
              <span>Task Code</span>
              <span className="font-mono font-bold text-slate-900">{task.taskCode}</span>
            </div>
            <div className="flex items-center justify-between text-slate-500 font-medium">
              <span>Category</span>
              <span className="font-bold text-slate-900">{task.category}</span>
            </div>
            <div className="flex items-center justify-between text-slate-500 font-medium">
              <span>Created Date</span>
              <span className="text-slate-700">
                {new Date(task.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Working Session Timer Widget */}
        <div className="lg:col-span-2">
          <TaskDetailsTimer
            task={task}
            currentUser={currentUser}
            userActiveSession={userActiveSession}
            onSessionUpdated={handleSessionUpdated}
          />
        </div>
      </div>

      {/* Work History Section */}
      <WorkHistoryList
        sessions={sessions}
        totalDurationSeconds={task.totalDurationSeconds || 0}
      />
    </div>
  );
}
