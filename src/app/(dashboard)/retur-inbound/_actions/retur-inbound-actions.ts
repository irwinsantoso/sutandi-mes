"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { generateTransactionNumber } from "@/lib/transaction-number"
import { toBaseUom } from "@/lib/uom-converter"
import { Decimal } from "@prisma/client/runtime/library"

const returItemSchema = z.object({
  itemId: z.string().min(1, "Item is required"),
  quantity: z.number().positive("Quantity must be positive"),
  uomId: z.string().min(1, "UOM is required"),
  batchLot: z.string().optional(),
  locationId: z.string().min(1, "Location is required"),
})

const createReturInboundSchema = z.object({
  projectName: z.string().optional(),
  customerName: z.string().optional(),
  referenceNumber: z.string().optional(),
  receivingDate: z.string().min(1, "Receiving date is required"),
  notes: z.string().optional(),
  items: z.array(returItemSchema).min(1, "At least one item is required"),
})

export async function createReturInbound(data: {
  projectName?: string
  customerName?: string
  referenceNumber?: string
  receivingDate: string
  notes?: string
  items: Array<{
    itemId: string
    quantity: number
    uomId: string
    batchLot?: string
    locationId: string
  }>
}) {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false as const, error: "Not authenticated" }
  }

  const parsed = createReturInboundSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message }
  }

  const d = parsed.data

  try {
    const transactionNumber = await generateTransactionNumber("RI")

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

    const result = await prisma.inboundTransaction.create({
      data: {
        transactionNumber,
        kind: "RETUR",
        projectName: d.projectName || null,
        customerName: d.customerName || null,
        referenceNumber: d.referenceNumber || null,
        supplier: null,
        receivingDate: new Date(d.receivingDate),
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
          })),
        },
      },
      select: { id: true },
    })

    revalidatePath("/retur-inbound")
    redirect(`/retur-inbound/${result.id}`)
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to create retur inbound.",
    }
  }
}

export async function confirmReturInbound(id: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false as const, error: "Not authenticated" }
  }

  try {
    const transaction = await prisma.inboundTransaction.findUniqueOrThrow({
      where: { id },
      include: {
        items: { include: { item: { select: { baseUomId: true } } } },
      },
    })

    if (transaction.kind !== "RETUR") {
      return { success: false as const, error: "Not a retur transaction." }
    }
    if (transaction.status !== "DRAFT") {
      return { success: false as const, error: "Only DRAFT transactions can be confirmed." }
    }

    await prisma.$transaction(async (tx) => {
      for (const item of transaction.items) {
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
            quantity: item.quantityInBaseUom,
          },
          update: {
            quantity: { increment: item.quantityInBaseUom },
          },
        })

        await tx.stockMovement.create({
          data: {
            movementType: "INBOUND",
            itemId: item.itemId,
            locationId: item.locationId,
            batchLot: item.batchLot || null,
            quantity: item.quantity,
            uomId: item.uomId,
            quantityInBaseUom: item.quantityInBaseUom,
            inboundTransactionItemId: item.id,
            referenceNumber: transaction.transactionNumber,
            notes: `Retur inbound: ${transaction.transactionNumber}`,
          },
        })
      }

      await tx.inboundTransaction.update({
        where: { id },
        data: { status: "CONFIRMED" },
      })
    })

    revalidatePath("/retur-inbound")
    revalidatePath(`/retur-inbound/${id}`)
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

export async function cancelReturInbound(id: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false as const, error: "Not authenticated" }
  }

  try {
    const transaction = await prisma.inboundTransaction.findUniqueOrThrow({
      where: { id },
      select: { status: true, kind: true },
    })

    if (transaction.kind !== "RETUR") {
      return { success: false as const, error: "Not a retur transaction." }
    }
    if (transaction.status !== "DRAFT") {
      return { success: false as const, error: "Only DRAFT transactions can be cancelled." }
    }

    await prisma.inboundTransaction.update({
      where: { id },
      data: { status: "CANCELLED" },
    })

    revalidatePath("/retur-inbound")
    revalidatePath(`/retur-inbound/${id}`)
    return { success: true as const }
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to cancel retur.",
    }
  }
}
