"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthContext";
import { TaskDoc, TaskStatus } from "@/lib/types";
import { formatDurationSeconds, getInitials } from "@/lib/date-utils";
import CreateTaskModal from "@/components/CreateTaskModal";
import {
  Plus,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  AlertCircle,
  Layers,
  ArrowRight,
  TrendingUp,
  UserCheck,
  CheckSquare,
  Sparkles,
} from "lucide-react";

export default function TasksPage() {
  const { user: currentUser } = useAuth();
  const [tasks, setTasks] = useState<TaskDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [assignedToMeOnly, setAssignedToMeOnly] = useState(false);

  const fetchTasks = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (priorityFilter !== "all") params.set("priority", priorityFilter);
      if (searchQuery) params.set("search", searchQuery);
      if (assignedToMeOnly && currentUser) params.set("assigneeId", currentUser.id);

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
  }, [statusFilter, priorityFilter, searchQuery, assignedToMeOnly, currentUser]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

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
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span>In Progress</span>
          </span>
        );
      case "Completed":
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Completed</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Task Tracking & Time Logging
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Assign tasks, log working hours, and review progress reports in real-time.
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
          <span className="text-[11px] text-slate-400">All registered tasks</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">In Progress</span>
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
          </div>
          <div className="text-2xl font-black text-amber-600">{inProgressCount}</div>
          <span className="text-[11px] text-slate-400">Currently active</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600">{completedCount}</div>
          <span className="text-[11px] text-slate-400">Finished deliverables</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Logged Time</span>
            <Clock className="w-4 h-4 text-violet-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {formatDurationSeconds(totalTrackedSeconds)}
          </div>
          <span className="text-[11px] text-slate-400">Sum of work sessions</span>
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
              placeholder="Search by title, code (TASK-1024), assignee or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 placeholder:text-slate-400"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex items-center space-x-2">
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

            {currentUser && (
              <button
                onClick={() => setAssignedToMeOnly(!assignedToMeOnly)}
                className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-colors flex items-center space-x-1.5 ${
                  assignedToMeOnly
                    ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
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

      {/* Tasks List Grid */}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {tasks.map((task) => {
            const hasActiveSession = Boolean(task.activeSession);

            return (
              <Link
                key={task._id?.toString() || task.taskCode}
                href={`/tasks/${task._id || task.taskCode}`}
                className="group bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md hover:border-indigo-200 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar: Code, Status, Priority */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                      {task.taskCode}
                    </span>
                    <div className="flex items-center space-x-1.5">
                      {getStatusBadge(task.status)}
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 mb-1.5">
                    {task.title}
                  </h3>

                  {/* Category */}
                  <div className="flex items-center space-x-1 text-[11px] text-slate-400 font-medium mb-4">
                    <Layers className="w-3 h-3" />
                    <span>{task.category || "General"}</span>
                  </div>

                  {/* Active Timer Pill if running right now */}
                  {hasActiveSession && (
                    <div className="mb-4 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold flex items-center justify-between">
                      <span className="flex items-center space-x-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                        <span>Active Session</span>
                      </span>
                      <span className="text-[11px] text-amber-700 font-normal">
                        by {task.activeSession?.userName}
                      </span>
                    </div>
                  )}
                </div>

                {/* Footer: Assignee & Logged Time */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  {/* Assignee */}
                  {task.assignee ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center border border-indigo-200">
                        {getInitials(task.assignee.name)}
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-semibold text-slate-800 leading-tight">
                          {task.assignee.name}
                        </p>
                        <p className="text-[10px] text-slate-400 capitalize">
                          {task.assignee.title || task.assignee.role}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Unassigned</span>
                  )}

                  {/* Total Logged Hours */}
                  <div className="text-right">
                    <div className="inline-flex items-center space-x-1 text-xs font-mono font-bold text-slate-700 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200/60">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{formatDurationSeconds(task.totalDurationSeconds || 0)}</span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onTaskCreated={fetchTasks}
      />
    </div>
  );
}
