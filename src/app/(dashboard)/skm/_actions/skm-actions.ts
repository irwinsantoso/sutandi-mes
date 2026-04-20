"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { generateTransactionNumber } from "@/lib/transaction-number"
import { Decimal } from "@prisma/client/runtime/library"

const skmItemSchema = z.object({
  lineNumber: z.number().int().positive(),
  itemCode: z.string().min(1, "Item code is required"),
  itemName: z.string().min(1, "Item name is required"),
  qtyRequired: z.number().positive("Required quantity must be positive"),
  qtyBuy: z.number().nonnegative().optional(),
  qtyStock: z.number().nonnegative().optional(),
  uom: z.string().min(1, "UOM is required"),
  departmentName: z.string().optional(),
  notes: z.string().optional(),
})

const createSkmSchema = z.object({
  requestDate: z.string().min(1, "Request date is required"),
  notes: z.string().optional(),
  items: z.array(skmItemSchema).min(1, "At least one item is required"),
})

export async function createMaterialRequest(data: {
  requestDate: string
  notes?: string
  items: Array<{
    lineNumber: number
    itemCode: string
    itemName: string
    qtyRequired: number
    qtyBuy?: number
    qtyStock?: number
    uom: string
    departmentName?: string
    notes?: string
  }>
}) {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false as const, error: "Not authenticated" }
  }

  const parsed = createSkmSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message }
  }

  const { requestDate, notes, items } = parsed.data

  try {
    const requestNumber = await generateTransactionNumber("SKM")

    const result = await prisma.materialRequest.create({
      data: {
        requestNumber,
        requestDate: new Date(requestDate),
        notes: notes || null,
        status: "DRAFT",
        createdById: session.user.id,
        items: {
          create: items.map((item) => ({
            lineNumber: item.lineNumber,
            itemCode: item.itemCode,
            itemName: item.itemName,
            qtyRequired: new Decimal(item.qtyRequired),
            qtyBuy: item.qtyBuy != null ? new Decimal(item.qtyBuy) : null,
            qtyStock: item.qtyStock != null ? new Decimal(item.qtyStock) : null,
            uom: item.uom,
            departmentName: item.departmentName || null,
            notes: item.notes || null,
          })),
        },
      },
      select: { id: true },
    })

    revalidatePath("/skm")
    redirect(`/skm/${result.id}`)
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error
    }
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to create material request.",
    }
  }
}

export async function confirmMaterialRequest(id: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false as const, error: "Not authenticated" }
  }

  try {
    const request = await prisma.materialRequest.findUniqueOrThrow({
      where: { id },
      select: { status: true },
    })

    if (request.status !== "DRAFT") {
      return { success: false as const, error: "Only DRAFT requests can be confirmed." }
    }

    await prisma.materialRequest.update({
      where: { id },
      data: { status: "CONFIRMED" },
    })

    revalidatePath("/skm")
    revalidatePath(`/skm/${id}`)
    return { success: true as const }
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to confirm request.",
    }
  }
}

export async function cancelMaterialRequest(id: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false as const, error: "Not authenticated" }
  }

  try {
    const request = await prisma.materialRequest.findUniqueOrThrow({
      where: { id },
      select: { status: true },
    })

    if (request.status !== "DRAFT") {
      return { success: false as const, error: "Only DRAFT requests can be cancelled." }
    }

    await prisma.materialRequest.update({
      where: { id },
      data: { status: "CANCELLED" },
    })

    revalidatePath("/skm")
    revalidatePath(`/skm/${id}`)
    return { success: true as const }
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to cancel request.",
    }
  }
}
