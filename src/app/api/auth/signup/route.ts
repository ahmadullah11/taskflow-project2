import { NextRequest, NextResponse } from "next/server";
import { getUsersCollection } from "@/lib/mongodb";
import { hashPassword, generateToken, AUTH_COOKIE_NAME } from "@/lib/auth";

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
      name: name.trim(),
      email: cleanEmail,
      password: hashedPassword,
      role: role as any,
      title: title.trim(),
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name.trim())}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const userObj = {
      id: result.insertedId.toString(),
      name: name.trim(),
      email: cleanEmail,
      role: role as any,
      title: title.trim(),
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name.trim())}`,
    };

    const token = generateToken(userObj);

    const response = NextResponse.json({
      message: "User registered successfully",
      user: userObj,
    });

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (err: any) {
    console.error("Signup error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create account" },
      { status: 500 }
    );
  }
}
