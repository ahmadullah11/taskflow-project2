"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthContext";
import { UserDoc, UserRole } from "@/lib/types";
import { getInitials, formatDateFull } from "@/lib/date-utils";
import UserFormModal from "@/components/UserFormModal";
import ConfirmDialog from "@/components/ConfirmDialog";
import {
  UserPlus,
  Pencil,
  Trash2,
  ShieldCheck,
  Mail,
  Briefcase,
  Users,
  ShieldAlert,
  UserCog,
  Search,
  Calendar,
  SearchX,
} from "lucide-react";

export default function UsersPage() {
  const {
    user: currentUser,
    loading: authLoading,
    refreshAuth,
  } = useAuth();
  const isAdmin = currentUser?.role === "admin";

  const [users, setUsers] = useState<UserDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserDoc | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserDoc | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all");

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error("Failed to load team members:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      // Fetching on mount/login is the intended use of this effect.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchUsers();
    }
  }, [fetchUsers, isAdmin]);

  const openAdd = () => {
    setEditingUser(null);
    setFormOpen(true);
  };

  const openEdit = (member: UserDoc) => {
    setEditingUser(member);
    setFormOpen(true);
  };

  const handleSaved = async () => {
    await fetchUsers();
    await refreshAuth();
  };

  const handleDelete = async () => {
    if (!deletingUser?._id) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/users/${deletingUser._id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete team member");
      }
      setDeletingUser(null);
      await fetchUsers();
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete team member"
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return users.filter((member) => {
      const matchesRole = roleFilter === "all" || member.role === roleFilter;
      const matchesQuery =
        !query ||
        member.name.toLowerCase().includes(query) ||
        member.email.toLowerCase().includes(query);
      return matchesRole && matchesQuery;
    });
  }, [users, searchQuery, roleFilter]);

  const roleBadge = (role: UserRole) => {
    const styles: Record<UserRole, string> = {
      admin: "bg-indigo-50 text-indigo-700 border-indigo-200",
      manager: "bg-violet-50 text-violet-700 border-violet-200",
      member: "bg-slate-100 text-slate-700 border-slate-200",
    };
    return (
      <span
        className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${styles[role]}`}
      >
        {role === "admin" && <ShieldCheck className="w-3 h-3" />}
        <span>{role}</span>
      </span>
    );
  };

  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-3xl mx-auto py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">
          Admin access required
        </h2>
        <p className="text-sm text-slate-500 mb-6">
          Only administrators can manage team members.
        </p>
        <Link
          href="/tasks"
          className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-xs shadow-md shadow-indigo-200 hover:bg-indigo-700 transition-colors"
        >
          <span>Back to Tasks</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Team Members
            </h1>
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              <span>Admin Only</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Add teammates, update their roles and details, reset passwords, or
            remove accounts.
          </p>
        </div>

        <button
          onClick={openAdd}
          className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 hover:shadow-lg transition-all active:scale-95"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Team Member</span>
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Members", value: users.length, icon: Users },
          {
            label: "Admins",
            value: users.filter((u) => u.role === "admin").length,
            icon: ShieldCheck,
          },
          {
            label: "Managers",
            value: users.filter((u) => u.role === "manager").length,
            icon: UserCog,
          },
          {
            label: "Members",
            value: users.filter((u) => u.role === "member").length,
            icon: Briefcase,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs"
          >
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">
                {stat.label}
              </span>
              <stat.icon className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-black text-slate-900">
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Search and Role Filter Bar */}
      {!loading && users.length > 0 && (
        <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search members by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 placeholder:text-slate-400"
              />
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 whitespace-nowrap">
                Showing {filteredUsers.length} of {users.length}
              </span>
            </div>
          </div>

          {/* Role Filter Tabs */}
          <div className="flex items-center space-x-1 pt-2 border-t border-slate-100 overflow-x-auto">
            {(
              [
                { key: "all", label: "All Roles" },
                { key: "admin", label: "Admins" },
                { key: "manager", label: "Managers" },
                { key: "member", label: "Members" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setRoleFilter(tab.key)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap ${
                  roleFilter === tab.key
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Member List */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500 font-medium">
            Loading team members...
          </p>
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xs">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-900 mb-1">
            No team members yet
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Add your first teammate to get started.
          </p>
          <button
            onClick={openAdd}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-sm transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Team Member</span>
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80">
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                    Member
                  </th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                    Email
                  </th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                    Role
                  </th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                    Joined Date
                  </th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-right whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-16 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-500 flex items-center justify-center mx-auto mb-3">
                        <SearchX className="w-6 h-6" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 mb-1">
                        No members found
                      </h3>
                      <p className="text-xs text-slate-500 mb-4">
                        Try adjusting your search or role filter.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery("");
                          setRoleFilter("all");
                        }}
                        className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors"
                      >
                        <span>Clear Filters</span>
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((member) => {
                    const memberId = member._id?.toString();
                    const isSelf = memberId === currentUser?.id;
                    return (
                      <tr
                        key={memberId || member.email}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 transition-colors"
                      >
                        {/* Member */}
                        <td className="px-4 py-3.5 align-middle">
                          <div className="flex items-center space-x-2.5 min-w-[200px]">
                            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 font-bold text-[11px] flex items-center justify-center border border-indigo-200 flex-shrink-0">
                              {getInitials(member.name)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center">
                                <p className="text-sm font-bold text-slate-900 leading-tight truncate">
                                  {member.name}
                                </p>
                                {isSelf && (
                                  <span className="ml-2 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md uppercase whitespace-nowrap">
                                    You
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 capitalize truncate">
                                {member.title || member.role}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="px-4 py-3.5 align-middle">
                          <span className="inline-flex items-center space-x-1.5 text-xs text-slate-600 font-medium max-w-[220px] min-w-0">
                            <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span className="truncate" title={member.email}>
                              {member.email}
                            </span>
                          </span>
                        </td>

                        {/* Role */}
                        <td className="px-4 py-3.5 align-middle">
                          {roleBadge(member.role)}
                        </td>

                        {/* Joined Date */}
                        <td className="px-4 py-3.5 align-middle">
                          <span className="inline-flex items-center space-x-1.5 text-xs text-slate-600 font-medium whitespace-nowrap">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span>
                              {member.createdAt
                                ? formatDateFull(member.createdAt)
                                : "—"}
                            </span>
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5 align-middle">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              type="button"
                              title="Edit member"
                              aria-label={`Edit ${member.name}`}
                              onClick={() => openEdit(member)}
                              className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              title={
                                isSelf
                                  ? "You cannot delete your own account"
                                  : "Delete member"
                              }
                              aria-label={`Delete ${member.name}`}
                              onClick={() => {
                                setDeleteError(null);
                                setDeletingUser(member);
                              }}
                              disabled={isSelf}
                              className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-slate-400 disabled:hover:bg-transparent"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {formOpen && (
        <UserFormModal
          user={editingUser}
          onClose={() => setFormOpen(false)}
          onSaved={handleSaved}
        />
      )}

      <ConfirmDialog
        isOpen={Boolean(deletingUser)}
        title="Delete team member?"
        message={
          <>
            <strong>{deletingUser?.name}</strong> ({deletingUser?.email}) will be
            permanently removed. Any tasks assigned to them will become
            unassigned. Their past work logs are kept for the timesheet.
          </>
        }
        confirmLabel="Delete Member"
        loading={deleteLoading}
        error={deleteError}
        onCancel={() => {
          if (!deleteLoading) {
            setDeletingUser(null);
            setDeleteError(null);
          }
        }}
        onConfirm={handleDelete}
      />
    </div>
  );
}
