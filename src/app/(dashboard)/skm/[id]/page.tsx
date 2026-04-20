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
import { format } from "date-fns"
import { SkmDetailClient } from "./_components/skm-detail-client"

interface SkmDetailPageProps {
  params: Promise<{ id: string }>
}

const statusVariantMap: Record<string, "secondary" | "default" | "destructive"> = {
  DRAFT: "secondary",
  CONFIRMED: "default",
  CANCELLED: "destructive",
}

export default async function SkmDetailPage({ params }: SkmDetailPageProps) {
  const { id } = await params

  const request = await prisma.materialRequest.findUnique({
    where: { id },
    include: {
      createdBy: { select: { name: true } },
      items: { orderBy: { lineNumber: "asc" } },
    },
  })

  if (!request) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <PageHeader title={`SKM ${request.requestNumber}`}>
        <Badge variant={statusVariantMap[request.status]}>
          {request.status}
        </Badge>
      </PageHeader>

      <SkmDetailClient requestId={request.id} status={request.status} />

      <Card>
        <CardHeader>
          <CardTitle>Request Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Request #</p>
              <p className="font-medium">{request.requestNumber}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Request Date</p>
              <p className="font-medium">
                {format(request.requestDate, "dd MMM yyyy")}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Created By</p>
              <p className="font-medium">{request.createdBy.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Created At</p>
              <p className="font-medium">
                {format(request.createdAt, "dd MMM yyyy HH:mm")}
              </p>
            </div>
            {request.notes && (
              <div className="sm:col-span-2 lg:col-span-3">
                <p className="text-sm text-muted-foreground">Notes</p>
                <p className="font-medium">{request.notes}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Material Items ({request.items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Item Code</TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead className="text-right">Qty Need</TableHead>
                  <TableHead className="text-right">Qty Buy</TableHead>
                  <TableHead className="text-right">Qty Stock</TableHead>
                  <TableHead>UOM</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {request.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.lineNumber}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {item.itemCode}
                    </TableCell>
                    <TableCell>{item.itemName}</TableCell>
                    <TableCell className="text-right">
                      {item.qtyRequired.toString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.qtyBuy ? item.qtyBuy.toString() : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.qtyStock ? item.qtyStock.toString() : "-"}
                    </TableCell>
                    <TableCell>{item.uom}</TableCell>
                    <TableCell>{item.departmentName || "-"}</TableCell>
                    <TableCell className="max-w-[150px] truncate">
                      {item.notes || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
