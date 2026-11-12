"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthContext";
import { TaskDoc, TaskStatus, UserDoc } from "@/lib/types";
import { formatDurationSeconds, getInitials } from "@/lib/date-utils";
import CreateTaskModal from "@/components/CreateTaskModal";
import TaskEditModal from "@/components/TaskEditModal";
import ConfirmDialog from "@/components/ConfirmDialog";
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
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 hover:shadow-lg transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Tasks</span>
            <CheckSquare className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{totalTasks}</div>
          <span className="text-[11px] text-slate-400">
            {isAdmin ? "All registered tasks" : "Your assigned tasks"}
          </span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">In Progress</span>
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
          </div>
          <div className="text-2xl font-black text-amber-600">{inProgressCount}</div>
          <span className="text-[11px] text-slate-400">
            {isAdmin ? "Currently active across team" : "Your active tasks"}
          </span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600">{completedCount}</div>
          <span className="text-[11px] text-slate-400">
            {isAdmin ? "Finished team deliverables" : "Your finished deliverables"}
          </span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Logged Time</span>
            <Clock className="w-4 h-4 text-violet-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {formatDurationSeconds(totalTrackedSeconds)}
          </div>
          <span className="text-[11px] text-slate-400">
            {isAdmin ? "Sum of all team work" : "Your logged work hours"}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1">
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
              className="w-full pl-10 pr-4 py-2 text-xs font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 placeholder:text-slate-400"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Admin Assignee Filter */}
            {isAdmin && (
              <div className="flex items-center space-x-1.5">
                <select
                  value={assigneeFilter}
                  onChange={(e) => setAssigneeFilter(e.target.value)}
                  className="text-xs font-semibold rounded-xl border border-indigo-200 bg-indigo-50/50 text-indigo-900 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="all">👥 All Team Members</option>
                  <option value="unassigned">⏳ Unassigned Tasks</option>
                  {users.map((u) => (
                    <option key={u._id?.toString()} value={u._id?.toString()}>
                      {u.name} ({u.title || u.role})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="text-xs font-semibold rounded-xl border border-slate-200 px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
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
                  className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-colors flex items-center space-x-1.5 ${
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
                className="px-3 py-2 text-xs font-semibold rounded-xl border border-indigo-600 bg-indigo-600 text-white shadow-xs flex items-center space-x-1.5 cursor-not-allowed"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Assigned to Me</span>
              </button>
            )}
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center space-x-1 pt-2 border-t border-slate-100 overflow-x-auto">
          {["all", "Todo", "In Progress", "Completed"].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap ${
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
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80">
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                    Task Number
                  </th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Title
                  </th>
                  <th className="hidden md:table-cell px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                    Category / Project
                  </th>
                  <th className="hidden lg:table-cell px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                    Assignee &amp; Role
                  </th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                    Status
                  </th>
                  <th className="hidden sm:table-cell px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                    Time Logged
                  </th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-right whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr
                    key={task._id?.toString() || task.taskCode}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 transition-colors"
                  >
                    {/* Task Number */}
                    <td className="px-4 py-3.5 align-middle">
                      <Link
                        href={`/tasks/${task._id || task.taskCode}`}
                        className="inline-flex font-mono text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100 hover:bg-indigo-100 transition-colors whitespace-nowrap"
                      >
                        {task.taskCode}
                      </Link>
                    </td>

                    {/* Title */}
                    <td className="px-4 py-3.5 align-middle">
                      <div className="min-w-[180px] max-w-[340px]">
                        <Link
                          href={`/tasks/${task._id || task.taskCode}`}
                          className="text-sm font-bold text-slate-900 hover:text-indigo-600 transition-colors line-clamp-2"
                        >
                          {task.title}
                        </Link>
                      </div>
                    </td>

                    {/* Category / Project */}
                    <td className="hidden md:table-cell px-4 py-3.5 align-middle">
                      <span className="inline-flex items-center space-x-1.5 text-xs text-slate-500 font-medium whitespace-nowrap">
                        <Layers className="w-3.5 h-3.5 text-slate-300" />
                        <span>{task.category || "General"}</span>
                      </span>
                    </td>

                    {/* Assignee & Role */}
                    <td className="hidden lg:table-cell px-4 py-3.5 align-middle">
                      {task.assignee ? (
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center border border-indigo-200 flex-shrink-0">
                            {getInitials(task.assignee.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-800 leading-tight truncate">
                              {task.assignee.name}
                            </p>
                            <p className="text-[10px] text-slate-400 capitalize truncate">
                              {task.assignee.title || task.assignee.role}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Unassigned</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5 align-middle">{getStatusBadge(task.status)}</td>

                    {/* Time Logged */}
                    <td className="hidden sm:table-cell px-4 py-3.5 align-middle">
                      <div className="flex items-center space-x-2">
                        <span className="inline-flex items-center space-x-1 text-xs font-mono font-bold text-slate-700 whitespace-nowrap">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatDurationSeconds(task.totalDurationSeconds || 0)}</span>
                        </span>
                        {task.activeSession && (
                          <span
                            title={`Active session by ${task.activeSession.userName || "a team member"}`}
                            className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            <span>Live</span>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 align-middle">
                      <div className="flex items-center justify-end space-x-1.5">
                        {isAdmin ? (
                          <>
                            <button
                              type="button"
                              title="Edit task"
                              aria-label={`Edit ${task.taskCode}`}
                              onClick={() => setEditingTask(task)}
                              className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              title="Delete task"
                              aria-label={`Delete ${task.taskCode}`}
                              onClick={() => {
                                setDeleteError(null);
                                setDeletingTask(task);
                              }}
                              className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <Link
                            href={`/tasks/${task._id || task.taskCode}`}
                            title="View task"
                            aria-label={`View ${task.taskCode}`}
                            className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onTaskCreated={fetchTasks}
      />

      {isAdmin && editingTask && (
        <TaskEditModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSaved={fetchTasks}
        />
      )}

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
