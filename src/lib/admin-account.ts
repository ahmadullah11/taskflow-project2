import { getUsersCollection, isDuplicateKeyError } from "./mongodb";
import { hashPassword, verifyPassword } from "./auth";

/** Fixed credentials for the built-in administrator account. */
export const DEFAULT_ADMIN_EMAIL = "admin@admin.com";
export const DEFAULT_ADMIN_PASSWORD = "123456";

/** Old hard-coded administrator account that must no longer be used. */
const LEGACY_ADMIN_EMAIL = "admin@company.com";

/**
 * Makes sure the built-in administrator account exists with the fixed
 * credentials (`admin@admin.com` / `123456`) and the `admin` role.
 *
 * This runs lazily on the login endpoint so a fresh production database gets
 * a working administrator without requiring a manual seed step.
 */
export async function ensureDefaultAdmin(): Promise<void> {
  const usersCol = await getUsersCollection();
  const now = new Date();

  const existing = await usersCol.findOne({ email: DEFAULT_ADMIN_EMAIL });

  if (!existing) {
    const hashedPassword = await hashPassword(DEFAULT_ADMIN_PASSWORD);

    try {
      await usersCol.insertOne({
        name: "Admin",
        email: DEFAULT_ADMIN_EMAIL,
        password: hashedPassword,
        role: "admin",
        title: "Platform Administrator",
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
          "Admin"
        )}`,
        createdAt: now,
        updatedAt: now,
      });
    } catch (err) {
      // A concurrent request may have created the account first.
      if (!isDuplicateKeyError(err)) throw err;
    }
  } else {
    const updates: Record<string, unknown> = {};

    if (existing.role !== "admin") {
      updates.role = "admin";
    }

    const passwordMatches = existing.password
      ? await verifyPassword(DEFAULT_ADMIN_PASSWORD, existing.password)
      : false;

    if (!passwordMatches) {
      updates.password = await hashPassword(DEFAULT_ADMIN_PASSWORD);
    }

    if (Object.keys(updates).length > 0) {
      await usersCol.updateOne(
        { _id: existing._id },
        { $set: { ...updates, updatedAt: now } }
      );
    }
  }

  // Remove the legacy hard-coded admin account once the new one is in place.
  await usersCol.deleteOne({ email: LEGACY_ADMIN_EMAIL, role: "admin" });
}
