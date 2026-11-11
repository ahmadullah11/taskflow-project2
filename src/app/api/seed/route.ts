import { NextResponse } from "next/server";
import { getUsersCollection, getTasksCollection, getWorkSessionsCollection } from "@/lib/mongodb";
import { hashPassword } from "@/lib/auth";
import { ObjectId } from "mongodb";

export async function POST() {
  try {
    const usersCol = await getUsersCollection();
    const tasksCol = await getTasksCollection();
    const sessionsCol = await getWorkSessionsCollection();

    // Check if users already seeded
    const count = await usersCol.countDocuments();
    if (count > 0) {
      return NextResponse.json({ message: "Database already has users. Skipping seed." });
    }

    const defaultPassword = await hashPassword("password123");

    const ahmadId = new ObjectId();
    const sarahId = new ObjectId();
    const alexId = new ObjectId();
    const adminId = new ObjectId();

    const sampleUsers = [
      {
        _id: ahmadId,
        name: "Ahmad Ullah",
        email: "ahmad@company.com",
        password: defaultPassword,
        role: "member" as const,
        title: "Software Engineer",
        avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Ahmad%20Ullah",
        createdAt: new Date(),
      },
      {
        _id: sarahId,
        name: "Sarah Jenkins",
        email: "sarah@company.com",
        password: defaultPassword,
        role: "manager" as const,
        title: "Product Manager",
        avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Sarah%20Jenkins",
        createdAt: new Date(),
      },
      {
        _id: alexId,
        name: "Alex Rivera",
        email: "alex@company.com",
        password: defaultPassword,
        role: "member" as const,
        title: "Senior Frontend Developer",
        avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Alex%20Rivera",
        createdAt: new Date(),
      },
      {
        _id: adminId,
        name: "System Admin",
        email: "admin@company.com",
        password: defaultPassword,
        role: "admin" as const,
        title: "Platform Administrator",
        avatar: "https://api.dicebear.com/7.x/initials/svg?seed=System%20Admin",
        createdAt: new Date(),
      },
    ];

    await usersCol.insertMany(sampleUsers);

    // Initial tasks
    const task1024Id = new ObjectId();
    const task1025Id = new ObjectId();
    const task1026Id = new ObjectId();
    const task1027Id = new ObjectId();

    const sampleTasks = [
      {
        _id: task1024Id,
        taskCode: "TASK-1024",
        title: "Implement User Authentication",
        description: "Design and implement custom JWT and session management with HTTP-only cookies, password encryption, and robust access controls.",
        category: "Backend Development",
        priority: "high" as const,
        status: "In Progress" as const,
        assigneeId: ahmadId.toString(),
        assignee: {
          _id: ahmadId.toString(),
          name: "Ahmad Ullah",
          email: "ahmad@company.com",
          role: "member" as const,
          title: "Software Engineer",
          avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Ahmad%20Ullah",
        },
        createdById: sarahId.toString(),
        createdBy: {
          _id: sarahId.toString(),
          name: "Sarah Jenkins",
          email: "sarah@company.com",
        },
        activeSession: null,
        totalDurationSeconds: 8100, // 2h 15m
        createdAt: new Date(Date.now() - 86400000 * 2), // 2 days ago
        updatedAt: new Date(),
      },
      {
        _id: task1025Id,
        taskCode: "TASK-1025",
        title: "Design System Component Audit",
        description: "Review button hierarchy, modal dialog patterns, typography contrast, and dark mode transitions across the workspace.",
        category: "Design System",
        priority: "medium" as const,
        status: "Todo" as const,
        assigneeId: alexId.toString(),
        assignee: {
          _id: alexId.toString(),
          name: "Alex Rivera",
          email: "alex@company.com",
          role: "member" as const,
          title: "Senior Frontend Developer",
          avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Alex%20Rivera",
        },
        createdById: sarahId.toString(),
        createdBy: {
          _id: sarahId.toString(),
          name: "Sarah Jenkins",
          email: "sarah@company.com",
        },
        activeSession: null,
        totalDurationSeconds: 0,
        createdAt: new Date(Date.now() - 86400000),
        updatedAt: new Date(),
      },
      {
        _id: task1026Id,
        taskCode: "TASK-1026",
        title: "Setup Automated CI/CD Pipelines",
        description: "Configure GitHub Actions workflows to build Next.js applications, run TypeScript validations, and perform security audits on push.",
        category: "DevOps",
        priority: "urgent" as const,
        status: "Completed" as const,
        assigneeId: ahmadId.toString(),
        assignee: {
          _id: ahmadId.toString(),
          name: "Ahmad Ullah",
          email: "ahmad@company.com",
          role: "member" as const,
          title: "Software Engineer",
          avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Ahmad%20Ullah",
        },
        createdById: sarahId.toString(),
        createdBy: {
          _id: sarahId.toString(),
          name: "Sarah Jenkins",
          email: "sarah@company.com",
        },
        activeSession: null,
        totalDurationSeconds: 14400, // 4 hours
        createdAt: new Date(Date.now() - 86400000 * 4),
        updatedAt: new Date(Date.now() - 86400000 * 3),
      },
      {
        _id: task1027Id,
        taskCode: "TASK-1027",
        title: "API Performance & Caching Optimization",
        description: "Analyze response latency on heavy MongoDB queries, add index optimization, and configure Next.js edge caching strategies.",
        category: "Backend Development",
        priority: "low" as const,
        status: "Todo" as const,
        assigneeId: ahmadId.toString(),
        assignee: {
          _id: ahmadId.toString(),
          name: "Ahmad Ullah",
          email: "ahmad@company.com",
          role: "member" as const,
          title: "Software Engineer",
          avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Ahmad%20Ullah",
        },
        createdById: adminId.toString(),
        createdBy: {
          _id: adminId.toString(),
          name: "System Admin",
          email: "admin@company.com",
        },
        activeSession: null,
        totalDurationSeconds: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    await tasksCol.insertMany(sampleTasks);

    // Initial sample work session on TASK-1024 matching the mockup
    const sessionDate = new Date(Date.now() - 86400000); // yesterday
    const sessionStart = new Date(sessionDate);
    sessionStart.setHours(14, 0, 0, 0); // 2:00 PM
    const sessionEnd = new Date(sessionDate);
    sessionEnd.setHours(16, 15, 0, 0); // 4:15 PM (2h 15m = 8100 seconds)

    await sessionsCol.insertOne({
      taskId: task1024Id.toString(),
      taskCode: "TASK-1024",
      taskTitle: "Implement User Authentication",
      userId: ahmadId.toString(),
      userName: "Ahmad Ullah",
      userEmail: "ahmad@company.com",
      userTitle: "Software Engineer",
      userAvatar: "https://api.dicebear.com/7.x/initials/svg?seed=Ahmad%20Ullah",
      startTime: sessionStart,
      endTime: sessionEnd,
      durationSeconds: 8100,
      status: "completed",
      summary: "Implemented JWT authentication, configured access tokens and refresh tokens, and tested login APIs.",
      createdAt: sessionEnd,
      updatedAt: sessionEnd,
    });

    return NextResponse.json({
      message: "Seed data created successfully",
      usersCount: sampleUsers.length,
      tasksCount: sampleTasks.length,
    });
  } catch (err: any) {
    console.error("Seed error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
