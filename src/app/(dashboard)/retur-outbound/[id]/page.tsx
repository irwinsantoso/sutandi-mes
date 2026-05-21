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
import { ReturOutboundDetailClient } from "./_components/retur-outbound-detail-client"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ReturOutboundDetailPage({ params }: PageProps) {
  const { id } = await params

  const t = await prisma.outboundTransaction.findUnique({
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
              warehouse: { select: { code: true, name: true } },
            },
          },
        },
      },
    },
  })

  if (!t || t.kind !== "RETUR") notFound()

  const statusVariantMap: Record<string, "secondary" | "default" | "destructive"> = {
    DRAFT: "secondary",
    CONFIRMED: "default",
    CANCELLED: "destructive",
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Retur Outbound ${t.transactionNumber}`}
        description="Pengembalian barang ke supplier"
      >
        <Button variant="outline" render={<Link href="/retur-outbound" />}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Kembali ke Daftar
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            Detail Retur
            <Badge variant={statusVariantMap[t.status]}>{t.status}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">No. Transaksi</p>
              <p className="font-mono font-medium">{t.transactionNumber}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tanggal Retur</p>
              <p className="font-medium">{format(t.issueDate, "dd MMM yyyy")}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Dibuat Oleh</p>
              <p className="font-medium">{t.createdBy.name}</p>
            </div>
            {t.projectName && (
              <div>
                <p className="text-sm text-muted-foreground">Nama Proyek</p>
                <p className="font-medium">{t.projectName}</p>
              </div>
            )}
            {t.supplierName && (
              <div>
                <p className="text-sm text-muted-foreground">Supplier</p>
                <p className="font-medium">{t.supplierName}</p>
              </div>
            )}
            {t.notes && (
              <div className="sm:col-span-2 lg:col-span-3">
                <p className="text-sm text-muted-foreground">Catatan</p>
                <p className="font-medium">{t.notes}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Item Retur ({t.items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-2 text-left font-medium">No.</th>
                  <th className="px-4 py-2 text-left font-medium">Item</th>
                  <th className="px-4 py-2 text-left font-medium">Nama</th>
                  <th className="px-4 py-2 text-right font-medium">Qty</th>
                  <th className="px-4 py-2 text-left font-medium">UOM</th>
                  <th className="px-4 py-2 text-left font-medium">Batch/Lot</th>
                  <th className="px-4 py-2 text-left font-medium">Asal Stok</th>
                  <th className="px-4 py-2 text-left font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {t.items.map((it, idx) => (
                  <tr key={it.id} className="border-b last:border-0">
                    <td className="px-4 py-2 text-muted-foreground">{idx + 1}</td>
                    <td className="px-4 py-2 font-mono text-xs">{it.item.code}</td>
                    <td className="px-4 py-2">{it.item.name}</td>
                    <td className="px-4 py-2 text-right font-mono">
                      {Number(it.quantity).toLocaleString()}
                    </td>
                    <td className="px-4 py-2">{it.uom.code}</td>
                    <td className="px-4 py-2">{it.batchLot || "-"}</td>
                    <td className="px-4 py-2">
                      <span className="font-mono text-xs">{it.location.warehouse.code}</span>
                      <span className="mx-1">/</span>
                      <span>{it.location.code}</span>
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {it.notes || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {t.status === "DRAFT" && <ReturOutboundDetailClient id={t.id} />}
    </div>
  )
}
