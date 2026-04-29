import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { SplForm } from "./_components/spl-form"

export default async function NewSplPage() {
  const [items, uoms, locations, categories] = await Promise.all([
    prisma.item.findMany({
      where: { isActive: true },
      orderBy: { code: "asc" },
      select: {
        id: true,
        code: true,
        name: true,
        baseUomId: true,
        baseUom: { select: { id: true, code: true, name: true } },
        uomConversions: {
          select: {
            fromUomId: true,
            toUomId: true,
            fromUom: { select: { id: true, code: true, name: true } },
            toUom: { select: { id: true, code: true, name: true } },
          },
        },
      },
    }),
    prisma.uom.findMany({ orderBy: { code: "asc" }, select: { id: true, code: true, name: true } }),
    prisma.location.findMany({
      where: { isActive: true },
      orderBy: { code: "asc" },
      select: {
        id: true,
        code: true,
        name: true,
        warehouse: { select: { code: true, name: true } },
      },
    }),
    prisma.itemCategory.findMany({
      orderBy: { name: "asc" },
      select: { id: true, code: true, name: true },
    }),
  ])

  const serializedItems = items.map((item) => ({
    ...item,
    uomConversions: item.uomConversions,
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="New SPL"
        description="Create a new Surat Pengerjaan Langsung (Direct Work Order)"
      >
        <Button variant="outline" render={<Link href="/spl" />}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to List
        </Button>
      </PageHeader>

      <SplForm items={serializedItems} uoms={uoms} locations={locations} categories={categories} />
    </div>
  )
}
