# Task Tracking & Time Logging System

A production-ready Task Tracking and Time Logging System built with **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS**, and **native MongoDB driver (no ORM)**.

---

## 🚀 Features & Architecture

### 1. Task Assignment & Management
- Tasks feature an `assignee` field representing a designated team member.
- Administrators can create tasks, edit every field (title, description, category, priority, status, assignee), reassign, and delete any task.
- Members can create self-assigned tasks and move their own tasks through `Todo`, `In Progress`, and `Completed`.
- Unique task codes (e.g. `TASK-1024`, `TASK-1025`) auto-generated.

### 1b. Admin User Management (`/users`)
- Admins can **add** team members (name, email, role, title, password).
- Admins can **update** any member's name, email, role, title, or reset their password.
- Admins can **delete** members. Tasks assigned to a deleted member become unassigned; their past work logs stay in the timesheet for history.
- Safety rails: you cannot delete your own account, demote/remove the last admin, or delete a member who currently has a running timer.


### 2. Time Tracking & Working Sessions
- **Assignee Authorization:** Only the assigned team member can start or stop their work session.
- **Single Active Session Rule:** Prevents a member from running concurrent active sessions across different tasks.
- **Durability Across Browser Refreshes:** Active session timestamps are saved in MongoDB (UTC). If the page is refreshed or browser restarted, the timer recalculates seamlessly from the backend `startTime`.
- **Live Navbar Indicator:** A persistent ticking badge in the top navigation bar displays the current session duration and active task code, allowing 1-click return to the task.

### 3. Log Modal on Stop
- Clicking `End / Finish Task` opens a popup modal.
- Displays elapsed session time (e.g. `02:15:30` / `2h 15m`).
- **Mandatory Progress Report:** Requires a descriptive report ("What did you accomplish during these hours?").
- Optional 1-click checkbox: `Mark task as Completed`.

### 4. Work History & Timesheets
- Every task details page includes a **Work History** section showing:
  - Team member avatar, name, and role.
  - Date formatted in user's local timezone (e.g., `November 10, 2026`).
  - Exact time window (e.g., `2:00 PM – 4:15 PM`).
  - Total duration (e.g., `2h 15m`).
  - Mandatory written progress summary.
- Global **Team Timesheet** page (`/timesheet`) aggregating time logs across all members and tasks.

---

## 🗄️ Database Structure (Native MongoDB - No ORM)

### `tasks` Collection
```typescript
{
  _id: ObjectId,
  taskCode: "TASK-1024",
  title: "Implement User Authentication",
  description: "Design and implement custom JWT...",
  category: "Backend Development",
  priority: "high", // "low" | "medium" | "high" | "urgent"
  status: "In Progress", // "Todo" | "In Progress" | "Completed"
  assigneeId: "673...",
  assignee: {
    _id: "673...",
    name: "Ahmad Ullah",
    email: "ahmad@company.com",
    role: "member",
    title: "Software Engineer"
  },
  createdById: "673...",
  activeSession: { ... } | null,
  totalDurationSeconds: 8100,
  createdAt: ISODate,
  updatedAt: ISODate
}
```

### `workSessions` Collection
```typescript
{
  _id: ObjectId,
  taskId: "673...",
  taskCode: "TASK-1024",
  taskTitle: "Implement User Authentication",
  userId: "673...",
  userName: "Ahmad Ullah",
  userEmail: "ahmad@company.com",
  userTitle: "Software Engineer",
  startTime: ISODate,
  endTime: ISODate,
  durationSeconds: 8100,
  status: "completed", // "active" | "completed"
  summary: "Implemented JWT authentication, configured access tokens...",
  createdAt: ISODate,
  updatedAt: ISODate
}
```

### `users` Collection
```typescript
{
  _id: ObjectId,
  name: "Ahmad Ullah",
  email: "ahmad@company.com",
  password: "<bcrypt_hash>",
  role: "member", // "member" | "manager" | "admin"
  title: "Software Engineer",
  createdAt: ISODate
}
```

---

## 🔐 Authentication & Quick Demo Profiles

Custom authentication using bcrypt password hashing and HTTP-only JWT cookies (`tasktrack_token`).

### Seeded Demo Accounts (Password: `password123`)
| Name | Email | Role | Title |
|------|-------|------|-------|
| **Ahmad Ullah** | `ahmad@company.com` | Member | Software Engineer |
| **Sarah Jenkins** | `sarah@company.com` | Manager | Product Manager |
| **Alex Rivera** | `alex@company.com` | Member | Senior Frontend Developer |
| **System Admin** | `admin@company.com` | Admin | Platform Administrator |

> 💡 *The app includes a 1-Click Profile Switcher in the top right user menu and the login screen for instant evaluation.*

---

## ⚙️ Environment Variables (`.env.local`)

```env
# MongoDB Connection String (Local or MongoDB Atlas)
MONGODB_URI=mongodb://127.0.0.1:27017/task_tracker_db

# JWT Secret for Custom Authentication
JWT_SECRET=super_secret_production_key_change_in_env_2026

# App Settings
NEXT_PUBLIC_APP_NAME="TaskTrack & Time Logging"
```

---

## 🛠️ Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Seed demo data (Users, Tasks, Work History):**
   ```bash
   npm run seed
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```
   Or production build:
   ```bash
   npm run build
   npm run start
   ```

4. Open `http://localhost:3000` (or configured port) in your browser.
