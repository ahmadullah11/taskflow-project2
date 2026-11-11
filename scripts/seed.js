const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');

async function seed() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/task_tracker_db';
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();

  console.log('Seeding database at:', uri);

  // Clear existing collections if desired
  await db.collection('users').deleteMany({});
  await db.collection('tasks').deleteMany({});
  await db.collection('workSessions').deleteMany({});

  const defaultPassword = await bcrypt.hash('password123', 10);

  const ahmadId = new ObjectId();
  const sarahId = new ObjectId();
  const alexId = new ObjectId();
  const adminId = new ObjectId();

  const users = [
    {
      _id: ahmadId,
      name: 'Ahmad Ullah',
      email: 'ahmad@company.com',
      password: defaultPassword,
      role: 'member',
      title: 'Software Engineer',
      avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Ahmad%20Ullah',
      createdAt: new Date(),
    },
    {
      _id: sarahId,
      name: 'Sarah Jenkins',
      email: 'sarah@company.com',
      password: defaultPassword,
      role: 'manager',
      title: 'Product Manager',
      avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Sarah%20Jenkins',
      createdAt: new Date(),
    },
    {
      _id: alexId,
      name: 'Alex Rivera',
      email: 'alex@company.com',
      password: defaultPassword,
      role: 'member',
      title: 'Senior Frontend Developer',
      avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Alex%20Rivera',
      createdAt: new Date(),
    },
    {
      _id: adminId,
      name: 'System Admin',
      email: 'admin@company.com',
      password: defaultPassword,
      role: 'admin',
      title: 'Platform Administrator',
      avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=System%20Admin',
      createdAt: new Date(),
    },
  ];

  await db.collection('users').insertMany(users);
  console.log(`Inserted ${users.length} users`);

  const task1024Id = new ObjectId();
  const task1025Id = new ObjectId();
  const task1026Id = new ObjectId();
  const task1027Id = new ObjectId();

  const tasks = [
    {
      _id: task1024Id,
      taskCode: 'TASK-1024',
      title: 'Implement User Authentication',
      description: 'Design and implement custom JWT and session management with HTTP-only cookies, password encryption, and robust access controls.',
      category: 'Backend Development',
      priority: 'high',
      status: 'In Progress',
      assigneeId: ahmadId.toString(),
      assignee: {
        _id: ahmadId.toString(),
        name: 'Ahmad Ullah',
        email: 'ahmad@company.com',
        role: 'member',
        title: 'Software Engineer',
        avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Ahmad%20Ullah',
      },
      createdById: sarahId.toString(),
      createdBy: {
        _id: sarahId.toString(),
        name: 'Sarah Jenkins',
        email: 'sarah@company.com',
      },
      activeSession: null,
      totalDurationSeconds: 8100, // 2h 15m
      createdAt: new Date(Date.now() - 86400000 * 2),
      updatedAt: new Date(),
    },
    {
      _id: task1025Id,
      taskCode: 'TASK-1025',
      title: 'Design System Component Audit',
      description: 'Review button hierarchy, modal dialog patterns, typography contrast, and responsive layout transitions across the team platform.',
      category: 'Design System',
      priority: 'medium',
      status: 'Todo',
      assigneeId: alexId.toString(),
      assignee: {
        _id: alexId.toString(),
        name: 'Alex Rivera',
        email: 'alex@company.com',
        role: 'member',
        title: 'Senior Frontend Developer',
        avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Alex%20Rivera',
      },
      createdById: sarahId.toString(),
      createdBy: {
        _id: sarahId.toString(),
        name: 'Sarah Jenkins',
        email: 'sarah@company.com',
      },
      activeSession: null,
      totalDurationSeconds: 0,
      createdAt: new Date(Date.now() - 86400000),
      updatedAt: new Date(),
    },
    {
      _id: task1026Id,
      taskCode: 'TASK-1026',
      title: 'Setup Automated CI/CD Pipelines',
      description: 'Configure GitHub Actions workflows to build Next.js applications, run TypeScript validations, and perform security audits on push.',
      category: 'DevOps',
      priority: 'urgent',
      status: 'Completed',
      assigneeId: ahmadId.toString(),
      assignee: {
        _id: ahmadId.toString(),
        name: 'Ahmad Ullah',
        email: 'ahmad@company.com',
        role: 'member',
        title: 'Software Engineer',
        avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Ahmad%20Ullah',
      },
      createdById: sarahId.toString(),
      createdBy: {
        _id: sarahId.toString(),
        name: 'Sarah Jenkins',
        email: 'sarah@company.com',
      },
      activeSession: null,
      totalDurationSeconds: 14400, // 4 hours
      createdAt: new Date(Date.now() - 86400000 * 4),
      updatedAt: new Date(Date.now() - 86400000 * 3),
    },
    {
      _id: task1027Id,
      taskCode: 'TASK-1027',
      title: 'API Performance & Caching Optimization',
      description: 'Analyze response latency on heavy MongoDB queries, add index optimization, and configure Next.js edge caching strategies.',
      category: 'Backend Development',
      priority: 'low',
      status: 'Todo',
      assigneeId: ahmadId.toString(),
      assignee: {
        _id: ahmadId.toString(),
        name: 'Ahmad Ullah',
        email: 'ahmad@company.com',
        role: 'member',
        title: 'Software Engineer',
        avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Ahmad%20Ullah',
      },
      createdById: adminId.toString(),
      createdBy: {
        _id: adminId.toString(),
        name: 'System Admin',
        email: 'admin@company.com',
      },
      activeSession: null,
      totalDurationSeconds: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  await db.collection('tasks').insertMany(tasks);
  console.log(`Inserted ${tasks.length} tasks`);

  // Initial work session on TASK-1024
  const sessionDate = new Date(Date.now() - 86400000);
  const sessionStart = new Date(sessionDate);
  sessionStart.setHours(14, 0, 0, 0); // 2:00 PM
  const sessionEnd = new Date(sessionDate);
  sessionEnd.setHours(16, 15, 0, 0); // 4:15 PM

  const session = {
    taskId: task1024Id.toString(),
    taskCode: 'TASK-1024',
    taskTitle: 'Implement User Authentication',
    userId: ahmadId.toString(),
    userName: 'Ahmad Ullah',
    userEmail: 'ahmad@company.com',
    userTitle: 'Software Engineer',
    userAvatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Ahmad%20Ullah',
    startTime: sessionStart,
    endTime: sessionEnd,
    durationSeconds: 8100,
    status: 'completed',
    summary: 'Implemented JWT authentication, configured access tokens and refresh tokens, and tested login APIs.',
    createdAt: sessionEnd,
    updatedAt: sessionEnd,
  };

  await db.collection('workSessions').insertOne(session);
  console.log('Inserted sample work session for TASK-1024');

  await client.close();
  console.log('Seeding complete!');
}

seed().catch(console.error);
