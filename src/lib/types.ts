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

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  title: string;
  avatar?: string;
}
