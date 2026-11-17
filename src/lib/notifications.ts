import { getNotificationsCollection } from "./mongodb";
import { AuthUser, NotificationDoc } from "./types";

interface TaskAssignmentNotificationInput {
  recipientId: string;
  actor: AuthUser;
  taskId: string;
  taskCode: string;
  taskTitle: string;
  message: string;
}

/**
 * Creates an in-app notification telling a user they were assigned a task.
 *
 * Notifications are best-effort: a failure here is logged but never blocks the
 * task create/update request that triggered it.
 */
export async function createTaskAssignmentNotification({
  recipientId,
  actor,
  taskId,
  taskCode,
  taskTitle,
  message,
}: TaskAssignmentNotificationInput): Promise<void> {
  // Assigning a task to yourself should not notify you about your own action.
  if (!recipientId || recipientId === actor.id) return;

  try {
    const notificationsCol = await getNotificationsCollection();
    const notification: NotificationDoc = {
      userId: recipientId,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      taskId,
      taskCode,
      taskTitle,
      type: "assignment",
      message,
      isRead: false,
      createdAt: new Date(),
    };

    await notificationsCol.insertOne(notification);
  } catch (err) {
    console.error("Create task assignment notification error:", err);
  }
}
