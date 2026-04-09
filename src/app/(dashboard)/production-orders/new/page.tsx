import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/shared/page-header"
import { ProductionOrderForm } from "../_components/production-order-form"

export default async function NewProductionOrderPage() {
  const [items, uoms] = await Promise.all([
    prisma.item.findMany({
      orderBy: { code: "asc" },
      select: {
        id: true,
        code: true,
        name: true,
        baseUomId: true,
        baseUom: {
          select: { id: true, code: true, name: true },
        },
      },
    }),
    prisma.uom.findMany({
      orderBy: { code: "asc" },
      select: {
        id: true,
        code: true,
        name: true,
      },
    }),
  ])

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Production Order"
        description="Create a new production order."
      />
      <ProductionOrderForm items={items} uoms={uoms} />
    </div>
  )
}
