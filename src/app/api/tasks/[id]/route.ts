import { NextRequest, NextResponse } from "next/server";
import { getTasksCollection } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { ObjectId } from "mongodb";

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
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

    return NextResponse.json({
      task: {
        ...task,
        _id: task._id!.toString(),
      },
    });
  } catch (err: any) {
    console.error("Get task error:", err);
    return NextResponse.json(
      { error: "Failed to fetch task" },
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

    let query: any = {};
    if (ObjectId.isValid(id)) {
      query = { $or: [{ _id: new ObjectId(id) }, { taskCode: id }] };
    } else {
      query = { taskCode: id };
    }

    const result = await tasksCol.deleteOne(query);

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Task deleted successfully" });
  } catch (err: any) {
    console.error("Delete task error:", err);
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    );
  }
}
