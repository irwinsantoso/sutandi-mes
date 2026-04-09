import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { ItemForm } from "../_components/item-form";

export default async function NewItemPage() {
  const uoms = await prisma.uom.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="New Item" description="Create a new item in the master data." />
      <ItemForm uoms={uoms} />
    </div>
  );
}
