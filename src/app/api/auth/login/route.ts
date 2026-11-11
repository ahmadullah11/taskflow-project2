import { NextRequest, NextResponse } from "next/server";
import { getUsersCollection } from "@/lib/mongodb";
import { verifyPassword, generateToken, AUTH_COOKIE_NAME } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const usersCol = await getUsersCollection();
    const user = await usersCol.findOne({ email: cleanEmail });

    if (!user || !user.password) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const isMatch = await verifyPassword(password, user.password);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const userObj = {
      id: user._id!.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      title: user.title,
      avatar: user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name)}`,
    };

    const token = generateToken(userObj);

    const response = NextResponse.json({
      message: "Logged in successfully",
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
    console.error("Login error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to log in" },
      { status: 500 }
    );
  }
}
