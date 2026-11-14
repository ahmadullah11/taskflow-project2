"use client";

import React, { useState, useEffect } from "react";
import { UserDoc, TaskPriority } from "@/lib/types";
import { getInitials } from "@/lib/date-utils";
import { useAuth } from "@/components/AuthContext";
import TaskImageUpload from "@/components/TaskImageUpload";
import { X, Plus, AlertCircle, CheckCircle2, ShieldCheck, UserCheck } from "lucide-react";

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: () => Promise<void>;
}

export default function CreateTaskModal({
  isOpen,
  onClose,
  onTaskCreated,
}: CreateTaskModalProps) {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [category, setCategory] = useState("Backend Development");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [assigneeId, setAssigneeId] = useState("");
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (isAdmin) {
        fetch("/api/users")
          .then((res) => res.json())
          .then((data) => setUsers(data.users || []))
          .catch(console.error);
      } else if (currentUser) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setAssigneeId(currentUser.id);
      }
    }
  }, [isOpen, isAdmin, currentUser]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please provide a task title.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const targetAssigneeId = isAdmin ? (assigneeId || null) : (currentUser?.id || null);

      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          image,
          category: category.trim(),
          priority,
          assigneeId: targetAssigneeId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create task");
      }

      await onTaskCreated();
      setTitle("");
      setDescription("");
      setImage(null);
      setAssigneeId("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 p-3 backdrop-blur-sm sm:p-4">
      <div className="relative max-h-[90vh] w-[94vw] max-w-lg overflow-y-auto rounded-3xl border border-slate-100 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur-sm sm:px-6 sm:py-5">
          <div className="flex min-w-0 items-center space-x-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 font-bold text-indigo-600">
              <Plus className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold leading-tight text-slate-900">
                Create New Task
              </h3>
              <p className="text-xs text-slate-500">
                Assign to a team member and track working hours
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            aria-label="Close create task modal"
            className="shrink-0 rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4 p-5 sm:p-6">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">
              Task Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Implement User Authentication"
              className="w-full text-base px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900"
            />
          </div>

          {/* Category & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Category / Project
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-base px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 bg-white"
              >
                <option value="Backend Development">Backend Development</option>
                <option value="Frontend Development">Frontend Development</option>
                <option value="Design System">Design System</option>
                <option value="DevOps">DevOps</option>
                <option value="Quality Assurance">Quality Assurance</option>
                <option value="Product Discovery">Product Discovery</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full text-base px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 bg-white"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Assignee Selection */}
          {isAdmin ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">
                  Assignee (Team Member)
                </label>
                <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-md">
                  <ShieldCheck className="w-3 h-3 text-indigo-600" />
                  <span>Admin Privilege: Assign to Anyone</span>
                </span>
              </div>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full text-base px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 bg-white"
              >
                <option value="">-- Unassigned (Anyone can start) --</option>
                {users.map((u) => (
                  <option key={u._id?.toString()} value={u._id?.toString()}>
                    {u.name} ({u.title || u.role})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400">
                As an Admin, you have full control to assign this task to any team member or leave it open.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Assignee
              </label>
              <div className="w-full text-base px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-md bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center">
                    {currentUser ? getInitials(currentUser.name) : "ME"}
                  </div>
                  <div>
                    <p className="font-semibold text-xs leading-tight">
                      {currentUser?.name || "Ahmad Ullah"}
                    </p>
                    <p className="text-[10px] text-slate-400 capitalize">
                      {currentUser?.title || "Software Engineer"}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                  <UserCheck className="w-3 h-3 text-indigo-500" />
                  <span>Self Assigned</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Tasks created by team members are assigned to you. Only Admins can assign tasks to other colleagues.
              </p>
            </div>
          )}

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">
              Description / Requirements
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Outline task objectives, acceptance criteria, or technical details..."
              className="w-full text-base px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 resize-none"
            />
          </div>

          {/* Reference screenshot (Admin & self-assigned users) */}
          <TaskImageUpload
            value={image}
            onChange={setImage}
            disabled={loading}
          />

          {/* Action Buttons */}
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="w-full rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-800 sm:w-auto sm:py-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="flex w-full items-center justify-center space-x-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-200 transition-all hover:bg-indigo-700 disabled:opacity-50 sm:w-auto sm:py-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? "Creating..." : "Create Task"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
