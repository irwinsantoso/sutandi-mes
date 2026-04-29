import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/shared/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { format } from "date-fns"
import Link from "next/link"
import { Plus } from "lucide-react"

export default async function SplListPage() {
  const orders = await prisma.directWorkOrder.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { name: true } },
      outputItem: { select: { code: true, name: true } },
      _count: { select: { materials: true } },
    },
  })

  const statusVariantMap: Record<string, "secondary" | "default" | "destructive"> = {
    DRAFT: "secondary",
    CONFIRMED: "default",
    CANCELLED: "destructive",
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Surat Pengerjaan Langsung (SPL)"
        description="Direct work orders — consume materials and produce a new item"
      >
        <Button render={<Link href="/spl/new" />}>
          <Plus className="mr-1 h-4 w-4" />
          New SPL
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>All SPL Orders ({orders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No SPL orders yet. Create your first one.
            </div>
          ) : (
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-2 text-left font-medium">Order No.</th>
                    <th className="px-4 py-2 text-left font-medium">Date</th>
                    <th className="px-4 py-2 text-left font-medium">Transfer From</th>
                    <th className="px-4 py-2 text-left font-medium">Transfer To</th>
                    <th className="px-4 py-2 text-left font-medium">Output Item</th>
                    <th className="px-4 py-2 text-right font-medium">Materials</th>
                    <th className="px-4 py-2 text-left font-medium">Status</th>
                    <th className="px-4 py-2 text-left font-medium">Created By</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-2">
                        <Link
                          href={`/spl/${order.id}`}
                          className="font-mono text-xs font-medium text-primary hover:underline"
                        >
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-2">
                        {format(order.date, "dd MMM yyyy")}
                      </td>
                      <td className="px-4 py-2">{order.transferFrom}</td>
                      <td className="px-4 py-2">{order.transferTo}</td>
                      <td className="px-4 py-2">
                        {order.outputItem ? (
                          <span>
                            <span className="font-mono text-xs">{order.outputItem.code}</span>
                            <span className="ml-1">{order.outputItem.name}</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">{order.outputItemName}</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right">{order._count.materials}</td>
                      <td className="px-4 py-2">
                        <Badge variant={statusVariantMap[order.status]}>
                          {order.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {order.createdBy.name}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
