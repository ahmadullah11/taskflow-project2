import { NextRequest, NextResponse } from "next/server";
import { getTasksCollection } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { TaskStatus } from "@/lib/types";

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await props.params;
    const body = await req.json();
    const { status } = body;

    const validStatuses: TaskStatus[] = ["Todo", "In Progress", "Completed"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status value" },
        { status: 400 }
      );
    }

    const tasksCol = await getTasksCollection();
    let query: any = {};
    if (ObjectId.isValid(id)) {
      query = { $or: [{ _id: new ObjectId(id) }, { taskCode: id }] };
    } else {
      query = { taskCode: id };
    }

    const task = await tasksCol.findOne(query);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const canUpdateStatus =
      user.role === "admin" ||
      user.role === "manager" ||
      task.assigneeId === user.id ||
      task.assignee?._id === user.id ||
      task.createdById === user.id;
    if (!canUpdateStatus) {
      return NextResponse.json(
        { error: "Access denied: You cannot change the status of this task." },
        { status: 403 }
      );
    }

    await tasksCol.updateOne(query, {
      $set: {
        status,
        updatedAt: new Date(),
      },
    });

    const updatedTask = await tasksCol.findOne(query);

    return NextResponse.json({
      message: `Status updated to ${status}`,
      task: {
        ...updatedTask,
        _id: updatedTask!._id!.toString(),
      },
    });
  } catch (err: any) {
    console.error("Update task status error:", err);
    return NextResponse.json(
      { error: "Failed to update status" },
      { status: 500 }
    );
  }
}
