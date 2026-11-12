import { NextRequest, NextResponse } from "next/server";
import {
  getTasksCollection,
  getUsersCollection,
  getWorkSessionsCollection,
  isDuplicateKeyError,
} from "@/lib/mongodb";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { UserRole } from "@/lib/types";

const VALID_ROLES: UserRole[] = ["member", "manager", "admin"];

function parseUserId(id: string): ObjectId | null {
  if (!ObjectId.isValid(id) || id.length !== 24) return null;
  return new ObjectId(id);
}

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (currentUser.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Only administrators can update team members." },
        { status: 403 }
      );
    }

    const { id } = await props.params;
    const userId = parseUserId(id);
    if (!userId) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const body = await req.json();
    const { name, email, role, title, password } = body;
    const usersCol = await getUsersCollection();

    const target = await usersCol.findOne({ _id: userId });
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if (typeof name === "string" && name.trim()) {
      updates.name = name.trim();
    }

    if (typeof title === "string") {
      updates.title = title.trim() || "Team Member";
    }

    if (typeof email === "string" && email.trim()) {
      const cleanEmail = email.trim().toLowerCase();
      if (cleanEmail !== target.email) {
        const duplicate = await usersCol.findOne({
          email: cleanEmail,
          _id: { $ne: userId },
        });
        if (duplicate) {
          return NextResponse.json(
            { error: "A user with this email already exists." },
            { status: 409 }
          );
        }
      }
      updates.email = cleanEmail;
    }

    if (role !== undefined) {
      if (!VALID_ROLES.includes(role)) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      }
      if (target.role === "admin" && role !== "admin") {
        if (currentUser.id === id) {
          return NextResponse.json(
            { error: "You cannot remove your own admin role." },
            { status: 400 }
          );
        }
        const adminCount = await usersCol.countDocuments({ role: "admin" });
        if (adminCount <= 1) {
          return NextResponse.json(
            { error: "At least one administrator must remain." },
            { status: 400 }
          );
        }
      }
      updates.role = role;
    }

    if (typeof password === "string" && password.length > 0) {
      if (password.length < 6) {
        return NextResponse.json(
          { error: "Password must be at least 6 characters." },
          { status: 400 }
        );
      }
      updates.password = await hashPassword(password);
    }

    await usersCol.updateOne({ _id: userId }, { $set: updates });
    const updated = await usersCol.findOne({ _id: userId });

    return NextResponse.json({
      message: "Team member updated successfully",
      user: {
        _id: updated!._id!.toString(),
        name: updated!.name,
        email: updated!.email,
        role: updated!.role,
        title: updated!.title,
        avatar: updated!.avatar,
      },
    });
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      return NextResponse.json(
        { error: "A user with this email already exists." },
        { status: 409 }
      );
    }
    console.error("Update user error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update user" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (currentUser.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Only administrators can delete team members." },
        { status: 403 }
      );
    }

    const { id } = await props.params;
    const userId = parseUserId(id);
    if (!userId) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    if (currentUser.id === id) {
      return NextResponse.json(
        { error: "You cannot delete your own account." },
        { status: 400 }
      );
    }

    const usersCol = await getUsersCollection();
    const target = await usersCol.findOne({ _id: userId });
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (target.role === "admin") {
      const adminCount = await usersCol.countDocuments({ role: "admin" });
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "At least one administrator must remain." },
          { status: 400 }
        );
      }
    }

    // Never delete someone while their timer is running - that would lose time.
    const sessionsCol = await getWorkSessionsCollection();
    const activeSession = await sessionsCol.findOne({
      userId: id,
      status: "active",
    });
    if (activeSession) {
      return NextResponse.json(
        {
          error: `This member has an active work session on ${activeSession.taskCode}. Ask them to stop it before deleting the account.`,
        },
        { status: 409 }
      );
    }

    await usersCol.deleteOne({ _id: userId });

    // Keep historical sessions, but release any tasks that were assigned to them.
    const tasksCol = await getTasksCollection();
    await tasksCol.updateMany(
      { $or: [{ assigneeId: id }, { "assignee._id": id }] },
      { $set: { assigneeId: null, assignee: null, updatedAt: new Date() } }
    );

    return NextResponse.json({
      message: "Team member deleted successfully",
    });
  } catch (err) {
    console.error("Delete user error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete user" },
      { status: 500 }
    );
  }
}
