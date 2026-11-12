import { NextRequest, NextResponse } from "next/server";
import { getTasksCollection, getUsersCollection } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { ObjectId, Filter } from "mongodb";
import { TaskDoc, TaskPriority, TaskStatus } from "@/lib/types";

const VALID_STATUSES: TaskStatus[] = ["Todo", "In Progress", "Completed"];
const VALID_PRIORITIES: TaskPriority[] = ["low", "medium", "high", "urgent"];

function buildTaskQuery(id: string): Filter<TaskDoc> {
  // A 24-char hex string is an ObjectId; anything else is treated as a task code.
  if (id.length === 24 && ObjectId.isValid(id)) {
    return { $or: [{ _id: new ObjectId(id) }, { taskCode: id }] };
  }
  return { taskCode: id };
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
        { error: "Authentication required to view tasks." },
        { status: 401 }
      );
    }

    const tasksCol = await getTasksCollection();

    const query = buildTaskQuery(id);

    const task = await tasksCol.findOne(query);

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Non-admin users can only view their own related tasks
    if (user.role !== "admin") {
      const isRelated =
        task.assigneeId === user.id ||
        task.assignee?._id === user.id ||
        task.createdById === user.id;
      if (!isRelated) {
        return NextResponse.json(
          { error: "Access denied: You can only view tasks assigned to or created by you." },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({
      task: {
        ...task,
        _id: task._id!.toString(),
      },
    });
  } catch (err) {
    console.error("Get task error:", err);
    return NextResponse.json(
      { error: "Failed to fetch task" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Only administrators can edit tasks." },
        { status: 403 }
      );
    }

    const { id } = await props.params;
    const body = await req.json();
    const { title, description, category, priority, status, assigneeId } = body;

    const tasksCol = await getTasksCollection();
    const usersCol = await getUsersCollection();

    const query = buildTaskQuery(id);

    const task = await tasksCol.findOne(query);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if (title !== undefined) {
      if (typeof title !== "string" || !title.trim()) {
        return NextResponse.json(
          { error: "Task title cannot be empty." },
          { status: 400 }
        );
      }
      updates.title = title.trim();
    }

    if (description !== undefined) {
      updates.description =
        typeof description === "string" ? description.trim() : "";
    }

    if (category !== undefined) {
      updates.category =
        typeof category === "string" && category.trim()
          ? category.trim()
          : "General";
    }

    if (priority !== undefined) {
      if (!VALID_PRIORITIES.includes(priority)) {
        return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
      }
      updates.priority = priority;
    }

    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      updates.status = status;
    }

    // `assigneeId: null` (or "") unassigns; omit the field to leave it as-is.
    if (assigneeId !== undefined) {
      if (assigneeId === null || assigneeId === "") {
        updates.assigneeId = null;
        updates.assignee = null;
      } else {
        if (
          typeof assigneeId !== "string" ||
          !ObjectId.isValid(assigneeId) ||
          assigneeId.length !== 24
        ) {
          return NextResponse.json(
            { error: "Invalid assignee ID" },
            { status: 400 }
          );
        }
        const foundUser = await usersCol.findOne({
          _id: new ObjectId(assigneeId),
        });
        if (!foundUser) {
          return NextResponse.json({ error: "User not found" }, { status: 404 });
        }
        updates.assigneeId = foundUser._id!.toString();
        updates.assignee = {
          _id: foundUser._id!.toString(),
          name: foundUser.name,
          email: foundUser.email,
          role: foundUser.role,
          title: foundUser.title,
          avatar: foundUser.avatar,
        };
      }
    }

    await tasksCol.updateOne(query, { $set: updates });
    const updatedTask = await tasksCol.findOne(query);

    return NextResponse.json({
      message: "Task updated successfully",
      task: {
        ...updatedTask,
        _id: updatedTask!._id!.toString(),
      },
    });
  } catch (err) {
    console.error("Update task error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update task" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await props.params;
    const tasksCol = await getTasksCollection();

    const query = buildTaskQuery(id);

    const task = await tasksCol.findOne(query);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Only administrators can delete tasks.
    if (user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Only administrators can delete tasks." },
        { status: 403 }
      );
    }

    const result = await tasksCol.deleteOne({ _id: task._id });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Task deleted successfully" });
  } catch (err) {
    console.error("Delete task error:", err);
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    );
  }
}
