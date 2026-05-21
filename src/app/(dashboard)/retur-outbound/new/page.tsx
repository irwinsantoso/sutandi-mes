import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/shared/page-header"
import { ReturOutboundForm } from "../_components/retur-outbound-form"
import { getDistinctProjectNames } from "@/lib/projects"

export default async function NewReturOutboundPage() {
  const [items, locations, projectNames] = await Promise.all([
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
    getDistinctProjectNames(),
  ])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Retur Outbound Baru"
        description="Catat barang yang dikembalikan ke supplier (stok berkurang)"
      />
      <ReturOutboundForm items={items} locations={locations} projectNames={projectNames} />
    </div>
  )
}
