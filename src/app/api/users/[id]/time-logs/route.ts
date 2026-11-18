import { NextRequest, NextResponse } from "next/server";
import { getWorkSessionsCollection } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { ObjectId } from "mongodb";

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
        query = {
          $or: [
            { userId: user.id },
            ...(ObjectId.isValid(user.id) ? [{ userId: new ObjectId(user.id) as any }] : []),
          ],
        };
      } else {
        return NextResponse.json({
          sessions: [],
          totalDurationSeconds: 0,
          todayDurationSeconds: 0,
        });
      }
    } else {
      const targetUserId = id === "me" && user ? user.id : id;
      if (!user || (user.role !== "admin" && targetUserId !== user.id)) {
        // Enforce privacy: non-admin can only see their own logs
        const uid = user ? user.id : "";
        query = {
          $or: [
            { userId: uid },
            ...(uid && ObjectId.isValid(uid) ? [{ userId: new ObjectId(uid) as any }] : []),
          ],
        };
      } else {
        query = {
          $or: [
            { userId: targetUserId },
            ...(ObjectId.isValid(targetUserId) ? [{ userId: new ObjectId(targetUserId) as any }] : []),
          ],
        };
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

    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0
    );
    const endOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999
    );

    const isToday = (dInput?: Date | string | null) => {
      if (!dInput) return false;
      const d = new Date(dInput);
      return !isNaN(d.getTime()) && d >= startOfToday && d <= endOfToday;
    };

    const todaySessions = sessions.filter(
      (s) => isToday(s.createdAt) || isToday(s.endTime) || isToday(s.startTime)
    );

    const todayDurationSeconds = todaySessions.reduce((acc, curr) => {
      if (typeof curr.durationSeconds === "number" && curr.durationSeconds > 0) {
        return acc + curr.durationSeconds;
      }
      if (curr.startTime && curr.endTime) {
        const diff = Math.round(
          (new Date(curr.endTime).getTime() - new Date(curr.startTime).getTime()) / 1000
        );
        if (diff > 0) return acc + diff;
      }
      if (curr.status === "active" && curr.startTime) {
        const elapsed = Math.round(
          (Date.now() - new Date(curr.startTime).getTime()) / 1000
        );
        if (elapsed > 0) return acc + elapsed;
      }
      return acc;
    }, 0);

    return NextResponse.json({
      sessions: formatted,
      totalDurationSeconds: totalSeconds,
      todayDurationSeconds,
    });
  } catch (err: any) {
    console.error("Fetch user time-logs error:", err);
    return NextResponse.json(
      { error: "Failed to fetch time logs" },
      { status: 500 }
    );
  }
}
