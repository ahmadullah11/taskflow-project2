import { NextRequest, NextResponse } from "next/server";
import { Filter, ObjectId } from "mongodb";
import {
  getNotificationsCollection,
  getTaskCommentsCollection,
  getTasksCollection,
  getUsersCollection,
} from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { AuthUser, NotificationDoc, TaskCommentDoc, TaskDoc } from "@/lib/types";

const MAX_COMMENT_LENGTH = 4000;

function buildTaskQuery(id: string): Filter<TaskDoc> {
  // A 24-char hex string is an ObjectId; anything else is treated as a task code.
  if (id.length === 24 && ObjectId.isValid(id)) {
    return { $or: [{ _id: new ObjectId(id) }, { taskCode: id }] };
  }
  return { taskCode: id };
}

/**
 * Admins can access every task. Everyone else needs to be assigned to the
 * task or have created it (mirrors the edit permissions on the task route).
 */
function canAccessTask(task: TaskDoc, user: AuthUser): boolean {
  return (
    user.role === "admin" ||
    task.assigneeId === user.id ||
    task.assignee?._id === user.id ||
    task.createdById === user.id
  );
}

function serializeComment(comment: TaskCommentDoc) {
  return {
    ...comment,
    _id: comment._id!.toString(),
  };
}

/** Collapse whitespace and trim long comment bodies for notification previews. */
function buildPreview(content: string): string {
  const singleLine = content.replace(/\s+/g, " ").trim();
  return singleLine.length > 140
    ? `${singleLine.slice(0, 137)}...`
    : singleLine;
}

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required to view comments." },
        { status: 401 }
      );
    }

    const tasksCol = await getTasksCollection();
    const commentsCol = await getTaskCommentsCollection();

    const task = await tasksCol.findOne(buildTaskQuery(id));
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (!canAccessTask(task, user)) {
      return NextResponse.json(
        { error: "Access denied: You can only view comments on tasks you can access." },
        { status: 403 }
      );
    }

    const comments = await commentsCol
      .find({ taskId: task._id!.toString() })
      .sort({ createdAt: 1 })
      .toArray();

    return NextResponse.json({
      comments: comments.map(serializeComment),
    });
  } catch (err) {
    console.error("Fetch task comments error:", err);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required to post a comment." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }

    const rawContent = (body as { content?: unknown }).content;
    if (typeof rawContent !== "string" || !rawContent.trim()) {
      return NextResponse.json(
        { error: "Comment cannot be empty." },
        { status: 400 }
      );
    }

    const content = rawContent.trim();
    if (content.length > MAX_COMMENT_LENGTH) {
      return NextResponse.json(
        {
          error: `Comment must be ${MAX_COMMENT_LENGTH} characters or fewer.`,
        },
        { status: 400 }
      );
    }

    const tasksCol = await getTasksCollection();
    const commentsCol = await getTaskCommentsCollection();

    const task = await tasksCol.findOne(buildTaskQuery(id));
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (!canAccessTask(task, user)) {
      return NextResponse.json(
        { error: "Access denied: You cannot comment on this task." },
        { status: 403 }
      );
    }

    const taskId = task._id!.toString();
    const rawParentId = (body as { parentId?: unknown }).parentId;
    let parentId: string | null = null;
    let parent: TaskCommentDoc | null = null;

    if (rawParentId !== undefined && rawParentId !== null && rawParentId !== "") {
      if (
        typeof rawParentId !== "string" ||
        rawParentId.length !== 24 ||
        !ObjectId.isValid(rawParentId)
      ) {
        return NextResponse.json(
          { error: "Invalid parent comment." },
          { status: 400 }
        );
      }

      parent = await commentsCol.findOne({
        _id: new ObjectId(rawParentId),
        taskId,
      });
      if (!parent) {
        return NextResponse.json(
          { error: "Parent comment not found." },
          { status: 404 }
        );
      }

      // Replies are kept one level deep: replying to a reply attaches to the
      // same root comment so threads stay predictable.
      parentId = parent.parentId || parent._id!.toString();
    }

    const now = new Date();
    const comment: TaskCommentDoc = {
      taskId,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      userRole: user.role,
      userTitle: user.title,
      userAvatar: user.avatar,
      content,
      parentId,
      createdAt: now,
      updatedAt: now,
    };

    const result = await commentsCol.insertOne(comment);
    comment._id = result.insertedId;

    // Notify everyone involved in this task. A notification failure must never
    // block the comment itself, so errors are logged and swallowed.
    try {
      const notificationsCol = await getNotificationsCollection();
      const recipients = new Map<
        string,
        { type: "comment" | "reply"; message: string }
      >();
      const assigneeId = task.assigneeId || task.assignee?._id || null;
      const commentId = comment._id.toString();

      if (parent) {
        // Reply: notify the parent comment's author…
        if (parent.userId && parent.userId !== user.id) {
          recipients.set(parent.userId, {
            type: "reply",
            message: `${user.name} replied to your comment on ${task.taskCode}`,
          });
        }
        // …and the task's assignee when they aren't the replier or parent author.
        if (
          assigneeId &&
          assigneeId !== user.id &&
          !recipients.has(assigneeId)
        ) {
          recipients.set(assigneeId, {
            type: "reply",
            message: `${user.name} replied on ${task.taskCode}: ${task.title}`,
          });
        }
      } else {
        // New top-level comment: notify the assignee…
        if (assigneeId && assigneeId !== user.id) {
          recipients.set(assigneeId, {
            type: "comment",
            message: `${user.name} commented on ${task.taskCode}: ${task.title}`,
          });
        }

        // …and every administrator, except the commenter.
        const usersCol = await getUsersCollection();
        const admins = await usersCol
          .find({ role: "admin" })
          .project({ _id: 1 })
          .toArray();
        for (const admin of admins) {
          const adminId = admin._id.toString();
          if (adminId !== user.id && !recipients.has(adminId)) {
            recipients.set(adminId, {
              type: "comment",
              message: `${user.name} commented on ${task.taskCode}: ${task.title}`,
            });
          }
        }
      }

      if (recipients.size > 0) {
        const preview = buildPreview(content);
        const notifications: NotificationDoc[] = Array.from(
          recipients,
          ([recipientId, meta]) => ({
            userId: recipientId,
            actorId: user.id,
            actorName: user.name,
            actorRole: user.role,
            taskId,
            taskCode: task.taskCode,
            taskTitle: task.title,
            commentId,
            parentId,
            type: meta.type,
            message: meta.message,
            preview,
            isRead: false,
            createdAt: now,
          })
        );
        await notificationsCol.insertMany(notifications);
      }
    } catch (notificationErr) {
      console.error("Create comment notifications error:", notificationErr);
    }

    return NextResponse.json(
      {
        message: "Comment posted successfully",
        comment: serializeComment(comment),
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Post task comment error:", err);
    return NextResponse.json(
      { error: "Failed to post comment" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const commentId = req.nextUrl.searchParams.get("commentId");
    if (
      !commentId ||
      commentId.length !== 24 ||
      !ObjectId.isValid(commentId)
    ) {
      return NextResponse.json(
        { error: "A valid commentId is required." },
        { status: 400 }
      );
    }

    const tasksCol = await getTasksCollection();
    const commentsCol = await getTaskCommentsCollection();

    const task = await tasksCol.findOne(buildTaskQuery(id));
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (!canAccessTask(task, user)) {
      return NextResponse.json(
        { error: "Access denied: You cannot delete comments on this task." },
        { status: 403 }
      );
    }

    const taskId = task._id!.toString();
    const comment = await commentsCol.findOne({
      _id: new ObjectId(commentId),
      taskId,
    });
    if (!comment) {
      return NextResponse.json(
        { error: "Comment not found" },
        { status: 404 }
      );
    }

    // Authors can remove their own comments; administrators can remove any.
    if (comment.userId !== user.id && user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: You can only delete your own comments." },
        { status: 403 }
      );
    }

    let deletedCount = 0;
    if (!comment.parentId) {
      // Deleting a root comment also removes its replies.
      const result = await commentsCol.deleteMany({
        taskId,
        $or: [{ _id: comment._id }, { parentId: comment._id!.toString() }],
      });
      deletedCount = result.deletedCount;
    } else {
      const result = await commentsCol.deleteOne({ _id: comment._id });
      deletedCount = result.deletedCount;
    }

    // Drop notifications that point at deleted comments (including replies of
    // a deleted root comment).
    try {
      const notificationsCol = await getNotificationsCollection();
      await notificationsCol.deleteMany({
        $or: [{ commentId }, { parentId: commentId }],
      });
    } catch (notificationErr) {
      console.error("Delete comment notifications error:", notificationErr);
    }

    return NextResponse.json({
      message: "Comment deleted successfully",
      deletedCount,
      commentId,
    });
  } catch (err) {
    console.error("Delete task comment error:", err);
    return NextResponse.json(
      { error: "Failed to delete comment" },
      { status: 500 }
    );
  }
}
