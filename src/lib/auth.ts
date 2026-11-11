import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { AuthUser, UserDoc } from "./types";
import { getUsersCollection } from "./mongodb";
import { ObjectId } from "mongodb";

const JWT_SECRET = process.env.JWT_SECRET || "super_secret_task_tracker_jwt_key_2026";
export const AUTH_COOKIE_NAME = "tasktrack_token";

export async function hashPassword(plain: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      title: user.title,
      avatar: user.avatar,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

export function verifyToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    return decoded;
  } catch {
    return null;
  }
}

export async function getCurrentUser(req?: NextRequest): Promise<AuthUser | null> {
  let token: string | undefined;

  if (req) {
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    } else {
      token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
    }
  }

  if (!token) {
    try {
      const cookieStore = await cookies();
      token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    } catch {
      // Not in a server context that supports cookies()
    }
  }

  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload || !payload.id) return null;

  try {
    const usersCol = await getUsersCollection();
    const dbUser = await usersCol.findOne({ _id: new ObjectId(payload.id) });
    if (!dbUser) return null;

    return {
      id: dbUser._id!.toString(),
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role,
      title: dbUser.title,
      avatar: dbUser.avatar,
    };
  } catch (err) {
    console.error("Error retrieving user from db:", err);
    return payload; // fallback to payload if db momentarily fails
  }
}
