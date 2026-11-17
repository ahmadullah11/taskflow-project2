import { NextRequest, NextResponse } from "next/server";
import {
  getCategoriesCollection,
  getTasksCollection,
  isDuplicateKeyError,
} from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { ObjectId } from "mongodb";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * PATCH /api/categories/[id]
 * Admin-only: Rename an existing category/project.
 * Also updates existing tasks referencing the old category name so nothing breaks.
 */
export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
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
        { error: "Forbidden: Only administrators can update categories." },
        { status: 403 }
      );
    }

    const { id } = await props.params;
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid category ID." },
        { status: 400 }
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
    const categoryObjectId = new ObjectId(id);

    const existingCategory = await categoriesCol.findOne({ _id: categoryObjectId });
    if (!existingCategory) {
      return NextResponse.json(
        { error: "Category not found." },
        { status: 404 }
      );
    }

    const oldName = existingCategory.name;

    // Check for another category with the same name (case-insensitive)
    const duplicate = await categoriesCol.findOne({
      _id: { $ne: categoryObjectId },
      name: { $regex: `^${escapeRegex(cleanName)}$`, $options: "i" },
    });

    if (duplicate) {
      return NextResponse.json(
        { error: `Another category named "${duplicate.name}" already exists.` },
        { status: 409 }
      );
    }

    const now = new Date();
    try {
      await categoriesCol.updateOne(
        { _id: categoryObjectId },
        { $set: { name: cleanName, updatedAt: now } }
      );

      // Update existing tasks that use the old category name so nothing breaks
      if (oldName !== cleanName) {
        const tasksCol = await getTasksCollection();
        await tasksCol.updateMany(
          { category: oldName },
          { $set: { category: cleanName, updatedAt: now } }
        );
      }

      return NextResponse.json({
        category: {
          _id: categoryObjectId.toString(),
          id: categoryObjectId.toString(),
          name: cleanName,
          createdAt: existingCategory.createdAt,
          updatedAt: now,
        },
      });
    } catch (updateErr) {
      if (isDuplicateKeyError(updateErr)) {
        return NextResponse.json(
          { error: "A category with this name already exists." },
          { status: 409 }
        );
      }
      throw updateErr;
    }
  } catch (err) {
    console.error("Update category error:", err);
    return NextResponse.json(
      { error: "Failed to update category." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/categories/[id]
 * Admin-only: Delete a category/project from the database.
 */
export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
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
        { error: "Forbidden: Only administrators can delete categories." },
        { status: 403 }
      );
    }

    const { id } = await props.params;
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid category ID." },
        { status: 400 }
      );
    }

    const categoriesCol = await getCategoriesCollection();
    const categoryObjectId = new ObjectId(id);

    const existingCategory = await categoriesCol.findOne({ _id: categoryObjectId });
    if (!existingCategory) {
      return NextResponse.json(
        { error: "Category not found." },
        { status: 404 }
      );
    }

    await categoriesCol.deleteOne({ _id: categoryObjectId });

    return NextResponse.json({
      message: "Category deleted successfully.",
      deletedId: id,
    });
  } catch (err) {
    console.error("Delete category error:", err);
    return NextResponse.json(
      { error: "Failed to delete category." },
      { status: 500 }
    );
  }
}
