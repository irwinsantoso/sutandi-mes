import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { InventoryClient } from "./_components/inventory-client";

export default async function InventoryPage() {
  const inventoryRecords = await prisma.inventory.findMany({
    include: {
      item: {
        select: {
          code: true,
          name: true,
          category: true,
        },
      },
      location: {
        select: {
          code: true,
          warehouse: {
            select: {
              code: true,
            },
          },
        },
      },
      uom: {
        select: {
          code: true,
        },
      },
      reservations: {
        include: {
          productionOrderMaterial: {
            select: {
              productionOrder: {
                select: { id: true, orderNumber: true, status: true },
              },
            },
          },
        },
      },
    },
    orderBy: [
      { item: { code: "asc" } },
      { location: { code: "asc" } },
    ],
  });

  const data = inventoryRecords.map((record) => ({
    id: record.id,
    itemCode: record.item.code,
    itemName: record.item.name,
    itemCategory: record.item.category,
    locationCode: `${record.location.warehouse.code} / ${record.location.code}`,
    locationCodeRaw: record.location.code,
    batchLot: record.batchLot,
    quantity: Number(record.quantity),
    reservedQuantity: Number(record.reservedQuantity),
    availableQuantity: Number(record.quantity) - Number(record.reservedQuantity),
    uomCode: record.uom.code,
    updatedAt: record.updatedAt.toISOString(),
    reservations: record.reservations.map((r) => ({
      orderId: r.productionOrderMaterial.productionOrder.id,
      orderNumber: r.productionOrderMaterial.productionOrder.orderNumber,
      orderStatus: r.productionOrderMaterial.productionOrder.status,
      quantity: Number(r.quantity),
    })),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory - Stock Levels"
        description="View current stock levels across all locations."
      />
      <InventoryClient data={data} />
    </div>
  );
}
