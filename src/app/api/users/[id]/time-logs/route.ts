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

    const targetUserId = id === "me" && user ? user.id : id;

    const sessionsCol = await getWorkSessionsCollection();
    const sessions = await sessionsCol
      .find({ userId: targetUserId })
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
