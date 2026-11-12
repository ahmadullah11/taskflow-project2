import { NextRequest, NextResponse } from "next/server";
import { getTasksCollection, getWorkSessionsCollection } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { ObjectId, Filter } from "mongodb";
import { TaskDoc } from "@/lib/types";

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
        { error: "Authentication required to view work sessions." },
        { status: 401 }
      );
    }

    const tasksCol = await getTasksCollection();
    const sessionsCol = await getWorkSessionsCollection();

    const taskQuery = buildTaskQuery(id);

    const task = await tasksCol.findOne(taskQuery);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (user.role !== "admin") {
      const isAssigned =
        task.assigneeId === user.id || task.assignee?._id === user.id;
      if (!isAssigned) {
        return NextResponse.json(
          { error: "Access denied: You can only view work sessions for tasks assigned to you." },
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
  } catch (err) {
    console.error("Fetch sessions error:", err);
    return NextResponse.json(
      { error: "Failed to fetch work sessions" },
      { status: 500 }
    );
  }
}
