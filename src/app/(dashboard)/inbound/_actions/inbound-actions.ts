"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { generateTransactionNumber } from "@/lib/transaction-number"
import { toBaseUom } from "@/lib/uom-converter"
import { encodeQrPayload } from "@/lib/qr-code"
import { Decimal } from "@prisma/client/runtime/library"

const inboundItemSchema = z.object({
  itemId: z.string().min(1, "Item is required"),
  quantity: z.number().positive("Quantity must be positive"),
  uomId: z.string().min(1, "UOM is required"),
  batchLot: z.string().optional(),
  locationId: z.string().min(1, "Location is required"),
  expiryDate: z.string().optional(),
})

const createInboundSchema = z.object({
  supplier: z.string().optional(),
  referenceNumber: z.string().optional(),
  receivingDate: z.string().min(1, "Receiving date is required"),
  notes: z.string().optional(),
  items: z.array(inboundItemSchema).min(1, "At least one item is required"),
})

export async function createInboundTransaction(data: {
  supplier?: string
  referenceNumber?: string
  receivingDate: string
  notes?: string
  items: Array<{
    itemId: string
    quantity: number
    uomId: string
    batchLot?: string
    locationId: string
    expiryDate?: string
  }>
}) {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false as const, error: "Not authenticated" }
  }

  const parsed = createInboundSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message }
  }

  const { supplier, referenceNumber, receivingDate, notes, items } = parsed.data

  try {
    const transactionNumber = await generateTransactionNumber("IN")

    const itemDetails = await Promise.all(
      items.map(async (item) => {
        const dbItem = await prisma.item.findUniqueOrThrow({
          where: { id: item.itemId },
          select: { code: true, name: true, baseUomId: true, baseUom: { select: { code: true } } },
        })
        const uom = await prisma.uom.findUniqueOrThrow({
          where: { id: item.uomId },
          select: { code: true },
        })
        const location = await prisma.location.findUniqueOrThrow({
          where: { id: item.locationId },
          select: { code: true },
        })
        const quantityInBaseUom = await toBaseUom(
          item.itemId,
          item.uomId,
          new Decimal(item.quantity)
        )
        return { ...item, dbItem, uom, location, quantityInBaseUom }
      })
    )

    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.inboundTransaction.create({
        data: {
          transactionNumber,
          referenceNumber: referenceNumber || null,
          supplier: supplier || null,
          receivingDate: new Date(receivingDate),
          notes: notes || null,
          status: "DRAFT",
          createdById: session.user.id,
          items: {
            create: itemDetails.map((item) => {
              // v2 QR: identifies the destination inventory bin, not the
              // receipt line. Encodes item+location+batch+base UOM so the
              // same sticker remains valid through partial picks and can
              // be reprinted from the inventory page.
              const qrPayload = encodeQrPayload({
                v: 2,
                item: item.dbItem.code,
                loc: item.location.code,
                batch: item.batchLot || null,
                uom: item.dbItem.baseUom.code,
              })
              return {
                itemId: item.itemId,
                quantity: new Decimal(item.quantity),
                uomId: item.uomId,
                quantityInBaseUom: item.quantityInBaseUom,
                batchLot: item.batchLot || null,
                locationId: item.locationId,
                expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
                qrCodeData: qrPayload,
              }
            }),
          },
        },
        select: { id: true },
      })
      return transaction
    })

    revalidatePath("/inbound")
    redirect(`/inbound/${result.id}`)
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error
    }
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to create inbound transaction.",
    }
  }
}

export async function confirmInboundTransaction(id: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false as const, error: "Not authenticated" }
  }

  try {
    const transaction = await prisma.inboundTransaction.findUniqueOrThrow({
      where: { id },
      include: {
        items: {
          include: {
            item: { select: { baseUomId: true } },
            uom: { select: { code: true } },
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
            quantity: {
              increment: item.quantityInBaseUom,
            },
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
          },
        })
      }

      await tx.inboundTransaction.update({
        where: { id },
        data: { status: "CONFIRMED" },
      })
    })

    revalidatePath("/inbound")
    revalidatePath(`/inbound/${id}`)
    return { success: true as const }
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to confirm transaction.",
    }
  }
}

export async function cancelInboundTransaction(id: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false as const, error: "Not authenticated" }
  }

  try {
    const transaction = await prisma.inboundTransaction.findUniqueOrThrow({
      where: { id },
      select: { status: true },
    })

    if (transaction.status !== "DRAFT") {
      return {
        success: false as const,
        error: "Only DRAFT transactions can be cancelled.",
      }
    }

    await prisma.inboundTransaction.update({
      where: { id },
      data: { status: "CANCELLED" },
    })

    revalidatePath("/inbound")
    revalidatePath(`/inbound/${id}`)
    return { success: true as const }
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to cancel transaction.",
    }
  }
}
