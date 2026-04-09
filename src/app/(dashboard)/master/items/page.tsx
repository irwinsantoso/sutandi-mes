import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { ItemClient } from "./_components/item-client";
import type { ItemColumn } from "./_components/item-columns";

export default async function ItemsPage() {
  const items = await prisma.item.findMany({
    include: {
      baseUom: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const formattedItems: ItemColumn[] = items.map((item) => ({
    id: item.id,
    code: item.code,
    name: item.name,
    category: item.category,
    baseUom: item.baseUom.name,
    isActive: item.isActive,
  }));

  return (
    <div className="space-y-6">
      <PageHeader title="Items" description="Manage your item master data.">
        <Button render={<Link href="/master/items/new" />}>
          <Plus className="h-4 w-4" />
          Add Item
        </Button>
      </PageHeader>
      <ItemClient items={formattedItems} />
    </div>
  );
}
