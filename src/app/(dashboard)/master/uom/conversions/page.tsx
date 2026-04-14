import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/shared/page-header"
import { ConversionsClient } from "./_components/conversions-client"

export default async function UomConversionsPage() {
  const conversions = await prisma.uomConversion.findMany({
    include: {
      item: { select: { code: true, name: true, baseUom: { select: { code: true } } } },
      fromUom: { select: { code: true } },
      toUom: { select: { code: true } },
    },
    orderBy: [{ item: { code: "asc" } }, { fromUom: { code: "asc" } }],
  })

  const data = conversions.map((c) => ({
    id: c.id,
    itemCode: c.item.code,
    itemName: c.item.name,
    baseUomCode: c.item.baseUom.code,
    fromUomCode: c.fromUom.code,
    toUomCode: c.toUom.code,
    conversionFactor: Number(c.conversionFactor),
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="UOM Conversions"
        description="Per-item conversion factors between units. Conversions chain through intermediate UOMs (e.g. bundle → pack → pcs)."
      />
      <ConversionsClient data={data} />
    </div>
  )
}
