"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

const categorySchema = z.object({
  code: z
    .string()
    .min(1, "Code is required")
    .max(50, "Code must be at most 50 characters"),
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be at most 100 characters"),
})

export async function createCategory(data: { code: string; name: string }) {
  const parsed = categorySchema.safeParse(data)
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message }
  }

  try {
    await prisma.itemCategory.create({
      data: {
        code: parsed.data.code.trim().toUpperCase(),
        name: parsed.data.name.trim(),
      },
    })
    revalidatePath("/master/categories")
    return { success: true as const }
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return {
        success: false as const,
        error: "A category with this code already exists.",
      }
    }
    return { success: false as const, error: "Failed to create category." }
  }
}

export async function updateCategory(
  id: string,
  data: { code: string; name: string }
) {
  const parsed = categorySchema.safeParse(data)
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message }
  }

  try {
    await prisma.itemCategory.update({
      where: { id },
      data: {
        code: parsed.data.code.trim().toUpperCase(),
        name: parsed.data.name.trim(),
      },
    })
    revalidatePath("/master/categories")
    return { success: true as const }
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return {
        success: false as const,
        error: "A category with this code already exists.",
      }
    }
    return { success: false as const, error: "Failed to update category." }
  }
}

export async function deleteCategory(id: string) {
  try {
    await prisma.itemCategory.delete({
      where: { id },
    })
    revalidatePath("/master/categories")
    return { success: true as const }
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Foreign key constraint")
    ) {
      return {
        success: false as const,
        error: "Cannot delete this category because it is assigned to items.",
      }
    }
    return { success: false as const, error: "Failed to delete category." }
  }
}
