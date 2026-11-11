import { NextRequest, NextResponse } from "next/server";
import { getUsersCollection } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    // You can view team members if logged in, or fallback for UI selection
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
    }));

    return NextResponse.json({ users: formatted });
  } catch (err: any) {
    console.error("Fetch users error:", err);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
