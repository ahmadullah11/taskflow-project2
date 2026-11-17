"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { CategoryItem } from "@/lib/types";
import {
  Settings,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  AlertCircle,
  Loader2,
  FolderPlus,
} from "lucide-react";

interface CategorySelectWithManagerProps {
  value: string;
  onChange: (value: string) => void;
  isAdmin: boolean;
  disabled?: boolean;
  preserveUnknownValue?: boolean;
  onManagingChange?: (isManaging: boolean) => void;
}

export default function CategorySelectWithManager({
  value,
  onChange,
  isAdmin,
  disabled = false,
  preserveUnknownValue = false,
  onManagingChange,
}: CategorySelectWithManagerProps) {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isManaging, setIsManaging] = useState(false);

  // Add state
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Inline feedback
  const [error, setError] = useState<string | null>(null);

  const editInputRef = useRef<HTMLInputElement>(null);

  const toggleManaging = (nextState?: boolean) => {
    setIsManaging((prev) => {
      const next = typeof nextState === "boolean" ? nextState : !prev;
      onManagingChange?.(next);
      return next;
    });
    setError(null);
    setEditingId(null);
  };

  const reloadCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/categories", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const list: CategoryItem[] = data.categories || [];
        setCategories(list);
      }
    } catch (err) {
      console.error("Failed to reload categories:", err);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    fetch("/api/categories", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { categories: [] }))
      .then((data) => {
        if (ignore) return;
        const list: CategoryItem[] = data.categories || [];
        setCategories(list);
        setLoading(false);

        if (list.length > 0) {
          if (!value) {
            const preferred =
              list.find((c) => c.name === "Backend Development")?.name ||
              list[0].name;
            onChange(preferred);
          } else if (!preserveUnknownValue && !list.some((c) => c.name === value)) {
            const preferred =
              list.find((c) => c.name === "Backend Development")?.name ||
              list[0].name;
            onChange(preferred);
          }
        }
      })
      .catch((err) => {
        if (!ignore) {
          console.error("Failed to fetch categories:", err);
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  // Handle Add Category
  const handleAdd = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) {
      setError("Please enter a category name.");
      return;
    }

    setAdding(true);
    setError(null);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create category");
      }

      setNewName("");
      // Immediately select the newly created category in the dropdown
      if (data.category?.name) {
        onChange(data.category.name);
      }
      await reloadCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add category");
    } finally {
      setAdding(false);
    }
  };

  // Start Editing
  const startEditing = (cat: CategoryItem) => {
    setError(null);
    setEditingId(cat._id || cat.id);
    setEditingName(cat.name);
  };

  // Cancel Editing
  const cancelEditing = () => {
    setEditingId(null);
    setEditingName("");
  };

  // Save Edit (Rename)
  const handleSaveEdit = async (cat: CategoryItem) => {
    const trimmed = editingName.trim();
    if (!trimmed) {
      setError("Category name cannot be empty.");
      return;
    }

    if (trimmed === cat.name) {
      cancelEditing();
      return;
    }

    setSavingEdit(true);
    setError(null);
    const catId = cat._id || cat.id;

    try {
      const res = await fetch(`/api/categories/${catId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update category");
      }

      // If the category being edited is currently selected, update the selection
      if (value === cat.name) {
        onChange(trimmed);
      }

      cancelEditing();
      await reloadCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update category");
    } finally {
      setSavingEdit(false);
    }
  };

  // Delete Category
  const handleDelete = async (cat: CategoryItem) => {
    const catId = cat._id || cat.id;
    const confirmMsg = `Are you sure you want to delete "${cat.name}"? Existing tasks will retain this category name as text.`;
    if (!window.confirm(confirmMsg)) {
      return;
    }

    setDeletingId(catId);
    setError(null);
    try {
      const res = await fetch(`/api/categories/${catId}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete category");
      }

      // If currently selected category was deleted, fallback to another category
      if (value === cat.name) {
        const remaining = categories.filter((c) => (c._id || c.id) !== catId);
        onChange(remaining.length > 0 ? remaining[0].name : "");
      }

      await reloadCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete category");
    } finally {
      setDeletingId(null);
    }
  };

  // Construct options list, ensuring current value is included even if legacy
  const categoryNames = categories.map((c) => c.name);
  const options =
    value && !categoryNames.includes(value)
      ? [value, ...categoryNames]
      : categoryNames;

  return (
    <div className="space-y-1">
      {/* Label and Admin + Manage Button */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-700">
          Category / Project
        </label>
        {isAdmin && (
          <button
            type="button"
            onClick={() => toggleManaging()}
            className="inline-flex items-center space-x-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors py-0.5 px-1.5 rounded-md hover:bg-indigo-50"
            title="Manage categories"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>{isManaging ? "Done" : "+ Manage"}</span>
          </button>
        )}
      </div>

      {/* Dropdown Select */}
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || loading}
          className="w-full text-base px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 bg-white disabled:opacity-50"
        >
          {loading && <option value="">Loading categories...</option>}
          {!loading && options.length === 0 && (
            <option value="">No categories available</option>
          )}
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      {/* Admin Inline Management Panel */}
      {isAdmin && isManaging && (
        <div className="mt-2 rounded-2xl border border-indigo-100 bg-gradient-to-b from-indigo-50/60 to-white p-3.5 shadow-sm space-y-3 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between border-b border-indigo-100/70 pb-2">
            <div className="flex items-center space-x-1.5">
              <FolderPlus className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-bold text-slate-800">
                Manage Categories
              </span>
              <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
                Admin
              </span>
            </div>
            <button
              type="button"
              onClick={() => toggleManaging(false)}
              className="rounded p-1 text-slate-400 hover:bg-indigo-100/50 hover:text-slate-600"
              title="Close panel"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Inline Error Message */}
          {error && (
            <div className="flex items-start space-x-2 rounded-xl border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">{error}</div>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-rose-400 hover:text-rose-600"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Add Category Form */}
          <form onSubmit={handleAdd} className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-600">
              Add New Category
            </label>
            <div className="flex items-center space-x-1.5">
              <input
                type="text"
                placeholder="e.g. Mobile Apps, DevOps..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                disabled={adding}
                className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={adding || !newName.trim()}
                className="inline-flex items-center space-x-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {adding ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                <span>Add</span>
              </button>
            </div>
          </form>

          {/* Existing Categories List */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-slate-600">
                Existing Categories ({categories.length})
              </label>
            </div>

            <div className="max-h-44 overflow-y-auto space-y-1 rounded-lg border border-slate-100 bg-white/70 p-1.5">
              {categories.length === 0 ? (
                <p className="py-2 text-center text-xs text-slate-400">
                  No categories found.
                </p>
              ) : (
                categories.map((cat) => {
                  const catId = cat._id || cat.id;
                  const isEditingThis = editingId === catId;
                  const isDeletingThis = deletingId === catId;

                  if (isEditingThis) {
                    return (
                      <div
                        key={catId}
                        className="flex items-center space-x-1.5 rounded-lg border border-indigo-200 bg-indigo-50/50 p-1.5"
                      >
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleSaveEdit(cat);
                            } else if (e.key === "Escape") {
                              cancelEditing();
                            }
                          }}
                          disabled={savingEdit}
                          className="flex-1 rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(cat)}
                          disabled={savingEdit || !editingName.trim()}
                          className="rounded p-1 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50"
                          title="Save category name"
                        >
                          {savingEdit ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditing}
                          disabled={savingEdit}
                          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                          title="Cancel edit"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={catId}
                      className="group flex items-center justify-between rounded-lg px-2 py-1.5 text-xs text-slate-700 hover:bg-indigo-50/60 transition-colors"
                    >
                      <span
                        className={`truncate flex-1 ${
                          value === cat.name ? "font-bold text-indigo-700" : ""
                        }`}
                      >
                        {cat.name}
                        {value === cat.name && (
                          <span className="ml-1.5 text-[10px] font-normal text-indigo-500">
                            (selected)
                          </span>
                        )}
                      </span>

                      <div className="flex items-center space-x-1 shrink-0 ml-2">
                        <button
                          type="button"
                          onClick={() => startEditing(cat)}
                          className="rounded p-1 text-slate-400 hover:bg-indigo-100/60 hover:text-indigo-600 transition-colors"
                          title={`Rename "${cat.name}"`}
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(cat)}
                          disabled={isDeletingThis}
                          className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors disabled:opacity-50"
                          title={`Delete "${cat.name}"`}
                        >
                          {isDeletingThis ? (
                            <Loader2 className="w-3 h-3 animate-spin text-rose-500" />
                          ) : (
                            <Trash2 className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
