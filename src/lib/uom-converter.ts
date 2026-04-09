import type { Decimal } from "@prisma/client/runtime/library"
import { prisma } from "./prisma"

export async function convertQuantity(
  itemId: string,
  fromUomId: string,
  toUomId: string,
  quantity: Decimal
): Promise<Decimal> {
  if (fromUomId === toUomId) return quantity

  const conversion = await prisma.uomConversion.findUnique({
    where: {
      itemId_fromUomId_toUomId: { itemId, fromUomId, toUomId },
    },
  })

  if (conversion) {
    return quantity.mul(conversion.conversionFactor)
  }

  // Try reverse conversion
  const reverse = await prisma.uomConversion.findUnique({
    where: {
      itemId_fromUomId_toUomId: {
        itemId,
        fromUomId: toUomId,
        toUomId: fromUomId,
      },
    },
  })

  if (reverse) {
    return quantity.div(reverse.conversionFactor)
  }

  throw new Error(
    `No UOM conversion found for item ${itemId} from ${fromUomId} to ${toUomId}`
  )
}

export async function toBaseUom(
  itemId: string,
  fromUomId: string,
  quantity: Decimal
): Promise<Decimal> {
  const item = await prisma.item.findUniqueOrThrow({
    where: { id: itemId },
    select: { baseUomId: true },
  })
  return convertQuantity(itemId, fromUomId, item.baseUomId, quantity)
}
