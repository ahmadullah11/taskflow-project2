import { NextRequest, NextResponse } from "next/server";
import { getUsersCollection, isDuplicateKeyError } from "@/lib/mongodb";
import { hashPassword } from "@/lib/auth";
import { UserRole } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, role = "member", title = "Team Member" } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const validRoles: UserRole[] = ["member", "manager", "admin"];
    const safeRole: UserRole = validRoles.includes(role) ? role : "member";
    const usersCol = await getUsersCollection();
    const existing = await usersCol.findOne({ email: cleanEmail });

    if (existing) {
      return NextResponse.json(
        { error: "A user with this email already exists." },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(password);
    const result = await usersCol.insertOne({
      name: cleanName,
      email: cleanEmail,
      password: hashedPassword,
      role: safeRole,
      title: title.trim(),
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Registration only creates the account. No session cookie or token is
    // issued, so the new user must explicitly sign in on /login afterwards.
    return NextResponse.json(
      {
        message: "Account created successfully. Please sign in.",
        user: {
          id: result.insertedId.toString(),
          name: cleanName,
          email: cleanEmail,
          role: safeRole,
          title: title.trim(),
          avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}`,
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
    console.error("Signup error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create account" },
      { status: 500 }
    );
  }
}
