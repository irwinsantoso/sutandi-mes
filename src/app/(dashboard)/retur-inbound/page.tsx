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

export default async function ReturInboundListPage() {
  const transactions = await prisma.inboundTransaction.findMany({
    where: { kind: "RETUR" },
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { name: true } },
      _count: { select: { items: true } },
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
        title="Retur Inbound"
        description="Daftar barang yang dikembalikan oleh customer (menambah stok)"
      >
        <Button render={<Link href="/retur-inbound/new" />}>
          <Plus className="mr-1 h-4 w-4" />
          Retur Inbound Baru
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Semua Retur Inbound ({transactions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              Belum ada retur inbound. Buat yang pertama.
            </div>
          ) : (
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-2 text-left font-medium">No. Transaksi</th>
                    <th className="px-4 py-2 text-left font-medium">Tanggal</th>
                    <th className="px-4 py-2 text-left font-medium">Proyek</th>
                    <th className="px-4 py-2 text-left font-medium">Customer</th>
                    <th className="px-4 py-2 text-right font-medium">Items</th>
                    <th className="px-4 py-2 text-left font-medium">Status</th>
                    <th className="px-4 py-2 text-left font-medium">Dibuat Oleh</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-2">
                        <Link
                          href={`/retur-inbound/${t.id}`}
                          className="font-mono text-xs font-medium text-primary hover:underline"
                        >
                          {t.transactionNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-2">{format(t.receivingDate, "dd MMM yyyy")}</td>
                      <td className="px-4 py-2">{t.projectName || "—"}</td>
                      <td className="px-4 py-2">{t.customerName || "—"}</td>
                      <td className="px-4 py-2 text-right">{t._count.items}</td>
                      <td className="px-4 py-2">
                        <Badge variant={statusVariantMap[t.status]}>{t.status}</Badge>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {t.createdBy.name}
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
