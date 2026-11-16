import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getNotificationsCollection } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";

const MAX_NOTIFICATIONS = 50;

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required to view notifications." },
        { status: 401 }
      );
    }

    const notificationsCol = await getNotificationsCollection();

    const [notifications, unreadCount] = await Promise.all([
      notificationsCol
        .find({ userId: user.id })
        .sort({ createdAt: -1 })
        .limit(MAX_NOTIFICATIONS)
        .toArray(),
      notificationsCol.countDocuments({ userId: user.id, isRead: false }),
    ]);

    return NextResponse.json({
      notifications: notifications.map((notification) => ({
        ...notification,
        _id: notification._id!.toString(),
      })),
      unreadCount,
    });
  } catch (err) {
    console.error("Fetch notifications error:", err);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }

    const { id, all, isRead = true } = body as {
      id?: unknown;
      all?: unknown;
      isRead?: unknown;
    };

    if (typeof isRead !== "boolean") {
      return NextResponse.json(
        { error: "isRead must be a boolean." },
        { status: 400 }
      );
    }

    const notificationsCol = await getNotificationsCollection();
    let updatedCount = 0;

    if (all === true) {
      const result = await notificationsCol.updateMany(
        { userId: user.id, isRead: false },
        { $set: { isRead } }
      );
      updatedCount = result.modifiedCount;
    } else {
      if (
        typeof id !== "string" ||
        id.length !== 24 ||
        !ObjectId.isValid(id)
      ) {
        return NextResponse.json(
          { error: "A valid notification id is required." },
          { status: 400 }
        );
      }

      const result = await notificationsCol.updateOne(
        { _id: new ObjectId(id), userId: user.id },
        { $set: { isRead } }
      );

      if (result.matchedCount === 0) {
        return NextResponse.json(
          { error: "Notification not found." },
          { status: 404 }
        );
      }
      updatedCount = result.modifiedCount;
    }

    const unreadCount = await notificationsCol.countDocuments({
      userId: user.id,
      isRead: false,
    });

    return NextResponse.json({
      message:
        all === true
          ? "All notifications marked as read."
          : "Notification updated.",
      updatedCount,
      unreadCount,
    });
  } catch (err) {
    console.error("Update notifications error:", err);
    return NextResponse.json(
      { error: "Failed to update notifications" },
      { status: 500 }
    );
  }
}
