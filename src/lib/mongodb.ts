import { MongoClient, Db, Collection } from "mongodb";
import { UserDoc, TaskDoc, WorkSessionDoc } from "./types";

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/task_tracker_db";
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export async function getDb(): Promise<Db> {
  const c = await clientPromise;
  return c.db();
}

let indexesInitialized = false;

export async function initIndexes() {
  if (indexesInitialized) return;
  try {
    const db = await getDb();
    
    // Users collection indexes
    await db.collection("users").createIndex({ email: 1 }, { unique: true });
    
    // Tasks collection indexes
    await db.collection("tasks").createIndex({ taskCode: 1 }, { unique: true });
    await db.collection("tasks").createIndex({ assigneeId: 1 });
    await db.collection("tasks").createIndex({ status: 1 });
    
    // WorkSessions collection indexes
    await db.collection("workSessions").createIndex({ taskId: 1 });
    await db.collection("workSessions").createIndex({ userId: 1 });
    await db.collection("workSessions").createIndex({ status: 1 });
    await db.collection("workSessions").createIndex({ userId: 1, status: 1 });

    indexesInitialized = true;
  } catch (err) {
    console.error("Index initialization error:", err);
  }
}

export async function getCollection<T extends Record<string, any>>(name: string): Promise<Collection<T>> {
  const db = await getDb();
  await initIndexes();
  return db.collection<T>(name);
}

export async function getUsersCollection(): Promise<Collection<UserDoc>> {
  return getCollection<UserDoc>("users");
}

export async function getTasksCollection(): Promise<Collection<TaskDoc>> {
  return getCollection<TaskDoc>("tasks");
}

export async function getWorkSessionsCollection(): Promise<Collection<WorkSessionDoc>> {
  return getCollection<WorkSessionDoc>("workSessions");
}

export default clientPromise;

/** True when MongoDB rejects a write because of a unique index (E11000). */
export function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: number }).code === 11000
  );
}
