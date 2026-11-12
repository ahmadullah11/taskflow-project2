import { NextRequest, NextResponse } from "next/server";
import { getUsersCollection, isDuplicateKeyError } from "@/lib/mongodb";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { UserRole } from "@/lib/types";

const VALID_ROLES: UserRole[] = ["member", "manager", "admin"];

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required to view team members." },
        { status: 401 }
      );
    }

    const usersCol = await getUsersCollection();
    const users = await usersCol
      .find({}, { projection: { password: 0 } })
      .sort({ name: 1 })
      .toArray();

    const formatted = users.map((u) => ({
      _id: u._id!.toString(),
      name: u.name,
      email: u.email,
      role: u.role,
      title: u.title,
      avatar: u.avatar,
      createdAt: u.createdAt,
    }));

    return NextResponse.json({ users: formatted });
  } catch (err) {
    console.error("Fetch users error:", err);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (currentUser.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Only administrators can add team members." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, email, password, role = "member", title = "Team Member" } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required." },
        { status: 400 }
      );
    }

    if (String(password).length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    const safeRole: UserRole = VALID_ROLES.includes(role) ? role : "member";
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanName = String(name).trim();
    const cleanTitle = String(title).trim() || "Team Member";

    const usersCol = await getUsersCollection();
    const existing = await usersCol.findOne({ email: cleanEmail });
    if (existing) {
      return NextResponse.json(
        { error: "A user with this email already exists." },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(password);
    const avatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}`;
    const result = await usersCol.insertOne({
      name: cleanName,
      email: cleanEmail,
      password: hashedPassword,
      role: safeRole,
      title: cleanTitle,
      avatar,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json(
      {
        message: "Team member added successfully",
        user: {
          _id: result.insertedId.toString(),
          name: cleanName,
          email: cleanEmail,
          role: safeRole,
          title: cleanTitle,
          avatar,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      return NextResponse.json(
        { error: "A user with this email already exists." },
        { status: 409 }
      );
    }
    console.error("Create user error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create user" },
      { status: 500 }
    );
  }
}
