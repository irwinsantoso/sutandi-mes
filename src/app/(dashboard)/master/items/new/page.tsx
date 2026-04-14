import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { ItemForm } from "../_components/item-form";

export default async function NewItemPage() {
  const [uoms, categories] = await Promise.all([
    prisma.uom.findMany({ orderBy: { name: "asc" } }),
    prisma.itemCategory.findMany({ orderBy: { code: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="New Item" description="Create a new item in the master data." />
      <ItemForm uoms={uoms} categories={categories} />
    </div>
  );
}
