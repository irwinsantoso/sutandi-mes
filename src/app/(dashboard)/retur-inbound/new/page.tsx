import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/shared/page-header"
import { ReturInboundForm } from "../_components/retur-inbound-form"
import { getDistinctProjectNames } from "@/lib/projects"

export default async function NewReturInboundPage() {
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
        title="Retur Inbound Baru"
        description="Catat barang yang dikembalikan oleh customer (stok bertambah)"
      />
      <ReturInboundForm items={items} locations={locations} projectNames={projectNames} />
    </div>
  )
}
