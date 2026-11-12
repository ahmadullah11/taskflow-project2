import { NextRequest, NextResponse } from "next/server";
import { getWorkSessionsCollection } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(req);
    const { id } = await props.params;

    const sessionsCol = await getWorkSessionsCollection();
    let query: any = {};

    if (id === "all") {
      if (user && user.role === "admin") {
        query = {}; // Admin sees all logs
      } else if (user) {
        query = { userId: user.id }; // Non-admin only sees their own logs
      } else {
        return NextResponse.json({ sessions: [], totalDurationSeconds: 0 });
      }
    } else {
      const targetUserId = id === "me" && user ? user.id : id;
      if (!user || (user.role !== "admin" && targetUserId !== user.id)) {
        // Enforce privacy: non-admin can only see their own logs
        query = { userId: user ? user.id : "" };
      } else {
        query = { userId: targetUserId };
      }
    }

    const sessions = await sessionsCol
      .find(query)
      .sort({ startTime: -1 })
      .toArray();

    const formatted = sessions.map((s) => ({
      ...s,
      _id: s._id!.toString(),
    }));

    const totalSeconds = sessions
      .filter((s) => s.status === "completed")
      .reduce((acc, curr) => acc + (curr.durationSeconds || 0), 0);

    return NextResponse.json({
      sessions: formatted,
      totalDurationSeconds: totalSeconds,
    });
  } catch (err: any) {
    console.error("Fetch user time-logs error:", err);
    return NextResponse.json(
      { error: "Failed to fetch time logs" },
      { status: 500 }
    );
  }
}
