"use client";

import React, { useState, useEffect } from "react";
import { UserDoc, TaskDoc, AuthUser } from "@/lib/types";
import { getInitials } from "@/lib/date-utils";
import { UserCheck, ChevronDown, Check, UserPlus } from "lucide-react";

interface TaskAssigneeCardProps {
  task: TaskDoc;
  currentUser: AuthUser | null;
  onAssigneeUpdated: () => Promise<void>;
}

export default function TaskAssigneeCard({
  task,
  currentUser,
  onAssigneeUpdated,
}: TaskAssigneeCardProps) {
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const canReassign = currentUser?.role === "admin";

  useEffect(() => {
    // Only admins can reassign, and /api/users requires authentication.
    if (!canReassign) return;

    async function fetchUsers() {
      try {
        const res = await fetch("/api/users");
        if (res.ok) {
          const data = await res.json();
          setUsers(data.users || []);
        }
      } catch (err) {
        console.error("Failed to load users for assignment:", err);
      }
    }
    fetchUsers();
  }, [canReassign]);

  const handleSelectAssignee = async (userId: string | null) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/${task._id || task.taskCode}/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigneeId: userId }),
      });
      if (res.ok) {
        await onAssigneeUpdated();
      }
    } catch (err) {
      console.error("Failed to reassign task:", err);
    } finally {
      setLoading(false);
      setIsDropdownOpen(false);
    }
  };

  const assignee = task.assignee;

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Assignee
        </h3>
        {canReassign && (
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              disabled={loading}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center space-x-1 hover:underline disabled:opacity-50"
            >
              <span>{assignee ? "Reassign" : "Assign Member"}</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {isDropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-40 animate-in fade-in zoom-in-95"
                onMouseLeave={() => setIsDropdownOpen(false)}
              >
                <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Select Team Member
                </div>
                <div className="max-h-60 overflow-y-auto p-1 space-y-0.5">
                  <button
                    onClick={() => handleSelectAssignee(null)}
                    className={`w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                      !task.assigneeId
                        ? "bg-slate-100 text-slate-900 font-semibold"
                        : "hover:bg-slate-50 text-slate-600"
                    }`}
                  >
                    <span className="italic text-slate-500">-- Unassigned --</span>
                    {!task.assigneeId && <Check className="w-3.5 h-3.5 text-slate-600" />}
                  </button>
                  {users.map((u) => {
                    const isSelected = task.assigneeId === u._id?.toString();
                    return (
                      <button
                        key={u._id?.toString()}
                        onClick={() => handleSelectAssignee(u._id!.toString())}
                        className={`w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                          isSelected
                            ? "bg-indigo-50 text-indigo-900 font-semibold"
                            : "hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center space-x-2.5">
                          <div className="w-6 h-6 rounded-md bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center">
                            {getInitials(u.name)}
                          </div>
                          <div>
                            <p className="font-medium text-xs leading-tight">{u.name}</p>
                            <p className="text-[10px] text-slate-400">{u.title || u.role}</p>
                          </div>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {assignee ? (
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 font-bold text-sm flex items-center justify-center border border-indigo-200/80 shadow-xs">
            {getInitials(assignee.name)}
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 leading-tight">
              {assignee.name}
            </h4>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {assignee.title || "Software Engineer"}
            </p>
            <span className="inline-flex items-center space-x-1 text-[11px] text-slate-400 mt-0.5">
              <UserCheck className="w-3 h-3 text-indigo-500" />
              <span>Assigned Member</span>
            </span>
          </div>
        </div>
      ) : (
        <div className="flex items-center space-x-3 p-3 rounded-2xl bg-slate-50 border border-dashed border-slate-200">
          <div className="w-10 h-10 rounded-xl bg-slate-200/70 text-slate-500 flex items-center justify-center">
            <UserPlus className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-700">Unassigned</p>
            <p className="text-[11px] text-slate-400">
              No team member assigned yet.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
