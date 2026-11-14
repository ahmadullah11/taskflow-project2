"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthContext";
import { TaskDoc, TaskStatus, UserDoc } from "@/lib/types";
import { formatDurationSeconds, getInitials } from "@/lib/date-utils";
import CreateTaskModal from "@/components/CreateTaskModal";
import TaskEditModal from "@/components/TaskEditModal";
import ConfirmDialog from "@/components/ConfirmDialog";
import ImageLightbox from "@/components/ImageLightbox";
import {
  Plus,
  Search,
  Clock,
  CheckCircle2,
  Layers,
  ArrowRight,
  UserCheck,
  CheckSquare,
  ShieldCheck,
  Pencil,
  Trash2,
  Image as ImageIcon,
} from "lucide-react";

export default function TasksPage() {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";

  const [tasks, setTasks] = useState<TaskDoc[]>([]);
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskDoc | null>(null);
  const [deletingTask, setDeletingTask] = useState<TaskDoc | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{
    src: string;
    alt: string;
  } | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Load team users for Admin assignee filter
  useEffect(() => {
    if (isAdmin) {
      fetch("/api/users")
        .then((res) => res.json())
        .then((data) => setUsers(data.users || []))
        .catch(console.error);
    }
  }, [isAdmin]);

  const fetchTasks = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (priorityFilter !== "all") params.set("priority", priorityFilter);
      if (searchQuery) params.set("search", searchQuery);

      // Only admins can filter by assignee. The API also scopes non-admin
      // requests to the signed-in user's own tasks.
      if (isAdmin && assigneeFilter !== "all") {
        params.set("assigneeId", assigneeFilter);
      }

      const res = await fetch(`/api/tasks?${params.toString()}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch (err) {
      console.error("Error fetching tasks:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, searchQuery, assigneeFilter, isAdmin]);

  useEffect(() => {
    // Fetching tasks for the active filters is the intended use of this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTasks();
  }, [fetchTasks]);

  const handleDeleteTask = async () => {
    if (!deletingTask) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const res = await fetch(
        `/api/tasks/${deletingTask._id || deletingTask.taskCode}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete task");
      }
      setDeletingTask(null);
      await fetchTasks();
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete task"
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  // Summary Metrics
  const totalTasks = tasks.length;
  const inProgressCount = tasks.filter((t) => t.status === "In Progress").length;
  const completedCount = tasks.filter((t) => t.status === "Completed").length;
  const totalTrackedSeconds = tasks.reduce(
    (acc, t) => acc + (t.totalDurationSeconds || 0),
    0
  );

  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case "In Progress":
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span>In Progress</span>
          </span>
        );
      case "Completed":
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Completed</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <span>Todo</span>
          </span>
        );
    }
  };

  const canEditTask = (task: TaskDoc) =>
    isAdmin ||
    task.assigneeId === currentUser?.id ||
    task.assignee?._id === currentUser?.id ||
    task.createdById === currentUser?.id;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {isAdmin ? "Task Management & Overview" : "My Assigned Tasks"}
            </h1>
            {isAdmin ? (
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                <span>Admin View · All User Tasks</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs">
                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Showing {currentUser?.name || "Your"}&apos;s Tasks</span>
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {isAdmin
              ? "Oversee all team tasks, monitor working sessions, and assign tasks to any team member."
              : "Showing only tasks assigned to you."}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex w-full items-center justify-center space-x-2 rounded-2xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-200 transition-all hover:bg-indigo-700 hover:shadow-lg active:scale-95 sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs min-w-0">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider">Total Tasks</span>
            <CheckSquare className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">{totalTasks}</div>
          <span className="text-[11px] text-slate-400">
            {isAdmin ? "All registered tasks" : "Your assigned tasks"}
          </span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs min-w-0">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider">In Progress</span>
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-600">{inProgressCount}</div>
          <span className="text-[11px] text-slate-400">
            {isAdmin ? "Currently active across team" : "Your active tasks"}
          </span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs min-w-0">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600">{completedCount}</div>
          <span className="text-[11px] text-slate-400">
            {isAdmin ? "Finished team deliverables" : "Your finished deliverables"}
          </span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs min-w-0">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider">Total Logged Time</span>
            <Clock className="w-4 h-4 text-violet-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
            {formatDurationSeconds(totalTrackedSeconds)}
          </div>
          <span className="text-[11px] text-slate-400">
            {isAdmin ? "Sum of all team work" : "Your logged work hours"}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:flex lg:items-center lg:gap-3">
          {/* Search */}
          <div className="relative w-full min-w-0 sm:col-span-2 lg:min-w-[220px] lg:flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={
                isAdmin
                  ? "Search by title, code (TASK-1024), assignee or category..."
                  : "Search your tasks by title, code or category..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-base font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 placeholder:text-slate-400 sm:py-2 sm:text-sm"
            />
          </div>

          {/* Quick Filters */}
          {isAdmin && (
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              aria-label="Filter by team member"
              className="w-full rounded-xl border border-indigo-200 bg-indigo-50/50 px-3 py-2.5 text-base font-semibold text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 sm:py-2 sm:text-sm lg:w-auto"
            >
              <option value="all">👥 All Team Members</option>
              <option value="unassigned">⏳ Unassigned Tasks</option>
              {users.map((u) => (
                <option key={u._id?.toString()} value={u._id?.toString()}>
                  {u.name} ({u.title || u.role})
                </option>
              ))}
            </select>
          )}

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            aria-label="Filter by priority"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 sm:py-2 sm:text-sm lg:w-auto"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {isAdmin ? (
            currentUser && (
              <button
                onClick={() =>
                  setAssigneeFilter(assigneeFilter === currentUser.id ? "all" : currentUser.id)
                }
                className={`flex w-full items-center justify-center space-x-1.5 rounded-xl border px-3 py-2.5 text-base font-semibold transition-colors sm:py-2 sm:text-sm lg:w-auto ${
                  assigneeFilter === currentUser.id
                    ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Assigned to Me</span>
              </button>
            )
          ) : (
            // Regular users are always scoped to their own tasks, so this
            // control is intentionally disabled (no way to view others' tasks).
            <button
              type="button"
              disabled
              title="You can only view tasks assigned to your account."
              className="flex w-full cursor-not-allowed items-center justify-center space-x-1.5 rounded-xl border border-indigo-600 bg-indigo-600 px-3 py-2.5 text-base font-semibold text-white shadow-xs sm:py-2 sm:text-sm lg:w-auto"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Assigned to Me</span>
            </button>
          )}
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap border-t border-slate-100 pt-2">
          {["all", "Todo", "In Progress", "Completed"].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`shrink-0 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                statusFilter === tab
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {tab === "all" ? "All Tasks" : tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tasks Table */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500 font-medium">Loading tasks...</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-500 flex items-center justify-center mx-auto mb-3">
            <CheckSquare className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 mb-1">No tasks found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
            Try adjusting your search criteria or create a new task to assign to a team member.
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Task</span>
          </button>
        </div>
      ) : (
        <>
        <div className="hidden overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xs md:block">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50">
                  <th className="whitespace-nowrap px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Task Number
                  </th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Title
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Category / Project
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Assignee &amp; Role
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Status
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Time Logged
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr
                    key={task._id?.toString() || task.taskCode}
                    className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50/70"
                  >
                    {/* Task Number */}
                    <td className="px-4 py-3.5 align-middle">
                      <Link
                        href={`/tasks/${task._id || task.taskCode}`}
                        className="inline-flex whitespace-nowrap rounded-md border border-indigo-100 bg-indigo-50 px-2.5 py-1 font-mono text-[11px] font-bold text-indigo-600 transition-colors hover:bg-indigo-100"
                      >
                        {task.taskCode}
                      </Link>
                    </td>

                    {/* Title + attachment thumbnail */}
                    <td className="px-4 py-3.5 align-middle">
                      <div className="flex min-w-[180px] max-w-[340px] items-center gap-2.5">
                        {task.image && (
                          <button
                            type="button"
                            title="View attached screenshot"
                            aria-label={`View screenshot for ${task.taskCode}`}
                            onClick={() =>
                              setLightboxImage({
                                src: task.image!,
                                alt: `${task.taskCode} · ${task.title}`,
                              })
                            }
                            className="group relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={task.image}
                              alt={`${task.taskCode} attachment`}
                              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-110"
                            />
                            <span className="absolute bottom-0.5 right-0.5 rounded bg-slate-900/70 p-0.5 text-white">
                              <ImageIcon className="h-2.5 w-2.5" />
                            </span>
                          </button>
                        )}
                        <Link
                          href={`/tasks/${task._id || task.taskCode}`}
                          className="line-clamp-2 text-sm font-bold text-slate-900 transition-colors hover:text-indigo-600"
                        >
                          {task.title}
                        </Link>
                      </div>
                    </td>

                    {/* Category / Project */}
                    <td className="px-4 py-3.5 align-middle">
                      <span className="inline-flex items-center space-x-1.5 whitespace-nowrap text-xs font-medium text-slate-500">
                        <Layers className="w-3.5 h-3.5 text-slate-300" />
                        <span>{task.category || "General"}</span>
                      </span>
                    </td>

                    {/* Assignee & Role */}
                    <td className="px-4 py-3.5 align-middle">
                      {task.assignee ? (
                        <div className="flex items-center space-x-2.5">
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-100 text-[10px] font-bold text-indigo-700">
                            {getInitials(task.assignee.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold leading-tight text-slate-800">
                              {task.assignee.name}
                            </p>
                            <p className="truncate text-[10px] capitalize text-slate-400">
                              {task.assignee.title || task.assignee.role}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs italic text-slate-400">Unassigned</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5 align-middle">{getStatusBadge(task.status)}</td>

                    {/* Time Logged */}
                    <td className="px-4 py-3.5 align-middle">
                      <div className="flex items-center space-x-2">
                        <span className="inline-flex items-center space-x-1 whitespace-nowrap font-mono text-xs font-bold text-slate-700">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatDurationSeconds(task.totalDurationSeconds || 0)}</span>
                        </span>
                        {task.activeSession && (
                          <span
                            title={`Active session by ${task.activeSession.userName || "a team member"}`}
                            className="inline-flex items-center space-x-1 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700"
                          >
                            <span className="w-1.5 h-1.5 animate-pulse rounded-full bg-amber-500" />
                            <span>Live</span>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 align-middle">
                      <div className="flex items-center justify-end space-x-1.5">
                        {canEditTask(task) && (
                          <button
                            type="button"
                            title="Edit task"
                            aria-label={`Edit ${task.taskCode}`}
                            onClick={() => setEditingTask(task)}
                            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            type="button"
                            title="Delete task"
                            aria-label={`Delete ${task.taskCode}`}
                            onClick={() => {
                              setDeleteError(null);
                              setDeletingTask(task);
                            }}
                            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        <Link
                          href={`/tasks/${task._id || task.taskCode}`}
                          title="View task"
                          aria-label={`View ${task.taskCode}`}
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile / tablet-portrait task cards */}
        <div className="space-y-3 md:hidden">
          {tasks.map((task) => (
            <article
              key={task._id?.toString() || task.taskCode}
              className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-xs"
            >
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/tasks/${task._id || task.taskCode}`}
                  className="inline-flex whitespace-nowrap rounded-md border border-indigo-100 bg-indigo-50 px-2.5 py-1 font-mono text-[11px] font-bold text-indigo-600"
                >
                  {task.taskCode}
                </Link>
                <div className="flex shrink-0 items-center gap-1.5">
                  {getStatusBadge(task.status)}
                </div>
              </div>

              <div className="mt-3 flex items-start gap-3">
                {task.image && (
                  <button
                    type="button"
                    title="View attached screenshot"
                    aria-label={`View screenshot for ${task.taskCode}`}
                    onClick={() =>
                      setLightboxImage({
                        src: task.image!,
                        alt: `${task.taskCode} · ${task.title}`,
                      })
                    }
                    className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={task.image}
                      alt={`${task.taskCode} attachment`}
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute bottom-1 right-1 rounded bg-slate-900/70 p-0.5 text-white">
                      <ImageIcon className="h-3 w-3" />
                    </span>
                  </button>
                )}

                <div className="min-w-0 flex-1">
                  <Link
                    href={`/tasks/${task._id || task.taskCode}`}
                    className="line-clamp-2 text-sm font-bold text-slate-900 transition-colors hover:text-indigo-600"
                  >
                    {task.title}
                  </Link>

                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium text-slate-500">
                    <span className="inline-flex min-w-0 items-center gap-1">
                      <Layers className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                      <span className="truncate">{task.category || "General"}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 font-mono font-bold text-slate-700">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      <span>{formatDurationSeconds(task.totalDurationSeconds || 0)}</span>
                    </span>
                    {task.activeSession && (
                      <span
                        title={`Active session by ${task.activeSession.userName || "a team member"}`}
                        className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700"
                      >
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                        <span>Live</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                <div className="flex min-w-0 items-center gap-2">
                  {task.assignee ? (
                    <>
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-100 text-[10px] font-bold text-indigo-700">
                        {getInitials(task.assignee.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold leading-tight text-slate-800">
                          {task.assignee.name}
                        </p>
                        <p className="truncate text-[10px] capitalize text-slate-400">
                          {task.assignee.title || task.assignee.role}
                        </p>
                      </div>
                    </>
                  ) : (
                    <span className="text-xs italic text-slate-400">Unassigned</span>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  {canEditTask(task) && (
                    <button
                      type="button"
                      title="Edit task"
                      aria-label={`Edit ${task.taskCode}`}
                      onClick={() => setEditingTask(task)}
                      className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      type="button"
                      title="Delete task"
                      aria-label={`Delete ${task.taskCode}`}
                      onClick={() => {
                        setDeleteError(null);
                        setDeletingTask(task);
                      }}
                      className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <Link
                    href={`/tasks/${task._id || task.taskCode}`}
                    title="View task"
                    aria-label={`View ${task.taskCode}`}
                    className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
        </>
      )}

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onTaskCreated={fetchTasks}
      />

      {editingTask && (
        <TaskEditModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSaved={fetchTasks}
        />
      )}

      <ImageLightbox
        src={lightboxImage?.src}
        alt={lightboxImage?.alt}
        onClose={() => setLightboxImage(null)}
      />

      <ConfirmDialog
        isOpen={Boolean(deletingTask)}
        title="Delete task?"
        message={
          <>
            <strong>
              {deletingTask?.taskCode} · {deletingTask?.title}
            </strong>{" "}
            will be permanently deleted, along with its work history on this
            page.
          </>
        }
        confirmLabel="Delete Task"
        loading={deleteLoading}
        error={deleteError}
        onCancel={() => {
          if (!deleteLoading) {
            setDeletingTask(null);
            setDeleteError(null);
          }
        }}
        onConfirm={handleDeleteTask}
      />
    </div>
  );
}
