import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { OutboundClient } from "./_components/outbound-client"
import type { OutboundRow } from "./_components/outbound-columns"

export default async function OutboundPage() {
  const transactions = await prisma.outboundTransaction.findMany({
    include: {
      createdBy: { select: { name: true } },
      productionOrder: { select: { orderNumber: true } },
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  const data: OutboundRow[] = transactions.map((t) => ({
    id: t.id,
    transactionNumber: t.transactionNumber,
    productionOrder: t.productionOrder?.orderNumber ?? null,
    purpose: t.purpose,
    issueDate: t.issueDate,
    status: t.status,
    itemCount: t._count.items,
    createdBy: t.createdBy.name,
  }))

  return (
    <div className="space-y-6">
      <PageHeader title="Outbound Transactions" description="Manage outgoing inventory transactions">
        <Button render={<Link href="/outbound/new" />}>
          <Plus className="mr-1 h-4 w-4" />
          New Outbound
        </Button>
      </PageHeader>
      <OutboundClient data={data} />
    </div>
  )
}
