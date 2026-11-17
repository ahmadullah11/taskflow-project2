import { TaskDoc, AuthUser } from "./types";

/**
 * Edit Ownership Rule (canEditTask):
 * A user can edit a task only if:
 * 1. `task.createdById === currentUser.id` (the user who created/assigned the task) OR
 * 2. `currentUser.role === 'admin'` (case-insensitive)
 *
 * If a user is only the assignee (`task.assigneeId === currentUser.id`) and
 * did not create the task, `canEditTask` MUST be false.
 */
export function canEditTask(
  task: Pick<TaskDoc, "createdById" | "assigneeId"> | null | undefined,
  currentUser: Pick<AuthUser, "id" | "role"> | null | undefined
): boolean {
  if (!task || !currentUser) {
    return false;
  }

  // Administrators always have full edit permissions
  if (currentUser.role?.toLowerCase() === "admin") {
    return true;
  }

  // The task creator / assigner can edit their task
  if (
    currentUser.id &&
    task.createdById &&
    String(task.createdById) === String(currentUser.id)
  ) {
    return true;
  }

  // Otherwise (including pure assignee), edit permission is denied
  return false;
}
