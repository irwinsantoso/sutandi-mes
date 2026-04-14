import type { Decimal } from "@prisma/client/runtime/library"
import { prisma } from "./prisma"

export async function convertQuantity(
  itemId: string,
  fromUomId: string,
  toUomId: string,
  quantity: Decimal
): Promise<Decimal> {
  if (fromUomId === toUomId) return quantity

  const conversions = await prisma.uomConversion.findMany({
    where: { itemId },
    select: { fromUomId: true, toUomId: true, conversionFactor: true },
  })

  // Build undirected graph: each conversion is a bidirectional edge.
  // Forward edge multiplies by factor; reverse edge divides.
  const adjacency = new Map<string, Array<{ to: string; factor: Decimal; invert: boolean }>>()
  for (const c of conversions) {
    if (!adjacency.has(c.fromUomId)) adjacency.set(c.fromUomId, [])
    if (!adjacency.has(c.toUomId)) adjacency.set(c.toUomId, [])
    adjacency.get(c.fromUomId)!.push({ to: c.toUomId, factor: c.conversionFactor, invert: false })
    adjacency.get(c.toUomId)!.push({ to: c.fromUomId, factor: c.conversionFactor, invert: true })
  }

  // BFS from fromUomId to toUomId, recording the path.
  const prev = new Map<string, { from: string; factor: Decimal; invert: boolean }>()
  const queue: string[] = [fromUomId]
  const visited = new Set<string>([fromUomId])
  let found = false
  while (queue.length) {
    const node = queue.shift()!
    if (node === toUomId) {
      found = true
      break
    }
    for (const edge of adjacency.get(node) ?? []) {
      if (visited.has(edge.to)) continue
      visited.add(edge.to)
      prev.set(edge.to, { from: node, factor: edge.factor, invert: edge.invert })
      queue.push(edge.to)
    }
  }

  if (!found) {
    throw new Error(
      `No UOM conversion found for item ${itemId} from ${fromUomId} to ${toUomId}`
    )
  }

  // Walk the path back and apply each hop.
  let result = quantity
  let cursor = toUomId
  while (cursor !== fromUomId) {
    const step = prev.get(cursor)!
    result = step.invert ? result.div(step.factor) : result.mul(step.factor)
    cursor = step.from
  }
  return result
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
