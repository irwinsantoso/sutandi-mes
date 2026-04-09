"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { generateTransactionNumber } from "@/lib/transaction-number"
import { toBaseUom } from "@/lib/uom-converter"
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
            item: { select: { baseUomId: true } },
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

    await prisma.$transaction(async (tx) => {
      for (const item of transaction.items) {
        // Decrement inventory
        await tx.inventory.upsert({
          where: {
            itemId_locationId_batchLot_uomId: {
              itemId: item.itemId,
              locationId: item.locationId,
              batchLot: item.batchLot || "",
              uomId: item.item.baseUomId,
            },
          },
          create: {
            itemId: item.itemId,
            locationId: item.locationId,
            batchLot: item.batchLot || "",
            uomId: item.item.baseUomId,
            quantity: new Decimal(0).minus(item.quantityInBaseUom),
          },
          update: {
            quantity: {
              decrement: item.quantityInBaseUom,
            },
          },
        })

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

        // If linked to production order, update consumed quantity and release reservation
        if (transaction.productionOrder) {
          const matchingMaterial = transaction.productionOrder.materials.find(
            (m) => m.itemId === item.itemId
          )
          if (matchingMaterial) {
            await tx.productionOrderMaterial.update({
              where: { id: matchingMaterial.id },
              data: {
                consumedQuantity: {
                  increment: item.quantityInBaseUom,
                },
              },
            })

            // Release the reserved quantity for the consumed amount
            const inventoryRecord = await tx.inventory.findUnique({
              where: {
                itemId_locationId_batchLot_uomId: {
                  itemId: item.itemId,
                  locationId: item.locationId,
                  batchLot: item.batchLot || "",
                  uomId: item.item.baseUomId,
                },
              },
            })
            if (inventoryRecord && Number(inventoryRecord.reservedQuantity) > 0) {
              const releaseAmount = Math.min(
                Number(inventoryRecord.reservedQuantity),
                Number(item.quantityInBaseUom)
              )
              await tx.inventory.update({
                where: { id: inventoryRecord.id },
                data: {
                  reservedQuantity: { decrement: releaseAmount },
                },
              })
            }
          }
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
    return { success: true as const }
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to cancel transaction.",
    }
  }
}
