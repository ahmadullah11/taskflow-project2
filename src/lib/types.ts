import { ObjectId } from "mongodb";

export type UserRole = "admin" | "manager" | "member";

export interface UserDoc {
  _id?: ObjectId | string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  title: string;
  avatar?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export type TaskStatus = "Todo" | "In Progress" | "Completed";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface ActiveSessionInfo {
  sessionId: string;
  userId: string;
  userName: string;
  userTitle?: string;
  userAvatar?: string;
  startTime: string | Date; // ISO string or Date
}

export interface TaskDoc {
  _id?: ObjectId | string;
  taskCode: string; // e.g., "TASK-1024"
  title: string;
  description: string;
  /** Optional reference screenshot (compressed data URL or hosted image URL). */
  image?: string | null;
  category: string; // e.g., "Backend Development"
  priority: TaskPriority;
  status: TaskStatus;
  assigneeId?: string | null;
  assignee?: {
    _id: string;
    name: string;
    email: string;
    role: UserRole;
    title: string;
    avatar?: string;
  } | null;
  createdById: string;
  createdBy?: {
    _id: string;
    name: string;
    email: string;
  };
  activeSession?: ActiveSessionInfo | null;
  totalDurationSeconds: number; // accumulated time
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkSessionDoc {
  _id?: ObjectId | string;
  taskId: string;
  taskCode: string;
  taskTitle: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole?: UserRole;
  userTitle: string;
  userAvatar?: string;
  startTime: Date;
  endTime?: Date | null;
  durationSeconds: number;
  status: "active" | "completed";
  summary?: string; // mandatory when ending session
  createdAt: Date;
  updatedAt?: Date;
}

export interface TaskCommentDoc {
  _id?: ObjectId | string;
  /** Stringified task `_id` the comment belongs to. */
  taskId: string;
  userId: string;
  userName: string;
  userEmail?: string;
  userRole?: UserRole;
  userTitle?: string;
  userAvatar?: string;
  content: string;
  /** Stringified `_id` of the parent comment, or null for a top-level comment. */
  parentId?: string | null;
  createdAt: Date;
  updatedAt?: Date;
}

export interface NotificationDoc {
  _id?: ObjectId | string;
  /** Recipient of the notification. */
  userId: string;
  /** User whose action triggered the notification (the commenter). */
  actorId: string;
  actorName: string;
  actorRole?: UserRole;
  /** Stringified task `_id` used for navigation. */
  taskId: string;
  taskCode: string;
  taskTitle?: string;
  commentId: string;
  /** Parent comment id for replies, otherwise null. */
  parentId?: string | null;
  type: "comment" | "reply";
  message: string;
  /** Short snippet of the comment body for the dropdown preview. */
  preview: string;
  isRead: boolean;
  createdAt: Date;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  title: string;
  avatar?: string;
}
