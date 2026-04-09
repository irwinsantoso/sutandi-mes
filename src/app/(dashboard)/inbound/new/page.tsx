import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/shared/page-header"
import { InboundForm } from "../_components/inbound-form"

export default async function NewInboundPage() {
  const [items, locations] = await Promise.all([
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

  return (
    <div className="space-y-6">
      <PageHeader title="New Inbound Transaction" description="Create a new incoming inventory transaction" />
      <InboundForm items={items} locations={locations} />
    </div>
  )
}
