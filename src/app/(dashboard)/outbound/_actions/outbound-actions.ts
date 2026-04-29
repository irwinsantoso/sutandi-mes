"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { generateTransactionNumber } from "@/lib/transaction-number"
import { toBaseUom, convertQuantity } from "@/lib/uom-converter"
import { Decimal } from "@prisma/client/runtime/library"

const outboundItemSchema = z.object({
  itemId: z.string().min(1, "Item is required"),
  quantity: z.number().positive("Quantity must be positive"),
  uomId: z.string().min(1, "UOM is required"),
  batchLot: z.string().optional(),
  locationId: z.string().min(1, "Location is required"),
  scannedQrData: z.string().optional(),
  notes: z.string().optional(),
})

const createOutboundSchema = z.object({
  productionOrderId: z.string().optional(),
  purpose: z.string().optional(),
  issueDate: z.string().min(1, "Issue date is required"),
  notes: z.string().optional(),
  items: z.array(outboundItemSchema).min(1, "At least one item is required"),
})

export async function createOutboundTransaction(data: {
  productionOrderId?: string
  purpose?: string
  issueDate: string
  notes?: string
  items: Array<{
    itemId: string
    quantity: number
    uomId: string
    batchLot?: string
    locationId: string
    scannedQrData?: string
    notes?: string
  }>
}) {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false as const, error: "Not authenticated" }
  }

  const parsed = createOutboundSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message }
  }

  const { productionOrderId, purpose, issueDate, notes, items } = parsed.data

  try {
    const transactionNumber = await generateTransactionNumber("OUT")

    const itemDetails = await Promise.all(
      items.map(async (item) => {
        const quantityInBaseUom = await toBaseUom(
          item.itemId,
          item.uomId,
          new Decimal(item.quantity)
        )
        return { ...item, quantityInBaseUom }
      })
    )

    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.outboundTransaction.create({
        data: {
          transactionNumber,
          productionOrderId: productionOrderId || null,
          purpose: purpose || null,
          issueDate: new Date(issueDate),
          notes: notes || null,
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
              scannedQrData: item.scannedQrData || null,
              notes: item.notes || null,
            })),
          },
        },
        select: { id: true },
      })
      return transaction
    })

    revalidatePath("/outbound")
    revalidatePath("/inventory/summary")
    redirect(`/outbound/${result.id}`)
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error
    }
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to create outbound transaction.",
    }
  }
}

export async function confirmOutboundTransaction(id: string) {
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
            uom: { select: { code: true } },
          },
        },
        productionOrder: {
          include: {
            materials: true,
          },
        },
      },
    })

    if (transaction.status !== "DRAFT") {
      return {
        success: false as const,
        error: "Only DRAFT transactions can be confirmed.",
      }
    }

    // Check available stock for every line before touching inventory
    const stockErrors: string[] = []
    for (const item of transaction.items) {
      // Find all inventory for this item at this location.
      // Do NOT filter by uomId — inventory may be stored in any UOM (e.g. bundle
      // vs base pcs). We convert each record to base UOM for the comparison.
      // If the outbound item has a batchLot, restrict to that batch only.
      const invRecords = await prisma.inventory.findMany({
        where: {
          itemId: item.itemId,
          locationId: item.locationId,
          ...(item.batchLot ? { batchLot: item.batchLot } : {}),
        },
      })

      // Convert each record's available qty to base UOM for a fair comparison.
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

      // For PO-linked outbounds, the PO's own reservation is consumable — add
      // it back so the check doesn't block reserved-stock consumption.
      if (transaction.productionOrderId && invRecords.length > 0) {
        const matchingMaterial = transaction.productionOrder?.materials.find(
          (m) => m.itemId === item.itemId
        )
        if (matchingMaterial) {
          for (const inv of invRecords) {
            const reservation = await prisma.inventoryReservation.findUnique({
              where: {
                inventoryId_productionOrderMaterialId: {
                  inventoryId: inv.id,
                  productionOrderMaterialId: matchingMaterial.id,
                },
              },
            })
            if (reservation) {
              const resBase = await convertQuantity(
                item.itemId, inv.uomId, item.item.baseUomId, new Decimal(reservation.quantity)
              )
              available = available.plus(resBase)
            }
          }
        }
      }

      if (available.lessThan(item.quantityInBaseUom)) {
        stockErrors.push(
          `Insufficient stock for ${item.item.code} – ${item.item.name}: ` +
            `required ${item.quantityInBaseUom}, available ${available.toFixed()}`
        )
      }
    }
    if (stockErrors.length > 0) {
      return { success: false as const, error: stockErrors.join("; ") }
    }

    await prisma.$transaction(async (tx) => {
      for (const item of transaction.items) {
        // Find matching inventory records (same logic as stock check above).
        const invRecords = await tx.inventory.findMany({
          where: {
            itemId: item.itemId,
            locationId: item.locationId,
            ...(item.batchLot ? { batchLot: item.batchLot } : {}),
          },
          orderBy: { updatedAt: "asc" },
        })

        // Pre-resolve matching PO material once for use in the FIFO loop.
        const matchingMaterial = transaction.productionOrderId
          ? transaction.productionOrder?.materials.find((m) => m.itemId === item.itemId)
          : undefined

        // FIFO decrement. remaining is tracked in base UOM.
        // Each record may be stored in a different UOM, so we convert before
        // decrementing and convert the decrement amount back to the record's UOM.
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

          // If PO-linked, also release the portion of the reservation consumed by this decrement.
          let reservedDecrement = new Decimal(0)
          if (matchingMaterial) {
            const reservation = await tx.inventoryReservation.findUnique({
              where: {
                inventoryId_productionOrderMaterialId: {
                  inventoryId: inv.id,
                  productionOrderMaterialId: matchingMaterial.id,
                },
              },
            })
            if (reservation) {
              const existingReserved = new Decimal(reservation.quantity)
              if (decrementNative.greaterThanOrEqualTo(existingReserved)) {
                await tx.inventoryReservation.delete({ where: { id: reservation.id } })
                reservedDecrement = existingReserved
              } else {
                await tx.inventoryReservation.update({
                  where: { id: reservation.id },
                  data: { quantity: { decrement: decrementNative } },
                })
                reservedDecrement = decrementNative
              }
            }
          }

          await tx.inventory.update({
            where: { id: inv.id },
            data: {
              quantity: { decrement: decrementNative },
              ...(reservedDecrement.greaterThan(0) && {
                reservedQuantity: { decrement: reservedDecrement },
              }),
            },
          })
          remaining = remaining.minus(decrementBase)
        }

        // Create stock movement (negative quantity for outbound)
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
          },
        })

        // If linked to production order, track consumed quantity.
        if (matchingMaterial) {
          await tx.productionOrderMaterial.update({
            where: { id: matchingMaterial.id },
            data: { consumedQuantity: { increment: item.quantityInBaseUom } },
          })
        }
      }

      // Update transaction status
      await tx.outboundTransaction.update({
        where: { id },
        data: { status: "CONFIRMED" },
      })
    })

    revalidatePath("/outbound")
    revalidatePath(`/outbound/${id}`)
    revalidatePath("/inventory")
    revalidatePath("/inventory/summary")
    revalidatePath("/production-orders")
    return { success: true as const }
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to confirm transaction.",
    }
  }
}

export async function cancelOutboundTransaction(id: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false as const, error: "Not authenticated" }
  }

  try {
    const transaction = await prisma.outboundTransaction.findUniqueOrThrow({
      where: { id },
      select: { status: true },
    })

    if (transaction.status !== "DRAFT") {
      return {
        success: false as const,
        error: "Only DRAFT transactions can be cancelled.",
      }
    }

    await prisma.outboundTransaction.update({
      where: { id },
      data: { status: "CANCELLED" },
    })

    revalidatePath("/outbound")
    revalidatePath(`/outbound/${id}`)
    revalidatePath("/inventory/summary")
    return { success: true as const }
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to cancel transaction.",
    }
  }
}
