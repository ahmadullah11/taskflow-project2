"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AuthUser, TaskCommentDoc } from "@/lib/types";
import { getInitials } from "@/lib/date-utils";
import {
  CornerDownRight,
  Loader2,
  MessageSquare,
  Reply,
  Send,
  Trash2,
} from "lucide-react";

interface TaskCommentsProps {
  taskId: string;
  currentUser: AuthUser | null;
}

type CommentDate = string | Date;

function toDate(value: CommentDate | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatCommentTimestamp(value: CommentDate | undefined): string {
  const date = toDate(value);
  if (!date) return "";
  const datePart = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
  const timePart = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
  return `${datePart} at ${timePart}`;
}

function formatFullTimestamp(value: CommentDate | undefined): string {
  const date = toDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(date);
}

function timeValue(value: CommentDate | undefined): number {
  const date = toDate(value);
  return date ? date.getTime() : 0;
}

function roleLabel(comment: TaskCommentDoc): string {
  if (comment.userTitle?.trim()) return comment.userTitle.trim();
  switch (comment.userRole) {
    case "admin":
      return "Administrator";
    case "manager":
      return "Manager";
    default:
      return "Team Member";
  }
}

function AuthorAvatar({
  name,
  size = "md",
}: {
  name?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizing =
    size === "sm"
      ? "w-8 h-8 rounded-lg text-[10px]"
      : size === "lg"
        ? "w-10 h-10 rounded-xl text-xs"
        : "w-9 h-9 rounded-xl text-[11px]";
  return (
    <div
      className={`${sizing} flex flex-shrink-0 items-center justify-center border border-indigo-200/70 bg-indigo-100 font-bold text-indigo-700`}
      aria-hidden="true"
    >
      {getInitials(name)}
    </div>
  );
}

export default function TaskComments({
  taskId,
  currentUser,
}: TaskCommentsProps) {
  const [comments, setComments] = useState<TaskCommentDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [replyPosting, setReplyPosting] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchComments = useCallback(async () => {
    if (!currentUser) {
      setComments([]);
      setLoading(false);
      return;
    }

    try {
      setLoadError(null);
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setLoadError(data.error || "Failed to load comments.");
        setComments([]);
        return;
      }

      setComments(data.comments || []);
    } catch (err) {
      console.error("Failed to load task comments:", err);
      setLoadError("Failed to load comments.");
    } finally {
      setLoading(false);
    }
  }, [taskId, currentUser]);

  useEffect(() => {
    // Reload comments when the task or the signed-in user changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchComments();
  }, [fetchComments]);

  // Notification links land on /tasks/[id]#comments; make sure the discussion
  // section is scrolled into view once the task page has rendered.
  useEffect(() => {
    const scrollToComments = () => {
      document
        .getElementById("comments")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    const scrollIfHash = () => {
      if (window.location.hash === "#comments") scrollToComments();
    };

    const timer = window.setTimeout(scrollIfHash, loading ? 0 : 120);
    window.addEventListener("hashchange", scrollIfHash);
    // Fired by the notification menu when the user is already on this task.
    window.addEventListener("nextrack:comments-navigate", scrollToComments);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("hashchange", scrollIfHash);
      window.removeEventListener("nextrack:comments-navigate", scrollToComments);
    };
  }, [loading]);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content || posting) return;

    setPosting(true);
    setPostError(null);
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to post comment.");
      }

      setComments((prev) => [...prev, data.comment as TaskCommentDoc]);
      setDraft("");
    } catch (err) {
      setPostError(
        err instanceof Error ? err.message : "Failed to post comment."
      );
    } finally {
      setPosting(false);
    }
  };

  const handlePostReply = async (e: React.FormEvent, parentId: string) => {
    e.preventDefault();
    const content = replyDraft.trim();
    if (!content || replyPosting) return;

    setReplyPosting(true);
    setReplyError(null);
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, parentId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to post reply.");
      }

      setComments((prev) => [...prev, data.comment as TaskCommentDoc]);
      setReplyDraft("");
      setReplyingTo(null);
    } catch (err) {
      setReplyError(
        err instanceof Error ? err.message : "Failed to post reply."
      );
    } finally {
      setReplyPosting(false);
    }
  };

  const handleDeleteComment = async (comment: TaskCommentDoc) => {
    const id = comment._id?.toString();
    if (!id || deletingId) return;

    setDeletingId(id);
    setDeleteError(null);
    try {
      const res = await fetch(
        `/api/tasks/${taskId}/comments?commentId=${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete comment.");
      }

      setComments((prev) =>
        prev.filter(
          (item) =>
            item._id?.toString() !== id && item.parentId !== id
        )
      );
      setConfirmDeleteId(null);
      if (replyingTo === id) {
        setReplyingTo(null);
        setReplyDraft("");
        setReplyError(null);
      }
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete comment."
      );
    } finally {
      setDeletingId(null);
    }
  };

  const openReplyBox = (rootId: string) => {
    setReplyingTo((prev) => (prev === rootId ? null : rootId));
    setReplyDraft("");
    setReplyError(null);
  };

  const rootComments = comments
    .filter((comment) => !comment.parentId)
    .sort((a, b) => timeValue(b.createdAt) - timeValue(a.createdAt));

  const commentCount = comments.length;

  const canDelete = (comment: TaskCommentDoc) =>
    Boolean(
      currentUser &&
        (currentUser.role === "admin" || currentUser.id === comment.userId)
    );

  const renderDeleteControls = (comment: TaskCommentDoc, compact = false) => {
    const id = comment._id?.toString();
    if (!id || !canDelete(comment)) return null;

    if (confirmDeleteId === id) {
      return (
        <span className="inline-flex items-center gap-1.5">
          <span className="text-[11px] font-semibold text-rose-600">
            Delete?
          </span>
          <button
            type="button"
            onClick={() => handleDeleteComment(comment)}
            disabled={deletingId === id}
            className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2 py-1 text-[11px] font-bold text-white transition-colors hover:bg-rose-700 disabled:opacity-60"
          >
            {deletingId === id ? (
              <Loader2 className={`${compact ? "h-3 w-3" : "h-3.5 w-3.5"} animate-spin`} />
            ) : (
              <Trash2 className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
            )}
            <span>Delete</span>
          </button>
          <button
            type="button"
            onClick={() => setConfirmDeleteId(null)}
            disabled={deletingId === id}
            className="rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-60"
          >
            Cancel
          </button>
        </span>
      );
    }

    return (
      <button
        type="button"
        onClick={() => {
          setDeleteError(null);
          setConfirmDeleteId(id);
        }}
        className="inline-flex items-center gap-1 rounded-lg px-1.5 py-1 text-[11px] font-semibold text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
        aria-label={`Delete comment by ${comment.userName}`}
      >
        <Trash2 className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
        <span className="hidden sm:inline">Delete</span>
      </button>
    );
  };

  return (
    <div
      id="comments"
      className="scroll-mt-24 bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm"
    >
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 leading-tight">
              Comments &amp; Discussion
            </h3>
            <p className="text-xs text-slate-500">
              {commentCount} {commentCount === 1 ? "comment" : "comments"}
              {commentCount > 0 ? " on this task" : " — start the conversation"}
            </p>
          </div>
        </div>
      </div>

      {/* New comment composer */}
      {currentUser ? (
        <form onSubmit={handlePostComment} className="mt-6">
          <div className="flex items-start gap-3">
            <AuthorAvatar name={currentUser.name} size="lg" />
            <div className="min-w-0 flex-1">
              <label htmlFor="new-task-comment" className="sr-only">
                Write a comment
              </label>
              <textarea
                id="new-task-comment"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Write a comment or update..."
                rows={3}
                maxLength={4000}
                className="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 shadow-xs transition-colors focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
              />
              <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[11px] font-medium text-slate-400">
                  Posting as{" "}
                  <span className="font-semibold text-slate-600">
                    {currentUser.name}
                  </span>
                </p>
                <button
                  type="submit"
                  disabled={posting || !draft.trim()}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-200 transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 sm:py-2"
                >
                  {posting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  <span>{posting ? "Posting..." : "Post Comment"}</span>
                </button>
              </div>
              {postError && (
                <p className="mt-2 text-[11px] font-semibold text-rose-600">
                  {postError}
                </p>
              )}
            </div>
          </div>
        </form>
      ) : (
        <p className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-3 text-xs font-medium text-slate-500">
          Log in to join the discussion on this task.
        </p>
      )}

      {/* Comment list */}
      <div className="mt-6 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-slate-400">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Loading comments...
            </span>
          </div>
        ) : loadError ? (
          <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-600">
            {loadError}
          </div>
        ) : rootComments.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 mb-3">
              <MessageSquare className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-slate-800">
              No comments yet
            </p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              Share an update, ask a question, or leave context for the team.
            </p>
          </div>
        ) : (
          rootComments.map((root) => {
            const rootId = root._id?.toString() || "";
            const replies = comments
              .filter((comment) => comment.parentId === rootId)
              .sort((a, b) => timeValue(a.createdAt) - timeValue(b.createdAt));
            const isReplying = replyingTo === rootId;

            return (
              <article
                key={rootId}
                className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 transition-colors hover:bg-slate-50 sm:p-5"
              >
                <div className="flex items-start gap-3">
                  <AuthorAvatar name={root.userName} size="lg" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-sm font-bold text-slate-900">
                        {root.userName}
                      </span>
                      <span className="text-[10px] text-slate-300">•</span>
                      <span className="text-xs font-medium text-slate-500">
                        {roleLabel(root)}
                      </span>
                      {root.userRole === "admin" && (
                        <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-700">
                          Admin
                        </span>
                      )}
                      {root.userId === currentUser?.id && (
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                          You
                        </span>
                      )}
                    </div>
                    <time
                      dateTime={toDate(root.createdAt)?.toISOString()}
                      title={formatFullTimestamp(root.createdAt)}
                      className="mt-0.5 block text-[11px] font-medium text-slate-400"
                    >
                      {formatCommentTimestamp(root.createdAt)}
                    </time>

                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">
                      {root.content}
                    </p>

                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openReplyBox(rootId)}
                        className="inline-flex items-center gap-1 rounded-lg px-1.5 py-1 text-[11px] font-semibold text-slate-500 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                        aria-expanded={isReplying}
                      >
                        <Reply className="h-3.5 w-3.5" />
                        <span>{isReplying ? "Cancel reply" : "Reply"}</span>
                      </button>
                      {renderDeleteControls(root)}
                    </div>

                    {/* Inline reply composer */}
                    {isReplying && (
                      <form
                        onSubmit={(e) => handlePostReply(e, rootId)}
                        className="mt-3 rounded-2xl border border-indigo-100 bg-white p-3 shadow-xs sm:p-4"
                      >
                        <div className="flex items-start gap-2.5">
                          <AuthorAvatar name={currentUser?.name} size="sm" />
                          <div className="min-w-0 flex-1">
                            <label
                              htmlFor={`reply-${rootId}`}
                              className="sr-only"
                            >
                              Reply to {root.userName}
                            </label>
                            <textarea
                              id={`reply-${rootId}`}
                              autoFocus
                              value={replyDraft}
                              onChange={(e) => setReplyDraft(e.target.value)}
                              placeholder={`Reply to ${root.userName}...`}
                              rows={2}
                              maxLength={4000}
                              className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 shadow-xs transition-colors focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
                            />
                            <div className="mt-2 flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setReplyingTo(null);
                                  setReplyDraft("");
                                  setReplyError(null);
                                }}
                                disabled={replyPosting}
                                className="rounded-lg px-3 py-1.5 text-[11px] font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-60"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={replyPosting || !replyDraft.trim()}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm shadow-indigo-200 transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {replyPosting ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <CornerDownRight className="h-3 w-3" />
                                )}
                                <span>
                                  {replyPosting ? "Sending..." : "Reply"}
                                </span>
                              </button>
                            </div>
                            {replyError && (
                              <p className="mt-1.5 text-[11px] font-semibold text-rose-600">
                                {replyError}
                              </p>
                            )}
                          </div>
                        </div>
                      </form>
                    )}

                    {/* Threaded replies */}
                    {replies.length > 0 && (
                      <div className="mt-3 space-y-3 border-l-2 border-indigo-100 pl-3 sm:pl-4">
                        {replies.map((reply) => {
                          const replyId = reply._id?.toString() || "";
                          return (
                            <div
                              key={replyId}
                              className="rounded-xl border border-slate-100 bg-white p-3 shadow-xs sm:p-3.5"
                            >
                              <div className="flex items-start gap-2.5">
                                <AuthorAvatar name={reply.userName} size="sm" />
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                    <span className="text-xs font-bold text-slate-900">
                                      {reply.userName}
                                    </span>
                                    <span className="text-[10px] text-slate-300">
                                      •
                                    </span>
                                    <span className="text-[11px] font-medium text-slate-500">
                                      {roleLabel(reply)}
                                    </span>
                                    {reply.userRole === "admin" && (
                                      <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-indigo-700">
                                        Admin
                                      </span>
                                    )}
                                    {reply.userId === currentUser?.id && (
                                      <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500">
                                        You
                                      </span>
                                    )}
                                  </div>
                                  <time
                                    dateTime={toDate(reply.createdAt)?.toISOString()}
                                    title={formatFullTimestamp(reply.createdAt)}
                                    className="mt-0.5 block text-[10px] font-medium text-slate-400"
                                  >
                                    {formatCommentTimestamp(reply.createdAt)}
                                  </time>
                                  <p className="mt-1.5 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-slate-700">
                                    {reply.content}
                                  </p>
                                  <div className="mt-1.5">
                                    {renderDeleteControls(reply, true)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        )}

        {deleteError && (
          <p className="text-[11px] font-semibold text-rose-600">
            {deleteError}
          </p>
        )}
      </div>
    </div>
  );
}
