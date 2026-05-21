"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { generateTransactionNumber } from "@/lib/transaction-number"
import { toBaseUom, convertQuantity } from "@/lib/uom-converter"
import { Decimal } from "@prisma/client/runtime/library"

const returItemSchema = z.object({
  itemId: z.string().min(1, "Item is required"),
  quantity: z.number().positive("Quantity must be positive"),
  uomId: z.string().min(1, "UOM is required"),
  batchLot: z.string().optional(),
  locationId: z.string().min(1, "Location is required"),
  notes: z.string().optional(),
})

const createReturOutboundSchema = z.object({
  projectName: z.string().optional(),
  supplierName: z.string().optional(),
  issueDate: z.string().min(1, "Issue date is required"),
  notes: z.string().optional(),
  items: z.array(returItemSchema).min(1, "At least one item is required"),
})

export async function createReturOutbound(data: {
  projectName?: string
  supplierName?: string
  issueDate: string
  notes?: string
  items: Array<{
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

  const parsed = createReturOutboundSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message }
  }

  const d = parsed.data

  try {
    const transactionNumber = await generateTransactionNumber("RO")

    const itemDetails = await Promise.all(
      d.items.map(async (item) => {
        const quantityInBaseUom = await toBaseUom(
          item.itemId,
          item.uomId,
          new Decimal(item.quantity)
        )
        return { ...item, quantityInBaseUom }
      })
    )

    const result = await prisma.outboundTransaction.create({
      data: {
        transactionNumber,
        kind: "RETUR",
        projectName: d.projectName || null,
        supplierName: d.supplierName || null,
        purpose: "RETUR_TO_SUPPLIER",
        issueDate: new Date(d.issueDate),
        notes: d.notes || null,
        status: "DRAFT",
        createdById: session.user.id,
        items: {
          create: itemDetails.map((item) => ({
            itemId: item.itemId,
            quantity: new Decimal(item.quantity),
            uomId: item.uomId,
            quantityInBaseUom: item.quantityInBaseUom,
            batchLot: item.batchLot || null,
            locationId: item.locationId,
            notes: item.notes || null,
          })),
        },
      },
      select: { id: true },
    })

    revalidatePath("/retur-outbound")
    redirect(`/retur-outbound/${result.id}`)
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to create retur outbound.",
    }
  }
}

export async function confirmReturOutbound(id: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false as const, error: "Not authenticated" }
  }

  try {
    const transaction = await prisma.outboundTransaction.findUniqueOrThrow({
      where: { id },
      include: {
        items: {
          include: {
            item: { select: { baseUomId: true, name: true, code: true } },
          },
        },
      },
    })

    if (transaction.kind !== "RETUR") {
      return { success: false as const, error: "Not a retur transaction." }
    }
    if (transaction.status !== "DRAFT") {
      return { success: false as const, error: "Only DRAFT transactions can be confirmed." }
    }

    const stockErrors: string[] = []
    for (const item of transaction.items) {
      const invRecords = await prisma.inventory.findMany({
        where: {
          itemId: item.itemId,
          locationId: item.locationId,
          ...(item.batchLot ? { batchLot: item.batchLot } : {}),
        },
      })

      let available = new Decimal(0)
      for (const inv of invRecords) {
        const qtyBase = await convertQuantity(
          item.itemId, inv.uomId, item.item.baseUomId, new Decimal(inv.quantity)
        )
        const resBase = await convertQuantity(
          item.itemId, inv.uomId, item.item.baseUomId, new Decimal(inv.reservedQuantity)
        )
        available = available.plus(qtyBase.minus(resBase))
      }

      if (available.lessThan(item.quantityInBaseUom)) {
        stockErrors.push(
          `Stok tidak cukup untuk ${item.item.code} – ${item.item.name}: ` +
          `dibutuhkan ${item.quantityInBaseUom}, tersedia ${available.toFixed()}`
        )
      }
    }
    if (stockErrors.length > 0) {
      return { success: false as const, error: stockErrors.join("; ") }
    }

    await prisma.$transaction(async (tx) => {
      for (const item of transaction.items) {
        const invRecords = await tx.inventory.findMany({
          where: {
            itemId: item.itemId,
            locationId: item.locationId,
            ...(item.batchLot ? { batchLot: item.batchLot } : {}),
          },
          orderBy: { updatedAt: "asc" },
        })

        let remaining = new Decimal(item.quantityInBaseUom)
        for (const inv of invRecords) {
          if (remaining.lessThanOrEqualTo(0)) break
          const invQtyBase = await convertQuantity(
            item.itemId, inv.uomId, item.item.baseUomId, new Decimal(inv.quantity)
          )
          const decrementBase = Decimal.min(remaining, invQtyBase)
          const decrementNative = await convertQuantity(
            item.itemId, item.item.baseUomId, inv.uomId, decrementBase
          )

          await tx.inventory.update({
            where: { id: inv.id },
            data: { quantity: { decrement: decrementNative } },
          })
          remaining = remaining.minus(decrementBase)
        }

        await tx.stockMovement.create({
          data: {
            movementType: "OUTBOUND",
            itemId: item.itemId,
            locationId: item.locationId,
            batchLot: item.batchLot || null,
            quantity: new Decimal(item.quantity).negated(),
            uomId: item.uomId,
            quantityInBaseUom: new Decimal(item.quantityInBaseUom).negated(),
            outboundTransactionItemId: item.id,
            referenceNumber: transaction.transactionNumber,
            notes: `Retur outbound ke supplier: ${transaction.transactionNumber}`,
          },
        })
      }

      await tx.outboundTransaction.update({
        where: { id },
        data: { status: "CONFIRMED" },
      })
    })

    revalidatePath("/retur-outbound")
    revalidatePath(`/retur-outbound/${id}`)
    revalidatePath("/inventory")
    revalidatePath("/inventory/summary")
    return { success: true as const }
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to confirm retur.",
    }
  }
}

export async function cancelReturOutbound(id: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false as const, error: "Not authenticated" }
  }

  try {
    const transaction = await prisma.outboundTransaction.findUniqueOrThrow({
      where: { id },
      select: { status: true, kind: true },
    })

    if (transaction.kind !== "RETUR") {
      return { success: false as const, error: "Not a retur transaction." }
    }
    if (transaction.status !== "DRAFT") {
      return { success: false as const, error: "Only DRAFT transactions can be cancelled." }
    }

    await prisma.outboundTransaction.update({
      where: { id },
      data: { status: "CANCELLED" },
    })

    revalidatePath("/retur-outbound")
    revalidatePath(`/retur-outbound/${id}`)
    return { success: true as const }
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to cancel retur.",
    }
  }
}
