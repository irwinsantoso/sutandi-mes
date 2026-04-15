import { notFound, redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/shared/page-header"
import { ProductionOrderForm } from "../../_components/production-order-form"

export default async function EditProductionOrderPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [order, items, uoms] = await Promise.all([
    prisma.productionOrder.findUnique({
      where: { id },
      include: {
        materials: { select: { itemId: true, requiredQuantity: true, uomId: true, notes: true } },
        outputs: { select: { itemId: true, targetQuantity: true, uomId: true, notes: true } },
      },
    }),
    prisma.item.findMany({
      orderBy: { code: "asc" },
      select: {
        id: true,
        code: true,
        name: true,
        baseUomId: true,
        baseUom: { select: { id: true, code: true, name: true } },
      },
    }),
    prisma.uom.findMany({
      orderBy: { code: "asc" },
      select: { id: true, code: true, name: true },
    }),
  ])

  if (!order) notFound()
  if (order.status !== "DRAFT") {
    redirect(`/production-orders/${id}`)
  }

  const toDateInput = (d: Date | null) =>
    d ? d.toISOString().slice(0, 10) : ""

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit ${order.orderNumber}`}
        description="Adjust the draft order before starting production."
      />
      <ProductionOrderForm
        items={items}
        uoms={uoms}
        order={{
          id: order.id,
          type: order.type,
          description: order.description,
          plannedStartDate: toDateInput(order.plannedStartDate),
          plannedEndDate: toDateInput(order.plannedEndDate),
          notes: order.notes,
          materials: order.materials.map((m) => ({
            itemId: m.itemId,
            requiredQuantity: Number(m.requiredQuantity),
            uomId: m.uomId,
            notes: m.notes,
          })),
          outputs: order.outputs.map((o) => ({
            itemId: o.itemId,
            targetQuantity: Number(o.targetQuantity),
            uomId: o.uomId,
            notes: o.notes,
          })),
        }}
      />
    </div>
  )
}
