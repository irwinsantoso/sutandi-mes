import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { WarehouseClient } from "./_components/warehouse-client";

export default async function WarehousesPage() {
  const warehouses = await prisma.warehouse.findMany({
    include: {
      _count: {
        select: { locations: true },
      },
    },
    orderBy: { code: "asc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Warehouses"
        description="Manage warehouses and storage locations."
      />
      <WarehouseClient data={warehouses} />
    </div>
  );
}
