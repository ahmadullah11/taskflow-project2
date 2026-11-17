import { getCategoriesCollection, isDuplicateKeyError } from "./mongodb";
import { CategoryDoc } from "./types";

/**
 * Default categories seeded into the database when the collection is empty.
 */
export const DEFAULT_CATEGORIES: readonly string[] = [
  "Backend Development",
  "Frontend Development",
  "Design System",
  "DevOps",
  "Quality Assurance",
  "Product Discovery",
] as const;

/**
 * Seeds the database automatically with the 6 default categories if the
 * categories collection is currently empty.
 */
export async function ensureDefaultCategories(): Promise<void> {
  const col = await getCategoriesCollection();
  const count = await col.countDocuments();

  if (count === 0) {
    const now = new Date();
    const docs: CategoryDoc[] = DEFAULT_CATEGORIES.map((name) => ({
      name,
      createdAt: now,
      updatedAt: now,
    }));

    try {
      await col.insertMany(docs, { ordered: false });
    } catch (err) {
      if (!isDuplicateKeyError(err)) {
        console.error("Error seeding default categories:", err);
      }
    }
  }
}
