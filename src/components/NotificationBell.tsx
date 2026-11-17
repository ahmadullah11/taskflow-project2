"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthContext";
import { NotificationDoc } from "@/lib/types";
import { formatRelativeTime, getInitials } from "@/lib/date-utils";
import { Bell, CheckCheck, Loader2, UserPlus } from "lucide-react";

const POLL_INTERVAL_MS = 20_000;

export default function NotificationBell() {
  const { user } = useAuth();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [notifications, setNotifications] = useState<NotificationDoc[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [dataUserId, setDataUserId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userId = user?.id;

  const loadNotifications = useCallback(async () => {
    if (!userId) return;

    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) {
        setError("Could not load notifications.");
        setDataUserId(userId);
        return;
      }
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
      setDataUserId(userId);
      setError(null);
    } catch (err) {
      console.error("Failed to load notifications:", err);
      setError("Could not load notifications.");
      setDataUserId(userId);
    }
  }, [userId]);

  // Poll for new notifications and refresh on focus / tab visibility.
  useEffect(() => {
    if (!userId) return;

    // Initial fetch on mount / user switch is intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadNotifications();

    const interval = setInterval(loadNotifications, POLL_INTERVAL_MS);
    const handleFocus = () => loadNotifications();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") loadNotifications();
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [userId, loadNotifications]);

  // Close the dropdown on outside click or Escape.
  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  // Keep the notification panel and the profile menu from overlapping.
  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener("nextrack:close-notifications", close);
    return () =>
      window.removeEventListener("nextrack:close-notifications", close);
  }, []);

  const markAllAsRead = async () => {
    if (markingAll || unreadCount === 0) return;

    const previous = notifications;
    setMarkingAll(true);
    setError(null);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);

    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true, isRead: true }),
      });
      if (!res.ok) {
        throw new Error("Failed to mark notifications as read.");
      }
    } catch (err) {
      console.error(err);
      setError("Could not mark notifications as read.");
      setNotifications(previous);
      setUnreadCount(previous.filter((n) => !n.isRead).length);
    } finally {
      setMarkingAll(false);
    }
  };

  const openNotification = (notification: NotificationDoc) => {
    setOpen(false);

    if (!notification.isRead) {
      // Optimistic update so the badge clears instantly.
      setNotifications((prev) =>
        prev.map((item) =>
          item._id === notification._id ? { ...item, isRead: true } : item
        )
      );
      setUnreadCount((count) => Math.max(0, count - 1));

      fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: notification._id, isRead: true }),
      }).catch((err) => console.error("Failed to mark notification read:", err));
    }

    // Assignment notifications open the task itself; comment notifications
    // continue to deep-link to the discussion section.
    const isAssignment = notification.type === "assignment";
    router.push(
      isAssignment
        ? `/tasks/${notification.taskId}`
        : `/tasks/${notification.taskId}#comments`
    );

    if (!isAssignment) {
      // If we are already on that task page, the route may not remount, so ask
      // the comments section to scroll itself into view.
      window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent("nextrack:comments-navigate"));
      }, 60);
    }
  };

  if (!user) return null;

  const showLoading = dataUserId !== userId;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) {
            loadNotifications();
            window.dispatchEvent(new CustomEvent("nextrack:close-profile"));
          }
        }}
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
        aria-haspopup="true"
        aria-expanded={open}
        className="relative inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 sm:h-9 sm:w-9"
      >
        <Bell className="h-[18px] w-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed left-2 right-2 top-16 z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl animate-in fade-in slide-in-from-top-2 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[22rem]">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <div>
              <p className="text-sm font-bold leading-tight text-slate-900">
                Notifications
              </p>
              <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                {unreadCount > 0
                  ? `${unreadCount} unread`
                  : "You're all caught up"}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                disabled={markingAll}
                className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-lg px-1.5 py-1 text-[11px] font-semibold text-indigo-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-50"
              >
                {markingAll ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <CheckCheck className="h-3 w-3" />
                )}
                <span>Mark all as read</span>
              </button>
            )}
          </div>

          <div className="max-h-[min(24rem,70vh)] overflow-y-auto">
            {showLoading ? (
              <div className="flex items-center justify-center py-10 text-slate-400">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Loading...
                </span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 text-slate-400">
                  <Bell className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold text-slate-800">
                  No notifications yet
                </p>
                <p className="mx-auto mt-1 max-w-[16rem] text-xs text-slate-400">
                  You&apos;ll see updates here when tasks are assigned to you or
                  teammates comment.
                </p>
              </div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification._id?.toString()}
                  type="button"
                  onClick={() => openNotification(notification)}
                  className={`flex w-full items-start gap-3 border-b border-slate-100 px-4 py-3 text-left transition-colors last:border-b-0 ${
                    notification.isRead
                      ? "bg-white hover:bg-slate-50"
                      : "bg-indigo-50/60 hover:bg-indigo-50"
                  }`}
                >
                  <div
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-[10px] font-bold ${
                      notification.isRead
                        ? "border-slate-200 bg-slate-100 text-slate-600"
                        : "border-indigo-200 bg-indigo-100 text-indigo-700"
                    }`}
                    aria-hidden="true"
                  >
                    {notification.type === "assignment" ? (
                      <UserPlus className="h-4 w-4" />
                    ) : (
                      getInitials(notification.actorName)
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-xs leading-snug ${
                        notification.isRead
                          ? "font-medium text-slate-700"
                          : "font-semibold text-slate-900"
                      }`}
                    >
                      {notification.message}
                    </p>
                    {notification.preview && (
                      <p className="mt-0.5 truncate text-[11px] text-slate-500">
                        {notification.preview}
                      </p>
                    )}
                    <p className="mt-1 text-[10px] font-medium text-slate-400">
                      {formatRelativeTime(notification.createdAt)}
                    </p>
                  </div>

                  {!notification.isRead && (
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
                  )}
                </button>
              ))
            )}
          </div>

          {error && (
            <p className="border-t border-rose-100 bg-rose-50 px-4 py-2 text-[11px] font-semibold text-rose-600">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
