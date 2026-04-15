"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { generateTransactionNumber } from "@/lib/transaction-number"

const materialSchema = z.object({
  itemId: z.string().min(1, "Item is required"),
  requiredQuantity: z.number().positive("Quantity must be positive"),
  uomId: z.string().min(1, "UOM is required"),
  notes: z.string().optional(),
})

const outputSchema = z.object({
  itemId: z.string().min(1, "Item is required"),
  targetQuantity: z.number().positive("Quantity must be positive"),
  uomId: z.string().min(1, "UOM is required"),
  notes: z.string().optional(),
})

const createSchema = z.object({
  type: z.enum(["WIP", "FINISHED_GOOD"]),
  description: z.string().optional(),
  plannedStartDate: z.string().optional(),
  plannedEndDate: z.string().optional(),
  notes: z.string().optional(),
  materials: z.array(materialSchema).min(1, "At least one material is required"),
  outputs: z.array(outputSchema).min(1, "At least one output is required"),
})

const updateSchema = z.object({
  type: z.enum(["WIP", "FINISHED_GOOD"]),
  description: z.string().optional(),
  plannedStartDate: z.string().optional(),
  plannedEndDate: z.string().optional(),
  notes: z.string().optional(),
  materials: z.array(materialSchema).min(1, "At least one material is required"),
  outputs: z.array(outputSchema).min(1, "At least one output is required"),
})

export async function createProductionOrder(data: {
  type: "WIP" | "FINISHED_GOOD"
  description?: string
  plannedStartDate?: string
  plannedEndDate?: string
  notes?: string
  materials: { itemId: string; requiredQuantity: number; uomId: string; notes?: string }[]
  outputs: { itemId: string; targetQuantity: number; uomId: string; notes?: string }[]
}) {
  const parsed = createSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message }
  }

  const session = await auth()
  if (!session?.user?.id) {
    return { success: false as const, error: "Unauthorized" }
  }

  try {
    const orderNumber = await generateTransactionNumber("PO")

    const order = await prisma.productionOrder.create({
      data: {
        orderNumber,
        type: parsed.data.type,
        description: parsed.data.description || null,
        plannedStartDate: parsed.data.plannedStartDate
          ? new Date(parsed.data.plannedStartDate)
          : null,
        plannedEndDate: parsed.data.plannedEndDate
          ? new Date(parsed.data.plannedEndDate)
          : null,
        notes: parsed.data.notes || null,
        createdById: session.user.id,
        materials: {
          create: parsed.data.materials.map((m) => ({
            itemId: m.itemId,
            requiredQuantity: m.requiredQuantity,
            uomId: m.uomId,
            notes: m.notes || null,
          })),
        },
        outputs: {
          create: parsed.data.outputs.map((o) => ({
            itemId: o.itemId,
            targetQuantity: o.targetQuantity,
            uomId: o.uomId,
            notes: o.notes || null,
          })),
        },
      },
    })

    redirect(`/production-orders/${order.id}`)
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error
    }
    return { success: false as const, error: "Failed to create production order." }
  }
}

export async function updateProductionOrder(
  id: string,
  data: {
    type: "WIP" | "FINISHED_GOOD"
    description?: string
    plannedStartDate?: string
    plannedEndDate?: string
    notes?: string
    materials: { itemId: string; requiredQuantity: number; uomId: string }[]
    outputs: { itemId: string; targetQuantity: number; uomId: string }[]
  }
) {
  const parsed = updateSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message }
  }

  const session = await auth()
  if (!session?.user?.id) {
    return { success: false as const, error: "Unauthorized" }
  }

  const existing = await prisma.productionOrder.findUnique({ where: { id } })
  if (!existing) {
    return { success: false as const, error: "Production order not found." }
  }
  if (existing.status !== "DRAFT") {
    return {
      success: false as const,
      error: "Only draft orders can be edited.",
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.productionOrderMaterial.deleteMany({
        where: { productionOrderId: id },
      })
      await tx.productionOrderOutput.deleteMany({
        where: { productionOrderId: id },
      })
      await tx.productionOrder.update({
        where: { id },
        data: {
          type: parsed.data.type,
          description: parsed.data.description || null,
          plannedStartDate: parsed.data.plannedStartDate
            ? new Date(parsed.data.plannedStartDate)
            : null,
          plannedEndDate: parsed.data.plannedEndDate
            ? new Date(parsed.data.plannedEndDate)
            : null,
          notes: parsed.data.notes || null,
          materials: {
            create: parsed.data.materials.map((m) => ({
              itemId: m.itemId,
              requiredQuantity: m.requiredQuantity,
              uomId: m.uomId,
            })),
          },
          outputs: {
            create: parsed.data.outputs.map((o) => ({
              itemId: o.itemId,
              targetQuantity: o.targetQuantity,
              uomId: o.uomId,
            })),
          },
        },
      })
    })

    redirect(`/production-orders/${id}`)
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error
    }
    return { success: false as const, error: "Failed to update production order." }
  }
}

export async function startProductionOrder(id: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false as const, error: "Unauthorized" }
  }

  const order = await prisma.productionOrder.findUnique({
    where: { id },
    include: {
      materials: {
        include: {
          item: true,
          uom: true,
        },
      },
    },
  })
  if (!order) {
    return { success: false as const, error: "Production order not found." }
  }
  if (order.status !== "DRAFT") {
    return {
      success: false as const,
      error: "Only draft orders can be started.",
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Reserve material quantities in inventory
      for (const material of order.materials) {
        const requiredQty = Number(material.requiredQuantity)

        // Find all inventory records for this item+uom across all locations
        const inventoryRecords = await tx.inventory.findMany({
          where: {
            itemId: material.itemId,
            uomId: material.uomId,
          },
        })

        // Calculate total available (qty - reservedQty) across all locations
        const totalAvailable = inventoryRecords.reduce(
          (sum, inv) => sum + Number(inv.quantity) - Number(inv.reservedQuantity),
          0
        )

        if (totalAvailable < requiredQty) {
          throw new Error(
            `Insufficient stock for ${material.item.code}. Required: ${requiredQty} ${material.uom.code}, Available: ${totalAvailable.toFixed(4)} ${material.uom.code}`
          )
        }

        // Reserve quantities across inventory records (FIFO by available qty)
        let remaining = requiredQty
        for (const inv of inventoryRecords) {
          if (remaining <= 0) break
          const available = Number(inv.quantity) - Number(inv.reservedQuantity)
          if (available <= 0) continue

          const toReserve = Math.min(available, remaining)
          await tx.inventory.update({
            where: { id: inv.id },
            data: {
              reservedQuantity: { increment: toReserve },
            },
          })
          // Record which production-order material reserved this stock so
          // the inventory UI can show a per-order breakdown.
          await tx.inventoryReservation.upsert({
            where: {
              inventoryId_productionOrderMaterialId: {
                inventoryId: inv.id,
                productionOrderMaterialId: material.id,
              },
            },
            create: {
              inventoryId: inv.id,
              productionOrderMaterialId: material.id,
              quantity: toReserve,
            },
            update: {
              quantity: { increment: toReserve },
            },
          })
          remaining -= toReserve
        }
      }

      // Update production order status
      await tx.productionOrder.update({
        where: { id },
        data: {
          status: "IN_PROGRESS",
          actualStartDate: new Date(),
        },
      })
    })

    revalidatePath(`/production-orders/${id}`)
    return { success: true as const }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Insufficient stock")) {
      return { success: false as const, error: error.message }
    }
    return { success: false as const, error: "Failed to start production order." }
  }
}

export async function completeProductionOrder(id: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false as const, error: "Unauthorized" }
  }

  const order = await prisma.productionOrder.findUnique({
    where: { id },
    include: {
      materials: true,
    },
  })
  if (!order) {
    return { success: false as const, error: "Production order not found." }
  }
  if (order.status !== "IN_PROGRESS") {
    return {
      success: false as const,
      error: "Only in-progress orders can be completed.",
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Release remaining reservations by walking the reservation rows owned
      // by this order's materials (per-PO accuracy; avoids releasing stock
      // held by other production orders).
      for (const material of order.materials) {
        const reservations = await tx.inventoryReservation.findMany({
          where: { productionOrderMaterialId: material.id },
        })
        for (const r of reservations) {
          await tx.inventory.update({
            where: { id: r.inventoryId },
            data: { reservedQuantity: { decrement: r.quantity } },
          })
        }
        await tx.inventoryReservation.deleteMany({
          where: { productionOrderMaterialId: material.id },
        })
      }

      await tx.productionOrder.update({
        where: { id },
        data: {
          status: "COMPLETED",
          actualEndDate: new Date(),
        },
      })
    })

    revalidatePath(`/production-orders/${id}`)
    return { success: true as const }
  } catch {
    return { success: false as const, error: "Failed to complete production order." }
  }
}

export async function cancelProductionOrder(id: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false as const, error: "Unauthorized" }
  }

  const order = await prisma.productionOrder.findUnique({
    where: { id },
    include: {
      materials: true,
    },
  })
  if (!order) {
    return { success: false as const, error: "Production order not found." }
  }
  if (order.status !== "DRAFT" && order.status !== "IN_PROGRESS") {
    return {
      success: false as const,
      error: "Only draft or in-progress orders can be cancelled.",
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Release reserved quantities if order was in progress
      if (order.status === "IN_PROGRESS") {
        for (const material of order.materials) {
          const reservations = await tx.inventoryReservation.findMany({
            where: { productionOrderMaterialId: material.id },
          })
          for (const r of reservations) {
            await tx.inventory.update({
              where: { id: r.inventoryId },
              data: { reservedQuantity: { decrement: r.quantity } },
            })
          }
          await tx.inventoryReservation.deleteMany({
            where: { productionOrderMaterialId: material.id },
          })
        }
      }

      await tx.productionOrder.update({
        where: { id },
        data: {
          status: "CANCELLED",
        },
      })
    })

    revalidatePath(`/production-orders/${id}`)
    return { success: true as const }
  } catch {
    return { success: false as const, error: "Failed to cancel production order." }
  }
}

export async function recordOutput(data: {
  outputId: string
  quantity: number
  locationId: string
  batchLot?: string
}) {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false as const, error: "Unauthorized" }
  }

  if (!data.outputId || data.quantity <= 0) {
    return { success: false as const, error: "Invalid output data." }
  }

  if (!data.locationId) {
    return { success: false as const, error: "Output location is required." }
  }

  const output = await prisma.productionOrderOutput.findUnique({
    where: { id: data.outputId },
    include: {
      productionOrder: true,
      item: { include: { baseUom: true } },
      uom: true,
    },
  })
  if (!output) {
    return { success: false as const, error: "Output record not found." }
  }
  if (output.productionOrder.status !== "IN_PROGRESS") {
    return {
      success: false as const,
      error: "Can only record output for in-progress orders.",
    }
  }

  const batchLot = data.batchLot || ""

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Increment produced quantity on the output record
      await tx.productionOrderOutput.update({
        where: { id: data.outputId },
        data: {
          producedQuantity: { increment: data.quantity },
        },
      })

      // 2. Upsert inventory for the finished good
      await tx.inventory.upsert({
        where: {
          itemId_locationId_batchLot_uomId: {
            itemId: output.itemId,
            locationId: data.locationId,
            batchLot,
            uomId: output.uomId,
          },
        },
        create: {
          itemId: output.itemId,
          locationId: data.locationId,
          batchLot,
          uomId: output.uomId,
          quantity: data.quantity,
        },
        update: {
          quantity: { increment: data.quantity },
        },
      })

      // 3. Create stock movement for audit trail
      await tx.stockMovement.create({
        data: {
          movementType: "PRODUCTION",
          itemId: output.itemId,
          locationId: data.locationId,
          batchLot: batchLot || null,
          quantity: data.quantity,
          uomId: output.uomId,
          quantityInBaseUom: data.quantity, // assuming output UOM is base UOM
          referenceNumber: output.productionOrder.orderNumber,
          notes: `Production output for ${output.productionOrder.orderNumber}`,
        },
      })
    })

    revalidatePath(`/production-orders/${output.productionOrderId}`)
    return { success: true as const }
  } catch {
    return { success: false as const, error: "Failed to record output." }
  }
}
