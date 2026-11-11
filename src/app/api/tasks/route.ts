import { NextRequest, NextResponse } from "next/server";
import { getTasksCollection, getUsersCollection } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { TaskPriority, TaskStatus } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const assigneeId = searchParams.get("assigneeId");
    const search = searchParams.get("search");

    const query: any = {};

    if (status && status !== "all") {
      query.status = status;
    }

    if (priority && priority !== "all") {
      query.priority = priority;
    }

    if (assigneeId && assigneeId !== "all") {
      query.assigneeId = assigneeId;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { taskCode: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
        { "assignee.name": { $regex: search, $options: "i" } },
      ];
    }

    const tasksCol = await getTasksCollection();
    const tasks = await tasksCol.find(query).sort({ createdAt: -1 }).toArray();

    const formatted = tasks.map((t) => ({
      ...t,
      _id: t._id!.toString(),
    }));

    return NextResponse.json({ tasks: formatted });
  } catch (err: any) {
    console.error("Fetch tasks error:", err);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required to create tasks." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { title, description = "", category = "General", priority = "medium", assigneeId } = body;

    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: "Task title is required." },
        { status: 400 }
      );
    }

    const tasksCol = await getTasksCollection();
    const usersCol = await getUsersCollection();

    // Determine the next task code (TASK-1001, TASK-1002, etc.)
    const highestTask = await tasksCol
      .find({ taskCode: { $regex: /^TASK-\d+$/ } })
      .sort({ taskCode: -1 })
      .limit(1)
      .toArray();

    let nextNumber = 1001;
    if (highestTask.length > 0 && highestTask[0].taskCode) {
      const match = highestTask[0].taskCode.match(/TASK-(\d+)/);
      if (match && match[1]) {
        nextNumber = Math.max(nextNumber, parseInt(match[1], 10) + 1);
      }
    }
    const taskCode = `TASK-${nextNumber}`;

    // Lookup assignee if provided
    let assignee = null;
    if (assigneeId) {
      try {
        const foundAssignee = await usersCol.findOne({ _id: new ObjectId(assigneeId) });
        if (foundAssignee) {
          assignee = {
            _id: foundAssignee._id!.toString(),
            name: foundAssignee.name,
            email: foundAssignee.email,
            role: foundAssignee.role,
            title: foundAssignee.title,
            avatar: foundAssignee.avatar,
          };
        }
      } catch (err) {
        console.warn("Invalid assigneeId objectId:", err);
      }
    }

    const newTask = {
      taskCode,
      title: title.trim(),
      description: description.trim(),
      category: category.trim(),
      priority: priority as TaskPriority,
      status: "Todo" as TaskStatus,
      assigneeId: assignee ? assignee._id : null,
      assignee,
      createdById: user.id,
      createdBy: {
        _id: user.id,
        name: user.name,
        email: user.email,
      },
      activeSession: null,
      totalDurationSeconds: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await tasksCol.insertOne(newTask as any);

    return NextResponse.json({
      message: "Task created successfully",
      task: {
        ...newTask,
        _id: result.insertedId.toString(),
      },
    });
  } catch (err: any) {
    console.error("Create task error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create task" },
      { status: 500 }
    );
  }
}
