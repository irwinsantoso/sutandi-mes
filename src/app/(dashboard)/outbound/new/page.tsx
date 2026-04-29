import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/shared/page-header"
import { OutboundForm } from "../_components/outbound-form"

export default async function NewOutboundPage({
  searchParams,
}: {
  searchParams: Promise<{ poId?: string }>
}) {
  const { poId } = await searchParams
  const [productionOrders, items, locations] = await Promise.all([
    prisma.productionOrder.findMany({
      where: {
        status: { in: ["DRAFT", "IN_PROGRESS"] },
      },
      select: {
        id: true,
        orderNumber: true,
        type: true,
        materials: {
          select: {
            itemId: true,
            item: { select: { code: true, name: true } },
            requiredQuantity: true,
            consumedQuantity: true,
            uom: { select: { code: true } },
          },
        },
      },
      orderBy: { orderNumber: "desc" },
    }),
    prisma.item.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        baseUomId: true,
        baseUom: { select: { id: true, code: true, name: true } },
        uomConversions: {
          select: {
            fromUomId: true,
            toUomId: true,
            fromUom: { select: { id: true, code: true, name: true } },
            toUom: { select: { id: true, code: true, name: true } },
          },
        },
      },
      orderBy: { code: "asc" },
    }),
    prisma.location.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        warehouse: { select: { code: true, name: true } },
      },
      orderBy: { code: "asc" },
    }),
  ])

  // Serialize Decimal fields to number for the client
  const serializedProductionOrders = productionOrders.map((po) => ({
    ...po,
    materials: po.materials.map((m) => ({
      ...m,
      requiredQuantity: Number(m.requiredQuantity),
      consumedQuantity: Number(m.consumedQuantity),
    })),
  }))

  return (
    <div className="space-y-6">
      <PageHeader title="New Outbound Transaction" description="Create a new outgoing inventory transaction" />
      <OutboundForm
        productionOrders={serializedProductionOrders}
        items={items}
        locations={locations}
        defaultProductionOrderId={poId}
      />
    </div>
  )
}
