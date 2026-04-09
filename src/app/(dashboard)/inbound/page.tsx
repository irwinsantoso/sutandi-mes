import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { InboundClient } from "./_components/inbound-client"
import type { InboundRow } from "./_components/inbound-columns"

export default async function InboundPage() {
  const transactions = await prisma.inboundTransaction.findMany({
    include: {
      createdBy: { select: { name: true } },
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  const data: InboundRow[] = transactions.map((t) => ({
    id: t.id,
    transactionNumber: t.transactionNumber,
    supplier: t.supplier,
    referenceNumber: t.referenceNumber,
    receivingDate: t.receivingDate,
    status: t.status,
    itemCount: t._count.items,
    createdBy: t.createdBy.name,
  }))

  return (
    <div className="space-y-6">
      <PageHeader title="Inbound Transactions" description="Manage incoming inventory transactions">
        <Button render={<Link href="/inbound/new" />}>
          <Plus className="mr-1 h-4 w-4" />
          New Inbound
        </Button>
      </PageHeader>
      <InboundClient data={data} />
    </div>
  )
}
