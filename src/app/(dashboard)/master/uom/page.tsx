import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/shared/page-header"
import { UomClient } from "./_components/uom-client"

export default async function UomPage() {
  const uoms = await prisma.uom.findMany({
    orderBy: { code: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      createdAt: true,
    },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Unit of Measure"
        description="Manage units of measure for inventory items."
      />
      <UomClient data={uoms} />
    </div>
  )
}
