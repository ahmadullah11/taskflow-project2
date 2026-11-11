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
        { error: "Authentication required to start a work session." },
        { status: 401 }
      );
    }

    const { id } = await props.params;
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

    // Business Rule 1: Only the assigned member can start working session
    // (allow admin/manager to take assignment or start if user is admin, but enforce assignee check)
    if (task.assigneeId && task.assigneeId !== user.id && user.role !== "admin") {
      return NextResponse.json(
        {
          error: `Only the assigned member (${task.assignee?.name || "assignee"}) can start work on this task.`,
        },
        { status: 403 }
      );
    }

    // If task is unassigned, assign it to the current user starting it!
    let assigneeUpdate = {};
    if (!task.assigneeId) {
      assigneeUpdate = {
        assigneeId: user.id,
        assignee: {
          _id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          title: user.title,
          avatar: user.avatar,
        },
      };
    }

    // Business Rule 2: A member cannot have two active work sessions simultaneously across any task
    const existingActiveSession = await sessionsCol.findOne({
      userId: user.id,
      status: "active",
    });

    if (existingActiveSession) {
      return NextResponse.json(
        {
          error: `You already have an active work session on task ${existingActiveSession.taskCode} ("${existingActiveSession.taskTitle}"). Please stop that session before starting a new one.`,
          activeSession: {
            ...existingActiveSession,
            _id: existingActiveSession._id!.toString(),
          },
        },
        { status: 409 }
      );
    }

    // Business Rule 6: Check if task already has an active session from someone else
    if (task.activeSession) {
      return NextResponse.json(
        {
          error: `This task already has an active session running by ${task.activeSession.userName}.`,
        },
        { status: 409 }
      );
    }

    // Business Rule 3: Backend calculates elapsed time using server timestamp (UTC)
    const startTime = new Date();
    const sessionId = new ObjectId();

    const sessionDoc = {
      _id: sessionId,
      taskId: task._id!.toString(),
      taskCode: task.taskCode,
      taskTitle: task.title,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      userRole: user.role,
      userTitle: user.title || "Team Member",
      userAvatar: user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name)}`,
      startTime,
      endTime: null,
      durationSeconds: 0,
      status: "active" as const,
      summary: "",
      createdAt: startTime,
      updatedAt: startTime,
    };

    await sessionsCol.insertOne(sessionDoc as any);

    // Update task status to "In Progress" and register active session
    const activeSessionInfo = {
      sessionId: sessionId.toString(),
      userId: user.id,
      userName: user.name,
      userTitle: user.title,
      userAvatar: user.avatar,
      startTime: startTime.toISOString(),
    };

    await tasksCol.updateOne(taskQuery, {
      $set: {
        status: "In Progress",
        activeSession: activeSessionInfo,
        updatedAt: new Date(),
        ...assigneeUpdate,
      },
    });

    const updatedTask = await tasksCol.findOne(taskQuery);

    return NextResponse.json({
      message: "Work session started successfully",
      session: {
        ...sessionDoc,
        _id: sessionId.toString(),
        startTime: startTime.toISOString(),
      },
      task: {
        ...updatedTask,
        _id: updatedTask!._id!.toString(),
      },
    });
  } catch (err: any) {
    console.error("Start session error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to start session" },
      { status: 500 }
    );
  }
}
