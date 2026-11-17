import { NextRequest, NextResponse } from "next/server";
import { getTasksCollection, getUsersCollection } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { createTaskAssignmentNotification } from "@/lib/notifications";
import { Filter, ObjectId } from "mongodb";
import { TaskDoc } from "@/lib/types";

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Business Rule: Only Admin can assign or reassign tasks
    if (user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Only administrators can assign or reassign tasks." },
        { status: 403 }
      );
    }

    const { id } = await props.params;
    const body = await req.json().catch(() => null);
    const assigneeId = (body as { assigneeId?: unknown } | null)?.assigneeId;

    const tasksCol = await getTasksCollection();
    const usersCol = await getUsersCollection();

    let query: Filter<TaskDoc> = {};
    if (ObjectId.isValid(id)) {
      query = { $or: [{ _id: new ObjectId(id) }, { taskCode: id }] };
    } else {
      query = { taskCode: id };
    }

    const task = await tasksCol.findOne(query);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const previousAssigneeId = task.assigneeId || task.assignee?._id || null;

    // Lookup new assignee
    let assignee: NonNullable<TaskDoc["assignee"]> | null = null;
    if (assigneeId !== undefined && assigneeId !== null && assigneeId !== "") {
      if (
        typeof assigneeId !== "string" ||
        assigneeId.length !== 24 ||
        !ObjectId.isValid(assigneeId)
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

      assignee = {
        _id: foundUser._id!.toString(),
        name: foundUser.name,
        email: foundUser.email,
        role: foundUser.role,
        title: foundUser.title,
        avatar: foundUser.avatar,
      };
    }

    const updateData = {
      assigneeId: assignee ? assignee._id : null,
      assignee,
      updatedAt: new Date(),
    };

    await tasksCol.updateOne(query, { $set: updateData });

    const updatedTask = await tasksCol.findOne(query);

    // Notify the new assignee only when the task actually changed hands.
    if (
      updatedTask &&
      assignee &&
      assignee._id !== previousAssigneeId &&
      assignee._id !== user.id
    ) {
      await createTaskAssignmentNotification({
        recipientId: assignee._id,
        actor: user,
        taskId: updatedTask._id!.toString(),
        taskCode: updatedTask.taskCode,
        taskTitle: updatedTask.title,
        message: `${user.name} assigned you to task: ${updatedTask.taskCode} - ${updatedTask.title}`,
      });
    }

    return NextResponse.json({
      message: assignee ? `Task assigned to ${assignee.name}` : "Task unassigned",
      task: {
        ...updatedTask,
        _id: updatedTask!._id!.toString(),
      },
    });
  } catch (err) {
    console.error("Assign task error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to assign task" },
      { status: 500 }
    );
  }
}
