import { notFound } from "next/navigation"
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
import { ArrowLeft } from "lucide-react"
import { SplDetailClient } from "./_components/spl-detail-client"

interface SplDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function SplDetailPage({ params }: SplDetailPageProps) {
  const { id } = await params

  const order = await prisma.directWorkOrder.findUnique({
    where: { id },
    include: {
      createdBy: { select: { name: true } },
      outputItem: { select: { code: true, name: true } },
      outputUom: { select: { code: true, name: true } },
      outputLocation: {
        select: {
          code: true,
          name: true,
          warehouse: { select: { code: true, name: true } },
        },
      },
      materials: {
        include: {
          item: { select: { code: true, name: true } },
          uom: { select: { code: true, name: true } },
          location: {
            select: {
              code: true,
              name: true,
              warehouse: { select: { code: true, name: true } },
            },
          },
        },
      },
    },
  })

  if (!order) notFound()

  const statusVariantMap: Record<string, "secondary" | "default" | "destructive"> = {
    DRAFT: "secondary",
    CONFIRMED: "default",
    CANCELLED: "destructive",
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`SPL ${order.orderNumber}`}
        description="Surat Pengerjaan Langsung — Direct Work Order"
      >
        <Button variant="outline" render={<Link href="/spl" />}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to List
        </Button>
      </PageHeader>

      {/* Header Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            Order Details
            <Badge variant={statusVariantMap[order.status]}>{order.status}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Transfer No.</p>
              <p className="font-mono font-medium">{order.orderNumber}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Date</p>
              <p className="font-medium">{format(order.date, "dd MMM yyyy")}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Created By</p>
              <p className="font-medium">{order.createdBy.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Transfer From</p>
              <p className="font-medium">{order.transferFrom}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Transfer To</p>
              <p className="font-medium">{order.transferTo}</p>
              {order.transferToAddress && (
                <p className="text-sm text-muted-foreground">{order.transferToAddress}</p>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Disiapkan (Prepared By)</p>
              <p className="font-medium">{order.preparedBy}</p>
            </div>
            {order.approvedBy && (
              <div>
                <p className="text-sm text-muted-foreground">Disetujui Oleh (Approved By)</p>
                <p className="font-medium">{order.approvedBy}</p>
              </div>
            )}
            {order.receivedBy && (
              <div>
                <p className="text-sm text-muted-foreground">Diterima Oleh (Received By)</p>
                <p className="font-medium">{order.receivedBy}</p>
              </div>
            )}
            {order.description && (
              <div className="sm:col-span-2 lg:col-span-3">
                <p className="text-sm text-muted-foreground">Description (Keterangan)</p>
                <p className="font-medium">{order.description}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Material Items */}
      <Card>
        <CardHeader>
          <CardTitle>Material Items ({order.materials.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-2 text-left font-medium">No.</th>
                  <th className="px-4 py-2 text-left font-medium">Item</th>
                  <th className="px-4 py-2 text-left font-medium">Item Description</th>
                  <th className="px-4 py-2 text-right font-medium">Quantity</th>
                  <th className="px-4 py-2 text-left font-medium">Unit</th>
                  <th className="px-4 py-2 text-left font-medium">Batch/Lot</th>
                  <th className="px-4 py-2 text-left font-medium">Location</th>
                  <th className="px-4 py-2 text-left font-medium">Department</th>
                </tr>
              </thead>
              <tbody>
                {order.materials.map((mat, idx) => (
                  <tr key={mat.id} className="border-b last:border-0">
                    <td className="px-4 py-2 text-muted-foreground">{idx + 1}</td>
                    <td className="px-4 py-2 font-mono text-xs">{mat.item.code}</td>
                    <td className="px-4 py-2">{mat.item.name}</td>
                    <td className="px-4 py-2 text-right font-mono">
                      {Number(mat.quantity).toLocaleString()}
                    </td>
                    <td className="px-4 py-2">{mat.uom.code}</td>
                    <td className="px-4 py-2">{mat.batchLot || "-"}</td>
                    <td className="px-4 py-2">
                      <span className="font-mono text-xs">{mat.location.warehouse.code}</span>
                      <span className="mx-1">/</span>
                      <span>{mat.location.code}</span>
                    </td>
                    <td className="px-4 py-2">{mat.departmentName || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Output Item */}
      <Card>
        <CardHeader>
          <CardTitle>Output Item (Barang Hasil)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">Item</p>
              {order.outputItem ? (
                <p className="font-medium">
                  <span className="font-mono text-xs">{order.outputItem.code}</span>
                  <span className="ml-2">{order.outputItem.name}</span>
                </p>
              ) : (
                <p className="font-medium text-amber-600">
                  {order.outputItemName}
                  {order.outputItemCode && (
                    <span className="ml-1 font-mono text-xs">({order.outputItemCode})</span>
                  )}
                  <span className="ml-2 text-xs text-muted-foreground">— new item</span>
                </p>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Quantity</p>
              <p className="font-medium font-mono">
                {Number(order.outputQty).toLocaleString()} {order.outputUom.code}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Location</p>
              <p className="font-medium">
                <span className="font-mono text-xs">{order.outputLocation.warehouse.code}</span>
                <span className="mx-1">/</span>
                <span>{order.outputLocation.code}</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      {order.status === "DRAFT" && <SplDetailClient orderId={order.id} />}
    </div>
  )
}
