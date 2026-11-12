import { NextRequest, NextResponse } from "next/server";
import { getTasksCollection, getUsersCollection, isDuplicateKeyError } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { ObjectId, Filter } from "mongodb";
import { TaskDoc, TaskPriority, TaskStatus } from "@/lib/types";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const assigneeId = searchParams.get("assigneeId");
    const search = searchParams.get("search");

    const andConditions: Filter<TaskDoc>[] = [];

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required to view tasks." },
        { status: 401 }
      );
    }

    // Role-based visibility:
    // - Admins see every task and may filter by assignee.
    // - Everyone else only ever receives tasks strictly assigned to their own
    //   account. Unassigned tasks and other members' tasks are excluded.
    if (user.role !== "admin") {
      andConditions.push({
        $or: [{ assigneeId: user.id }, { "assignee._id": user.id }],
      });
    } else {
      // User is Admin: show all tasks! Admin can also optionally filter by assignee.
      if (assigneeId && assigneeId !== "all") {
        if (assigneeId === "unassigned") {
          andConditions.push({
            $or: [
              { assigneeId: null },
              { assigneeId: { $exists: false } },
              { assigneeId: "" },
            ],
          });
        } else {
          andConditions.push({
            $or: [{ assigneeId: assigneeId }, { "assignee._id": assigneeId }],
          });
        }
      }
    }

    if (status && status !== "all") {
      andConditions.push({ status: status as TaskStatus });
    }

    if (priority && priority !== "all") {
      andConditions.push({ priority: priority as TaskPriority });
    }

    if (search && search.trim()) {
      const searchRegex = { $regex: escapeRegex(search.trim()), $options: "i" };
      andConditions.push({
        $or: [
          { title: searchRegex },
          { taskCode: searchRegex },
          { category: searchRegex },
          { "assignee.name": searchRegex },
        ],
      });
    }

    const query = andConditions.length > 0 ? { $and: andConditions } : {};

    const tasksCol = await getTasksCollection();
    const tasks = await tasksCol.find(query).sort({ createdAt: -1 }).toArray();

    const formatted = tasks.map((t) => ({
      ...t,
      _id: t._id!.toString(),
    }));

    return NextResponse.json({ tasks: formatted });
  } catch (err) {
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
    // Sort on the numeric suffix instead of the raw string so codes remain
    // correct once the counter passes 9999 (where "9999" > "10000" as text).
    const [highestTask] = await tasksCol
      .aggregate([
        { $match: { taskCode: { $regex: "^TASK-\\d+$" } } },
        {
          $addFields: {
            taskNumber: {
              $toInt: {
                $substrCP: [
                  "$taskCode",
                  5,
                  { $subtract: [{ $strLenCP: "$taskCode" }, 5] },
                ],
              },
            },
          },
        },
        { $sort: { taskNumber: -1 } },
        { $limit: 1 },
      ])
      .toArray();

    let nextNumber = 1001;
    if (highestTask?.taskNumber) {
      nextNumber = Math.max(nextNumber, highestTask.taskNumber + 1);
    }

    // Role-based assignment:
    // Only Admin can assign tasks to all users.
    // If user is not admin, task is assigned to the current user (self-assigned).
    let targetAssigneeId: string | null = null;
    if (user.role === "admin") {
      targetAssigneeId = assigneeId || null;
    } else {
      targetAssigneeId = user.id;
    }

    // Lookup assignee if targetAssigneeId is provided
    let assignee = null;
    if (targetAssigneeId) {
      try {
        const foundAssignee = await usersCol.findOne({ _id: new ObjectId(targetAssigneeId) });
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

    const newTask: Omit<TaskDoc, "taskCode"> = {
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

    // Insert with a retry loop so two simultaneous requests can't produce a
    // duplicate taskCode (the unique index rejects the loser with code 11000).
    let taskCode = `TASK-${nextNumber}`;
    let insertedId: string | ObjectId | null = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const result = await tasksCol.insertOne({ ...newTask, taskCode });
        insertedId = result.insertedId;
        break;
      } catch (err) {
        if (isDuplicateKeyError(err)) {
          nextNumber += 1;
          taskCode = `TASK-${nextNumber}`;
          continue;
        }
        throw err;
      }
    }

    if (!insertedId) {
      return NextResponse.json(
        { error: "Could not allocate a task code. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Task created successfully",
      task: {
        ...newTask,
        taskCode,
        _id: insertedId.toString(),
      },
    });
  } catch (err) {
    console.error("Create task error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create task" },
      { status: 500 }
    );
  }
}
