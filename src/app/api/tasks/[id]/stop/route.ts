import { NextRequest, NextResponse } from "next/server";
import { getTasksCollection, getWorkSessionsCollection } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { ObjectId } from "mongodb";

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required to stop a work session." },
        { status: 401 }
      );
    }

    const { id } = await props.params;
    const body = await req.json();
    const { summary, markCompleted = false } = body;

    // Business Rule 5: Progress summary is mandatory when stopping
    if (!summary || typeof summary !== "string" || summary.trim().length < 5) {
      return NextResponse.json(
        { error: "Please provide a valid progress report describing what you accomplished (at least 5 characters)." },
        { status: 400 }
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

    // Find active session for this task and user
    const activeSession = await sessionsCol.findOne({
      taskId: task._id!.toString(),
      status: "active",
      ...(user.role !== "admin" ? { userId: user.id } : {}),
    });

    if (!activeSession) {
      return NextResponse.json(
        { error: "No active work session found for this task and user." },
        { status: 404 }
      );
    }

    // Business Rule 1: Only the user who owns the session can stop it (or admin)
    if (activeSession.userId !== user.id && user.role !== "admin") {
      return NextResponse.json(
        { error: "You can only stop your own work sessions." },
        { status: 403 }
      );
    }

    // Business Rule 3: Backend calculates elapsed time using server timestamps (UTC)
    const endTime = new Date();
    const startTime = new Date(activeSession.startTime);
    const durationSeconds = Math.max(1, Math.round((endTime.getTime() - startTime.getTime()) / 1000));

    // Update session record
    await sessionsCol.updateOne(
      { _id: activeSession._id },
      {
        $set: {
          endTime,
          durationSeconds,
          status: "completed",
          summary: summary.trim(),
          updatedAt: endTime,
        },
      }
    );

    // Update task: increment total duration, clear activeSession, update status if requested
    const taskUpdates: any = {
      $inc: { totalDurationSeconds: durationSeconds },
      $set: {
        activeSession: null,
        updatedAt: endTime,
        ...(markCompleted ? { status: "Completed" } : {}),
      },
    };

    await tasksCol.updateOne(taskQuery, taskUpdates);

    const updatedTask = await tasksCol.findOne(taskQuery);
    const updatedSession = await sessionsCol.findOne({ _id: activeSession._id });

    return NextResponse.json({
      message: "Work session logged successfully",
      session: {
        ...updatedSession,
        _id: updatedSession!._id!.toString(),
      },
      task: {
        ...updatedTask,
        _id: updatedTask!._id!.toString(),
      },
    });
  } catch (err: any) {
    console.error("Stop session error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to log work session" },
      { status: 500 }
    );
  }
}
