import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/shared/page-header"
import { ProductionOrderClient } from "./_components/production-order-client"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"

export default async function ProductionOrdersPage() {
  const orders = await prisma.productionOrder.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      orderNumber: true,
      type: true,
      description: true,
      status: true,
      plannedStartDate: true,
      createdBy: {
        select: { name: true },
      },
      _count: {
        select: {
          materials: true,
          outputs: true,
        },
      },
    },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Production Orders"
        description="Manage production orders for WIP and finished goods."
      >
        <Link href="/production-orders/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Order
          </Button>
        </Link>
      </PageHeader>
      <ProductionOrderClient data={orders} />
    </div>
  )
}
