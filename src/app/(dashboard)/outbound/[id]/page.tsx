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
import { Separator } from "@/components/ui/separator"
import { format } from "date-fns"
import Link from "next/link"
import { ArrowLeft, QrCode } from "lucide-react"
import { OutboundDetailClient } from "./_components/outbound-detail-client"

interface OutboundDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function OutboundDetailPage({ params }: OutboundDetailPageProps) {
  const { id } = await params

  const transaction = await prisma.outboundTransaction.findUnique({
    where: { id },
    include: {
      createdBy: { select: { name: true } },
      productionOrder: {
        select: {
          orderNumber: true,
          type: true,
          status: true,
        },
      },
      items: {
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

  if (!transaction) {
    notFound()
  }

  const statusVariantMap: Record<string, "secondary" | "default" | "destructive"> = {
    DRAFT: "secondary",
    CONFIRMED: "default",
    CANCELLED: "destructive",
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Outbound ${transaction.transactionNumber}`}
        description="Outbound transaction details"
      >
        <Button variant="outline" render={<Link href="/outbound" />}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to List
        </Button>
      </PageHeader>

      {/* Transaction Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            Transaction Details
            <Badge variant={statusVariantMap[transaction.status]}>
              {transaction.status}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Transaction Number</p>
              <p className="font-medium">{transaction.transactionNumber}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Issue Date</p>
              <p className="font-medium">{format(transaction.issueDate, "dd MMM yyyy")}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Purpose</p>
              <p className="font-medium">{transaction.purpose || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Created By</p>
              <p className="font-medium">{transaction.createdBy.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Created At</p>
              <p className="font-medium">{format(transaction.createdAt, "dd MMM yyyy HH:mm")}</p>
            </div>
            {transaction.notes && (
              <div className="sm:col-span-2 lg:col-span-3">
                <p className="text-sm text-muted-foreground">Notes</p>
                <p className="font-medium">{transaction.notes}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Production Order Info */}
      {transaction.productionOrder && (
        <Card>
          <CardHeader>
            <CardTitle>Linked Production Order</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Order Number</p>
                <p className="font-medium">{transaction.productionOrder.orderNumber}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <p className="font-medium">{transaction.productionOrder.type}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-medium">{transaction.productionOrder.status}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle>Line Items ({transaction.items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-2 text-left font-medium">#</th>
                  <th className="px-4 py-2 text-left font-medium">Item</th>
                  <th className="px-4 py-2 text-right font-medium">Quantity</th>
                  <th className="px-4 py-2 text-left font-medium">UOM</th>
                  <th className="px-4 py-2 text-right font-medium">Qty (Base)</th>
                  <th className="px-4 py-2 text-left font-medium">Batch/Lot</th>
                  <th className="px-4 py-2 text-left font-medium">Location</th>
                  <th className="px-4 py-2 text-left font-medium">QR</th>
                </tr>
              </thead>
              <tbody>
                {transaction.items.map((item, idx) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="px-4 py-2 text-muted-foreground">{idx + 1}</td>
                    <td className="px-4 py-2">
                      <span className="font-mono text-xs">{item.item.code}</span>
                      <span className="ml-2">{item.item.name}</span>
                    </td>
                    <td className="px-4 py-2 text-right font-mono">
                      {Number(item.quantity).toLocaleString()}
                    </td>
                    <td className="px-4 py-2">{item.uom.code}</td>
                    <td className="px-4 py-2 text-right font-mono">
                      {Number(item.quantityInBaseUom).toLocaleString()}
                    </td>
                    <td className="px-4 py-2">{item.batchLot || "-"}</td>
                    <td className="px-4 py-2">
                      <span className="font-mono text-xs">{item.location.warehouse.code}</span>
                      <span className="mx-1">/</span>
                      <span>{item.location.code}</span>
                    </td>
                    <td className="px-4 py-2">
                      {item.scannedQrData ? (
                        <Badge variant="outline" className="text-xs">
                          <QrCode className="mr-1 h-3 w-3" />
                          Scanned
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Show scanned QR data details */}
          {transaction.items.some((i) => i.scannedQrData) && (
            <div className="mt-4 space-y-2">
              <Separator />
              <p className="text-sm font-medium text-muted-foreground">Scanned QR Data</p>
              {transaction.items
                .filter((i) => i.scannedQrData)
                .map((item) => (
                  <div key={item.id} className="rounded-md bg-muted/50 p-3">
                    <p className="text-xs font-medium">{item.item.code} - {item.item.name}</p>
                    <pre className="mt-1 overflow-x-auto text-xs text-muted-foreground">
                      {item.scannedQrData}
                    </pre>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {transaction.status === "DRAFT" && (
        <OutboundDetailClient transactionId={transaction.id} />
      )}
    </div>
  )
}
