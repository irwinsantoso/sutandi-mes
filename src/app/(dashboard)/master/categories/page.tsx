import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/shared/page-header"
import { CategoryClient } from "./_components/category-client"

export default async function CategoriesPage() {
  const categories = await prisma.itemCategory.findMany({
    orderBy: { code: "asc" },
    include: { _count: { select: { items: true } } },
  })

  const data = categories.map((c) => ({
    id: c.id,
    code: c.code,
    name: c.name,
    itemCount: c._count.items,
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Item Categories"
        description="Manage categories used to classify items."
      />
      <CategoryClient data={data} />
    </div>
  )
}
