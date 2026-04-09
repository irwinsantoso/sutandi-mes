import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { ItemForm } from "../../_components/item-form";

export default async function EditItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [item, uoms] = await Promise.all([
    prisma.item.findUnique({
      where: { id },
    }),
    prisma.uom.findMany({
      orderBy: { name: "asc" },
    }),
  ]);

  if (!item) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit Item"
        description={`Editing item: ${item.name}`}
      />
      <ItemForm
        uoms={uoms}
        item={{
          id: item.id,
          code: item.code,
          name: item.name,
          description: item.description,
          category: item.category,
          baseUomId: item.baseUomId,
        }}
      />
    </div>
  );
}
