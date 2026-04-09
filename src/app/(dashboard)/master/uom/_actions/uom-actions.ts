"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

const uomSchema = z.object({
  code: z
    .string()
    .min(1, "Code is required")
    .max(20, "Code must be at most 20 characters"),
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be at most 100 characters"),
})

export async function createUom(data: { code: string; name: string }) {
  const parsed = uomSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message }
  }

  try {
    await prisma.uom.create({
      data: {
        code: parsed.data.code.trim().toUpperCase(),
        name: parsed.data.name.trim(),
      },
    })
    revalidatePath("/master/uom")
    return { success: true as const }
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Unique constraint")
    ) {
      return {
        success: false as const,
        error: "A UOM with this code or name already exists.",
      }
    }
    return { success: false as const, error: "Failed to create UOM." }
  }
}

export async function updateUom(
  id: string,
  data: { code: string; name: string }
) {
  const parsed = uomSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message }
  }

  try {
    await prisma.uom.update({
      where: { id },
      data: {
        code: parsed.data.code.trim().toUpperCase(),
        name: parsed.data.name.trim(),
      },
    })
    revalidatePath("/master/uom")
    return { success: true as const }
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Unique constraint")
    ) {
      return {
        success: false as const,
        error: "A UOM with this code or name already exists.",
      }
    }
    return { success: false as const, error: "Failed to update UOM." }
  }
}

export async function deleteUom(id: string) {
  try {
    await prisma.uom.delete({
      where: { id },
    })
    revalidatePath("/master/uom")
    return { success: true as const }
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Foreign key constraint")
    ) {
      return {
        success: false as const,
        error:
          "Cannot delete this UOM because it is being used by items or conversions.",
      }
    }
    return { success: false as const, error: "Failed to delete UOM." }
  }
}
