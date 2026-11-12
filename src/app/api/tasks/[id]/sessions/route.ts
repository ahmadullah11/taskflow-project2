import { NextRequest, NextResponse } from "next/server";
import { getTasksCollection, getWorkSessionsCollection } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { ObjectId } from "mongodb";

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required to view work sessions." },
        { status: 401 }
      );
    }

    const tasksCol = await getTasksCollection();
    const sessionsCol = await getWorkSessionsCollection();

    let taskQuery: any = {};
    if (ObjectId.isValid(id)) {
      taskQuery = { $or: [{ _id: new ObjectId(id) }, { taskCode: id }] };
    } else {
      taskQuery = { taskCode: id };
    }

    const task = await tasksCol.findOne(taskQuery);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (user.role !== "admin") {
      const isRelated =
        !task.assigneeId ||
        task.assigneeId === user.id ||
        task.assignee?._id === user.id ||
        task.createdById === user.id;
      if (!isRelated) {
        return NextResponse.json(
          { error: "Access denied: You can only view work sessions for your own tasks." },
          { status: 403 }
        );
      }
    }

    const sessions = await sessionsCol
      .find({ taskId: task._id!.toString() })
      .sort({ startTime: -1 })
      .toArray();

    const formattedSessions = sessions.map((s) => ({
      ...s,
      _id: s._id!.toString(),
    }));

    return NextResponse.json({
      sessions: formattedSessions,
      totalDurationSeconds: task.totalDurationSeconds || 0,
      activeSession: task.activeSession || null,
    });
  } catch (err: any) {
    console.error("Fetch sessions error:", err);
    return NextResponse.json(
      { error: "Failed to fetch work sessions" },
      { status: 500 }
    );
  }
}
