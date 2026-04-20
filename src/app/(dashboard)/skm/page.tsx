import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { SkmClient } from "./_components/skm-client"
import type { SkmRow } from "./_components/skm-columns"

export default async function SkmPage() {
  const requests = await prisma.materialRequest.findMany({
    include: {
      createdBy: { select: { name: true } },
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  const data: SkmRow[] = requests.map((r) => ({
    id: r.id,
    requestNumber: r.requestNumber,
    requestDate: r.requestDate,
    status: r.status,
    itemCount: r._count.items,
    createdBy: r.createdBy.name,
    notes: r.notes,
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Material Requests (SKM)"
        description="Manage Surat Kebutuhan Material"
      >
        <Button render={<Link href="/skm/new" />}>
          <Plus className="mr-1 h-4 w-4" />
          New SKM
        </Button>
      </PageHeader>
      <SkmClient data={data} />
    </div>
  )
}
