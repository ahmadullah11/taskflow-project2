"use client";

import React, { useState, useEffect } from "react";
import { UserDoc, TaskPriority } from "@/lib/types";
import { getInitials } from "@/lib/date-utils";
import { X, Plus, AlertCircle, CheckCircle2 } from "lucide-react";

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
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Backend Development");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [assigneeId, setAssigneeId] = useState("");
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetch("/api/users")
        .then((res) => res.json())
        .then((data) => setUsers(data.users || []))
        .catch(console.error);
    }
  }, [isOpen]);

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
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category: category.trim(),
          priority,
          assigneeId: assigneeId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create task");
      }

      await onTaskCreated();
      setTitle("");
      setDescription("");
      setAssigneeId("");
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create task.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
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
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900"
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
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 bg-white"
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
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 bg-white"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Assignee Selection */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">
              Assignee (Team Member)
            </label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 bg-white"
            >
              <option value="">-- Unassigned (Anyone can start) --</option>
              {users.map((u) => (
                <option key={u._id?.toString()} value={u._id?.toString()}>
                  {u.name} ({u.title || u.role})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400">
              Only the assigned member will be able to start and stop work sessions on this task.
            </p>
          </div>

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
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 resize-none"
            />
          </div>

          {/* Action Buttons */}
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
              disabled={loading || !title.trim()}
              className="px-5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md shadow-indigo-200 disabled:opacity-50 flex items-center space-x-1.5 transition-all"
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
