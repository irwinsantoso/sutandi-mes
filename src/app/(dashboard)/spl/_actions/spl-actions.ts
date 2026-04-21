"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { generateTransactionNumber } from "@/lib/transaction-number"
import { toBaseUom, convertQuantity } from "@/lib/uom-converter"
import { Decimal } from "@prisma/client/runtime/library"

const splMaterialSchema = z.object({
  itemId: z.string().min(1, "Item is required"),
  quantity: z.number().positive("Quantity must be positive"),
  uomId: z.string().min(1, "UOM is required"),
  batchLot: z.string().optional(),
  locationId: z.string().min(1, "Location is required"),
  notes: z.string().optional(),
})

const createSplSchema = z.object({
  date: z.string().min(1, "Date is required"),
  transferFrom: z.string().min(1, "Transfer From is required"),
  transferTo: z.string().min(1, "Transfer To is required"),
  transferToAddress: z.string().optional(),
  preparedBy: z.string().min(1, "Prepared By is required"),
  approvedBy: z.string().optional(),
  receivedBy: z.string().optional(),
  description: z.string().optional(),
  outputItemId: z.string().optional(),
  outputItemName: z.string().min(1, "Output item name is required"),
  outputItemCode: z.string().optional(),
  outputCategoryId: z.string().optional(),
  outputQty: z.number().positive("Output quantity must be positive"),
  outputUomId: z.string().min(1, "Output UOM is required"),
  outputLocationId: z.string().min(1, "Output location is required"),
  materials: z.array(splMaterialSchema).min(1, "At least one material is required"),
})

export async function createDirectWorkOrder(data: {
  date: string
  transferFrom: string
  transferTo: string
  transferToAddress?: string
  preparedBy: string
  approvedBy?: string
  receivedBy?: string
  description?: string
  outputItemId?: string
  outputItemName: string
  outputItemCode?: string
  outputCategoryId?: string
  outputQty: number
  outputUomId: string
  outputLocationId: string
  materials: Array<{
    itemId: string
    quantity: number
    uomId: string
    batchLot?: string
    locationId: string
    notes?: string
  }>
}) {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false as const, error: "Not authenticated" }
  }

  const parsed = createSplSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message }
  }

  const d = parsed.data

  // If no existing item selected and creating new, require code + category
  if (!d.outputItemId && (!d.outputItemCode || !d.outputCategoryId)) {
    return {
      success: false as const,
      error: "For a new output item, item code and category are required.",
    }
  }

  try {
    const orderNumber = await generateTransactionNumber("SPL")
    const materialDetails = await Promise.all(
      d.materials.map(async (mat) => {
        const quantityInBaseUom = await toBaseUom(
          mat.itemId,
          mat.uomId,
          new Decimal(mat.quantity)
        )
        return { ...mat, quantityInBaseUom }
      })
    )

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.directWorkOrder.create({
        data: {
          orderNumber,
          date: new Date(d.date),
          transferFrom: d.transferFrom,
          transferTo: d.transferTo,
          transferToAddress: d.transferToAddress || null,
          preparedBy: d.preparedBy,
          approvedBy: d.approvedBy || null,
          receivedBy: d.receivedBy || null,
          description: d.description || null,
          outputItemId: d.outputItemId || null,
          outputItemName: d.outputItemName,
          outputItemCode: d.outputItemCode || null,
          outputCategoryId: d.outputCategoryId || null,
          outputQty: new Decimal(d.outputQty),
          outputUomId: d.outputUomId,
          outputLocationId: d.outputLocationId,
          status: "DRAFT",
          createdById: session.user.id,
          materials: {
            create: materialDetails.map((mat) => ({
              itemId: mat.itemId,
              quantity: new Decimal(mat.quantity),
              uomId: mat.uomId,
              quantityInBaseUom: mat.quantityInBaseUom,
              batchLot: mat.batchLot || null,
              locationId: mat.locationId,
              notes: mat.notes || null,
            })),
          },
        },
        select: { id: true },
      })
      return order
    })

    revalidatePath("/spl")
    redirect(`/spl/${result.id}`)
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to create SPL.",
    }
  }
}

export async function confirmDirectWorkOrder(id: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false as const, error: "Not authenticated" }
  }

  try {
    const order = await prisma.directWorkOrder.findUniqueOrThrow({
      where: { id },
      include: {
        materials: {
          include: {
            item: { select: { baseUomId: true, name: true, code: true } },
          },
        },
        outputUom: true,
      },
    })

    if (order.status !== "DRAFT") {
      return { success: false as const, error: "Only DRAFT orders can be confirmed." }
    }

    // Check available stock for each material
    const stockErrors: string[] = []
    for (const mat of order.materials) {
      const invRecords = await prisma.inventory.findMany({
        where: {
          itemId: mat.itemId,
          locationId: mat.locationId,
          ...(mat.batchLot ? { batchLot: mat.batchLot } : {}),
        },
      })

      let available = new Decimal(0)
      for (const inv of invRecords) {
        const qtyBase = await convertQuantity(
          mat.itemId, inv.uomId, mat.item.baseUomId, new Decimal(inv.quantity)
        )
        const resBase = await convertQuantity(
          mat.itemId, inv.uomId, mat.item.baseUomId, new Decimal(inv.reservedQuantity)
        )
        available = available.plus(qtyBase.minus(resBase))
      }

      if (available.lessThan(mat.quantityInBaseUom)) {
        stockErrors.push(
          `Insufficient stock for ${mat.item.code} – ${mat.item.name}: ` +
          `required ${mat.quantityInBaseUom}, available ${available.toFixed()}`
        )
      }
    }
    if (stockErrors.length > 0) {
      return { success: false as const, error: stockErrors.join("; ") }
    }

    let outputItemId = order.outputItemId

    if (!outputItemId) {
      const existingItem = await prisma.item.findUnique({
        where: { code: order.outputItemCode! },
      })

      if (existingItem) {
        outputItemId = existingItem.id
      } else {
        const newItem = await prisma.item.create({
          data: {
            code: order.outputItemCode!,
            name: order.outputItemName,
            categoryId: order.outputCategoryId!,
            baseUomId: order.outputUomId,
            isActive: true,
          },
        })
        outputItemId = newItem.id
      }

      await prisma.directWorkOrder.update({
        where: { id },
        data: { outputItemId },
      })
    }
    await prisma.$transaction(async (tx) => {
      // 1. Consume each material via FIFO
      for (const mat of order.materials) {
        const invRecords = await tx.inventory.findMany({
          where: {
            itemId: mat.itemId,
            locationId: mat.locationId,
            ...(mat.batchLot ? { batchLot: mat.batchLot } : {}),
          },
          orderBy: { updatedAt: "asc" },
        })

        let remaining = new Decimal(mat.quantityInBaseUom)
        for (const inv of invRecords) {
          if (remaining.lessThanOrEqualTo(0)) break
          const invQtyBase = await convertQuantity(
            mat.itemId, inv.uomId, mat.item.baseUomId, new Decimal(inv.quantity)
          )
          const decrementBase = Decimal.min(remaining, invQtyBase)
          const decrementNative = await convertQuantity(
            mat.itemId, mat.item.baseUomId, inv.uomId, decrementBase
          )

          await tx.inventory.update({
            where: { id: inv.id },
            data: { quantity: { decrement: decrementNative } },
          })
          remaining = remaining.minus(decrementBase)
        }

        await tx.stockMovement.create({
          data: {
            movementType: "PRODUCTION",
            itemId: mat.itemId,
            locationId: mat.locationId,
            batchLot: mat.batchLot || null,
            quantity: new Decimal(mat.quantity).negated(),
            uomId: mat.uomId,
            quantityInBaseUom: new Decimal(mat.quantityInBaseUom).negated(),
            referenceNumber: order.orderNumber,
            notes: `SPL material consumption: ${order.orderNumber}`,
          },
        })
      }


      // 3. Add output to inventory (upsert)
      const outputQtyBase = await toBaseUom(
        outputItemId,
        order.outputUomId,
        new Decimal(order.outputQty)
      )


      const existingInv = await tx.inventory.findFirst({
        where: {
          itemId: outputItemId,
          locationId: order.outputLocationId,
          batchLot: "",
          uomId: order.outputUomId,
        },
      })

      if (existingInv) {
        await tx.inventory.update({
          where: { id: existingInv.id },
          data: { quantity: { increment: new Decimal(order.outputQty) } },
        })
      } else {
        await tx.inventory.create({
          data: {
            itemId: outputItemId,
            locationId: order.outputLocationId,
            batchLot: "",
            uomId: order.outputUomId,
            quantity: new Decimal(order.outputQty),
            reservedQuantity: new Decimal(0),
          },
        })
      }

      await tx.stockMovement.create({
        data: {
          movementType: "PRODUCTION",
          itemId: outputItemId,
          locationId: order.outputLocationId,
          batchLot: null,
          quantity: new Decimal(order.outputQty),
          uomId: order.outputUomId,
          quantityInBaseUom: outputQtyBase,
          referenceNumber: order.orderNumber,
          notes: `SPL output production: ${order.orderNumber}`,
        },
      })

      // 4. Update order status
      await tx.directWorkOrder.update({
        where: { id },
        data: { status: "CONFIRMED" },
      })
    })

    revalidatePath("/spl")
    revalidatePath(`/spl/${id}`)
    revalidatePath("/inventory")
    revalidatePath("/inventory/summary")
    return { success: true as const }
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to confirm SPL.",
    }
  }
}

export async function cancelDirectWorkOrder(id: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false as const, error: "Not authenticated" }
  }

  try {
    const order = await prisma.directWorkOrder.findUniqueOrThrow({
      where: { id },
      select: { status: true },
    })

    if (order.status !== "DRAFT") {
      return { success: false as const, error: "Only DRAFT orders can be cancelled." }
    }

    await prisma.directWorkOrder.update({
      where: { id },
      data: { status: "CANCELLED" },
    })

    revalidatePath("/spl")
    revalidatePath(`/spl/${id}`)
    return { success: true as const }
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to cancel SPL.",
    }
  }
}
