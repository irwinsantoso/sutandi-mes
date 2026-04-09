import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/shared/page-header"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { format } from "date-fns"
import { generateQrDataUrl } from "@/lib/qr-code"
import { InboundDetailClient } from "./_components/inbound-detail-client"
import { QrCodeDisplay } from "./_components/qr-code-display"

interface InboundDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function InboundDetailPage({
  params,
}: InboundDetailPageProps) {
  const { id } = await params

  const transaction = await prisma.inboundTransaction.findUnique({
    where: { id },
    include: {
      createdBy: { select: { name: true } },
      items: {
        include: {
          item: { select: { code: true, name: true } },
          uom: { select: { code: true, name: true } },
          location: {
            select: {
              code: true,
              name: true,
              warehouse: { select: { code: true } },
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

  const qrItems = await Promise.all(
    transaction.items.map(async (item) => {
      let qrDataUrl = ""
      if (item.qrCodeData) {
        try {
          const payload = JSON.parse(item.qrCodeData)
          payload.id = item.id
          qrDataUrl = await generateQrDataUrl(payload)
        } catch {
          qrDataUrl = ""
        }
      }
      return {
        id: item.id,
        itemCode: item.item.code,
        itemName: item.item.name,
        batchLot: item.batchLot,
        quantity: item.quantity.toString(),
        uomCode: item.uom.code,
        qrDataUrl,
      }
    })
  )

  return (
    <div className="space-y-6">
      <PageHeader title={`Inbound ${transaction.transactionNumber}`}>
        <Badge variant={statusVariantMap[transaction.status]}>
          {transaction.status}
        </Badge>
      </PageHeader>

      <InboundDetailClient
        transactionId={transaction.id}
        status={transaction.status}
      />

      <Card>
        <CardHeader>
          <CardTitle>Transaction Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Transaction #</p>
              <p className="font-medium">{transaction.transactionNumber}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Supplier</p>
              <p className="font-medium">{transaction.supplier || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Reference #</p>
              <p className="font-medium">
                {transaction.referenceNumber || "-"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Receiving Date</p>
              <p className="font-medium">
                {format(transaction.receivingDate, "dd MMM yyyy")}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Created By</p>
              <p className="font-medium">{transaction.createdBy.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Created At</p>
              <p className="font-medium">
                {format(transaction.createdAt, "dd MMM yyyy HH:mm")}
              </p>
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

      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>UOM</TableHead>
                  <TableHead>Qty (Base UOM)</TableHead>
                  <TableHead>Batch / Lot</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Expiry Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transaction.items.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium">{item.item.code}</span>
                        <br />
                        <span className="text-sm text-muted-foreground">
                          {item.item.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{item.quantity.toString()}</TableCell>
                    <TableCell>{item.uom.code}</TableCell>
                    <TableCell>{item.quantityInBaseUom.toString()}</TableCell>
                    <TableCell>{item.batchLot || "-"}</TableCell>
                    <TableCell>
                      {item.location.warehouse.code} / {item.location.code}
                    </TableCell>
                    <TableCell>
                      {item.expiryDate
                        ? format(item.expiryDate, "dd MMM yyyy")
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>QR Codes</CardTitle>
        </CardHeader>
        <CardContent>
          <QrCodeDisplay items={qrItems} />
        </CardContent>
      </Card>
    </div>
  )
}
