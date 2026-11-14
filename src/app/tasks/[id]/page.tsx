"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthContext";
import TaskDetailsTimer from "@/components/TaskDetailsTimer";
import WorkHistoryList from "@/components/WorkHistoryList";
import TaskAssigneeCard from "@/components/TaskAssigneeCard";
import TaskEditModal from "@/components/TaskEditModal";
import ConfirmDialog from "@/components/ConfirmDialog";
import ImageLightbox from "@/components/ImageLightbox";
import { TaskDoc, WorkSessionDoc, TaskStatus } from "@/lib/types";
import {
  ArrowLeft,
  Layers,
  CheckCircle2,
  Clock,
  ChevronRight,
  Pencil,
  Trash2,
  Image as ImageIcon,
} from "lucide-react";

export default function TaskDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const taskId = resolvedParams.id;
  const router = useRouter();

  const { user: currentUser, activeSession: userActiveSession, refreshAuth } = useAuth();
  const [task, setTask] = useState<TaskDoc | null>(null);
  const [sessions, setSessions] = useState<WorkSessionDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);

  const fetchTaskData = useCallback(async () => {
    try {
      setError(null);
      const [taskRes, sessionsRes] = await Promise.all([
        fetch(`/api/tasks/${taskId}`, { cache: "no-store" }),
        fetch(`/api/tasks/${taskId}/sessions`, { cache: "no-store" }),
      ]);

      if (!taskRes.ok) {
        if (taskRes.status === 401) {
          setError("Please log in to view this task.");
        } else if (taskRes.status === 403) {
          setError("Access Restricted: This task is assigned to another team member. You can only view tasks assigned to or created by you.");
        } else if (taskRes.status === 404) {
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
    } catch (err) {
      console.error("Error loading task data:", err);
      setError("An unexpected error occurred while loading task data.");
    } finally {
      setLoading(false);
    }
    // Refetch when the signed-in user changes (1-click profile switcher).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId, currentUser?.id]);

  useEffect(() => {
    // Fetching task details on mount / user switch is the intended use here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const handleDeleteTask = async () => {
    if (!task) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/tasks/${task._id || task.taskCode}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete task");
      }
      router.push("/tasks");
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete task"
      );
      setDeleteLoading(false);
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

  const canEditTask =
    currentUser?.role === "admin" ||
    task.assigneeId === currentUser?.id ||
    task.assignee?._id === currentUser?.id ||
    task.createdById === currentUser?.id;

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center space-x-2 text-xs font-semibold text-slate-500">
          <Link
            href="/tasks"
            className="flex items-center space-x-1 transition-colors hover:text-indigo-600"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Tasks</span>
          </Link>
          <ChevronRight className="w-3 h-3 text-slate-300" />
          <span className="truncate font-bold text-slate-800">{task.taskCode}</span>
        </div>

        {/* Quick Status Selector */}
        <div className="flex flex-wrap items-center gap-2">
          {canEditTask && (
            <button
              type="button"
              onClick={() => setIsEditOpen(true)}
              className="inline-flex flex-1 items-center justify-center space-x-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 sm:flex-none sm:py-1.5"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
          )}
          {currentUser?.role === "admin" && (
            <button
              type="button"
              onClick={() => {
                setDeleteError(null);
                setDeleteOpen(true);
              }}
              className="inline-flex flex-1 items-center justify-center space-x-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 sm:flex-none sm:py-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          )}
          <span className="hidden text-xs font-medium text-slate-400 sm:inline">
            Status:
          </span>
          <select
            value={task.status}
            onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
            aria-label="Task status"
            className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-base font-semibold text-slate-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 sm:flex-none sm:py-1.5 sm:text-xs"
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

        {/* Attached reference screenshot */}
        {task.image && (
          <div className="mt-5 border-t border-slate-100 pt-5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <ImageIcon className="h-3.5 w-3.5" />
                <span>Reference Screenshot</span>
              </span>
              <button
                type="button"
                onClick={() => setImagePreviewOpen(true)}
                className="inline-flex items-center gap-1 rounded-lg border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-600 transition-colors hover:bg-indigo-100"
              >
                <span>View full size</span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => setImagePreviewOpen(true)}
              aria-label="Open full resolution task screenshot"
              className="group relative block w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-slate-100"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={task.image}
                alt={`${task.taskCode} reference screenshot`}
                className="max-h-72 w-full object-cover transition-transform duration-200 group-hover:scale-[1.01]"
              />
              <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-lg bg-slate-900/70 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
                <ImageIcon className="h-3 w-3" />
                <span>Click to enlarge</span>
              </span>
            </button>
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

      {isEditOpen && canEditTask && (
        <TaskEditModal
          task={task}
          onClose={() => setIsEditOpen(false)}
          onSaved={handleSessionUpdated}
        />
      )}

      {task.image && (
        <ImageLightbox
          src={imagePreviewOpen ? task.image : null}
          alt={`${task.taskCode} · ${task.title}`}
          onClose={() => setImagePreviewOpen(false)}
        />
      )}

      <ConfirmDialog
        isOpen={deleteOpen}
        title="Delete task?"
        message={
          <>
            <strong>
              {task.taskCode} · {task.title}
            </strong>{" "}
            will be permanently deleted. Logged work sessions will no longer be
            reachable from this task.
          </>
        }
        confirmLabel="Delete Task"
        loading={deleteLoading}
        error={deleteError}
        onCancel={() => {
          if (!deleteLoading) {
            setDeleteOpen(false);
            setDeleteError(null);
          }
        }}
        onConfirm={handleDeleteTask}
      />
    </div>
  );
}
