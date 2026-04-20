import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { InventoryClient } from "./_components/inventory-client";

export default async function InventoryPage() {
  const [inventoryRecords, activePoMaterials] = await Promise.all([
    prisma.inventory.findMany({
      include: {
        item: {
          select: {
            code: true,
            name: true,
            category: { select: { code: true } },
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
    }),
    prisma.productionOrderMaterial.findMany({
      where: {
        productionOrder: { status: { in: ["DRAFT", "IN_PROGRESS"] } },
      },
      select: {
        itemId: true,
        requiredQuantity: true,
        consumedQuantity: true,
        productionOrder: {
          select: { id: true, orderNumber: true, status: true },
        },
      },
    }),
  ]);

  // Build itemId → total remaining WO quantity
  const woRemainingByItem = new Map<string, number>();
  for (const mat of activePoMaterials) {
    const remaining = Number(mat.requiredQuantity) - Number(mat.consumedQuantity);
    if (remaining <= 0) continue;
    woRemainingByItem.set(mat.itemId, (woRemainingByItem.get(mat.itemId) ?? 0) + remaining);
  }

  const data = inventoryRecords.map((record) => {
    const dbReserved = Number(record.reservedQuantity);
    // Use WO remaining as reserved when DB value is stale (0 despite active POs).
    const woRemaining = woRemainingByItem.get(record.itemId) ?? 0;
    const reservedQuantity = dbReserved > 0 ? dbReserved : woRemaining;

    return {
      id: record.id,
      itemCode: record.item.code,
      itemName: record.item.name,
      itemCategory: record.item.category.code,
      locationCode: `${record.location.warehouse.code} / ${record.location.code}`,
      locationCodeRaw: record.location.code,
      batchLot: record.batchLot,
      quantity: Number(record.quantity),
      reservedQuantity,
      availableQuantity: Number(record.quantity) - reservedQuantity,
      uomCode: record.uom.code,
      updatedAt: record.updatedAt.toISOString(),
      reservations: record.reservations.map((r) => ({
        orderId: r.productionOrderMaterial.productionOrder.id,
        orderNumber: r.productionOrderMaterial.productionOrder.orderNumber,
        orderStatus: r.productionOrderMaterial.productionOrder.status,
        quantity: Number(r.quantity),
      })),
    };
  });

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
