import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getWorkSessionsCollection } from "@/lib/mongodb";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ user: null, activeSession: null });
    }

    const sessionsCol = await getWorkSessionsCollection();
    const activeSession = await sessionsCol.findOne({
      userId: user.id,
      status: "active",
    });

    return NextResponse.json({
      user,
      activeSession: activeSession
        ? {
            ...activeSession,
            _id: activeSession._id!.toString(),
          }
        : null,
    });
  } catch (err: any) {
    console.error("Auth me error:", err);
    return NextResponse.json({ user: null, activeSession: null });
  }
}
