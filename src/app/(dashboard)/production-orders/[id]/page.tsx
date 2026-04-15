import { notFound } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { Pencil } from "lucide-react"
import { ProductionOrderDetailClient } from "./_components/production-order-detail-client"

const statusVariantMap: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  DRAFT: "secondary",
  IN_PROGRESS: "default",
  COMPLETED: "default",
  CANCELLED: "destructive",
}

const statusLabels: Record<string, string> = {
  DRAFT: "Draft",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
}

const typeLabels: Record<string, string> = {
  WIP: "WIP",
  FINISHED_GOOD: "Finished Good",
}

export default async function ProductionOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const order = await prisma.productionOrder.findUnique({
    where: { id },
    include: {
      createdBy: { select: { name: true } },
      materials: {
        include: {
          item: { select: { code: true, name: true } },
          uom: { select: { code: true, name: true } },
        },
      },
      outputs: {
        include: {
          item: { select: { code: true, name: true } },
          uom: { select: { code: true, name: true } },
        },
      },
      outboundTransactions: {
        select: {
          id: true,
          transactionNumber: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  })

  if (!order) {
    notFound()
  }

  const outputsForClient = order.outputs.map((o) => ({
    id: o.id,
    itemId: o.itemId,
    itemName: `${o.item.code} - ${o.item.name}`,
    targetQuantity: Number(o.targetQuantity),
    producedQuantity: Number(o.producedQuantity),
    uomCode: o.uom.code,
  }))

  const locations = await prisma.location.findMany({
    where: { isActive: true },
    include: { warehouse: { select: { code: true, name: true } } },
    orderBy: { code: "asc" },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Production Order ${order.orderNumber}`}
        description={order.description || undefined}
      >
        {order.status === "DRAFT" && (
          <Link href={`/production-orders/${order.id}/edit`}>
            <Button variant="outline">
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
        )}
      </PageHeader>

      <ProductionOrderDetailClient
        order={{
          id: order.id,
          status: order.status,
          orderNumber: order.orderNumber,
        }}
        outputs={outputsForClient}
        locations={locations.map((l) => ({
          id: l.id,
          code: l.code,
          name: l.name,
          warehouseCode: l.warehouse.code,
        }))}
      />

      {(order.jenisWarna ||
        order.typeVariant ||
        order.tangga ||
        order.departmentName) && (
        <Card>
          <CardHeader>
            <CardTitle>KOP Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {order.jenisWarna && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Jenis/Warna</span>
                <span className="font-medium">{order.jenisWarna}</span>
              </div>
            )}
            {order.typeVariant && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type</span>
                <span className="font-medium">{order.typeVariant}</span>
              </div>
            )}
            {order.tangga && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tangga</span>
                <span className="font-medium">{order.tangga}</span>
              </div>
            )}
            {order.departmentName && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nama Departemen</span>
                <span className="font-medium">{order.departmentName}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Order Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Order Number</span>
              <span className="font-medium">{order.orderNumber}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type</span>
              <Badge
                variant="outline"
                className={
                  order.type === "WIP"
                    ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
                    : "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400"
                }
              >
                {typeLabels[order.type]}
              </Badge>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge
                variant={statusVariantMap[order.status]}
                className={
                  order.status === "IN_PROGRESS"
                    ? "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400"
                    : order.status === "COMPLETED"
                      ? "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400"
                      : undefined
                }
              >
                {statusLabels[order.status]}
              </Badge>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created By</span>
              <span>{order.createdBy.name}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created At</span>
              <span>{format(order.createdAt, "dd MMM yyyy HH:mm")}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Planned Start</span>
              <span>
                {order.plannedStartDate
                  ? format(order.plannedStartDate, "dd MMM yyyy")
                  : "-"}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Planned End</span>
              <span>
                {order.plannedEndDate
                  ? format(order.plannedEndDate, "dd MMM yyyy")
                  : "-"}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Actual Start</span>
              <span>
                {order.actualStartDate
                  ? format(order.actualStartDate, "dd MMM yyyy HH:mm")
                  : "-"}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Actual End</span>
              <span>
                {order.actualEndDate
                  ? format(order.actualEndDate, "dd MMM yyyy HH:mm")
                  : "-"}
              </span>
            </div>
            {order.notes && (
              <>
                <Separator />
                <div>
                  <span className="text-muted-foreground">Notes</span>
                  <p className="mt-1 text-sm">{order.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Materials (Input)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Required Qty</TableHead>
                  <TableHead className="text-right">Consumed Qty</TableHead>
                  <TableHead>UOM</TableHead>
                  <TableHead className="text-right">Progress</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.materials.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-16 text-center">
                      No materials.
                    </TableCell>
                  </TableRow>
                ) : (
                  order.materials.map((material) => {
                    const required = Number(material.requiredQuantity)
                    const consumed = Number(material.consumedQuantity)
                    const progress =
                      required > 0
                        ? Math.min(
                            Math.round((consumed / required) * 100),
                            100
                          )
                        : 0
                    return (
                      <TableRow key={material.id}>
                        <TableCell>
                          <span className="font-medium">
                            {material.item.code}
                          </span>{" "}
                          - {material.item.name}
                        </TableCell>
                        <TableCell className="text-right">
                          {required.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {consumed.toLocaleString()}
                        </TableCell>
                        <TableCell>{material.uom.code}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-primary transition-all"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {progress}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {material.notes ?? ""}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Outputs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Target Qty</TableHead>
                  <TableHead className="text-right">Produced Qty</TableHead>
                  <TableHead>UOM</TableHead>
                  <TableHead className="text-right">Progress</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.outputs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-16 text-center">
                      No outputs.
                    </TableCell>
                  </TableRow>
                ) : (
                  order.outputs.map((output) => {
                    const target = Number(output.targetQuantity)
                    const produced = Number(output.producedQuantity)
                    const progress =
                      target > 0
                        ? Math.min(
                            Math.round((produced / target) * 100),
                            100
                          )
                        : 0
                    return (
                      <TableRow key={output.id}>
                        <TableCell>
                          <span className="font-medium">
                            {output.item.code}
                          </span>{" "}
                          - {output.item.name}
                        </TableCell>
                        <TableCell className="text-right">
                          {target.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {produced.toLocaleString()}
                        </TableCell>
                        <TableCell>{output.uom.code}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-primary transition-all"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {progress}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {output.notes ?? ""}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {order.outboundTransactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Linked Outbound Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transaction Number</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.outboundTransactions.map((txn) => (
                    <TableRow key={txn.id}>
                      <TableCell>
                        <Link
                          href={`/outbound/${txn.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {txn.transactionNumber}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {format(txn.createdAt, "dd MMM yyyy HH:mm")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
