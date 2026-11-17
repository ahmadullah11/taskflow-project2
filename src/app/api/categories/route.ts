import { NextRequest, NextResponse } from "next/server";
import { getCategoriesCollection, isDuplicateKeyError } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { ensureDefaultCategories } from "@/lib/categories";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * GET /api/categories
 * Accessible to all authenticated users so dropdowns populate dynamically.
 * Automatically seeds the 6 default categories if the collection is empty.
 * Returns categories sorted alphabetically.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required to view categories." },
        { status: 401 }
      );
    }

    // Automatically seed default categories if the collection is empty
    await ensureDefaultCategories();

    const categoriesCol = await getCategoriesCollection();
    const categories = await categoriesCol
      .find({})
      .sort({ name: 1 })
      .toArray();

    const formatted = categories.map((c) => ({
      _id: c._id!.toString(),
      id: c._id!.toString(),
      name: c.name,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));

    return NextResponse.json({ categories: formatted });
  } catch (err) {
    console.error("Fetch categories error:", err);
    return NextResponse.json(
      { error: "Failed to fetch categories." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/categories
 * Admin-only: Create a new category/project name (validated against duplicates).
 * Returns 403 Forbidden for non-admin users.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    if (user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Only administrators can create categories." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const rawName = body?.name;

    if (!rawName || typeof rawName !== "string" || !rawName.trim()) {
      return NextResponse.json(
        { error: "Category name is required." },
        { status: 400 }
      );
    }

    const cleanName = rawName.trim();
    if (cleanName.length > 80) {
      return NextResponse.json(
        { error: "Category name cannot exceed 80 characters." },
        { status: 400 }
      );
    }

    const categoriesCol = await getCategoriesCollection();

    // Check for case-insensitive duplicate
    const existing = await categoriesCol.findOne({
      name: { $regex: `^${escapeRegex(cleanName)}$`, $options: "i" },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Category "${existing.name}" already exists.` },
        { status: 409 }
      );
    }

    const now = new Date();
    try {
      const result = await categoriesCol.insertOne({
        name: cleanName,
        createdAt: now,
        updatedAt: now,
      });

      return NextResponse.json(
        {
          category: {
            _id: result.insertedId.toString(),
            id: result.insertedId.toString(),
            name: cleanName,
            createdAt: now,
            updatedAt: now,
          },
        },
        { status: 201 }
      );
    } catch (insertErr) {
      if (isDuplicateKeyError(insertErr)) {
        return NextResponse.json(
          { error: "A category with this name already exists." },
          { status: 409 }
        );
      }
      throw insertErr;
    }
  } catch (err) {
    console.error("Create category error:", err);
    return NextResponse.json(
      { error: "Failed to create category." },
      { status: 500 }
    );
  }
}
