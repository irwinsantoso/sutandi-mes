import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { MovementClient } from "./_components/movement-client";

export default async function StockMovementsPage() {
  const movements = await prisma.stockMovement.findMany({
    include: {
      item: {
        select: {
          code: true,
          name: true,
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
    },
    orderBy: { createdAt: "desc" },
  });

  const data = movements.map((movement) => ({
    id: movement.id,
    createdAt: movement.createdAt.toISOString(),
    movementType: movement.movementType,
    itemCode: movement.item.code,
    itemName: movement.item.name,
    locationCode: `${movement.location.warehouse.code} / ${movement.location.code}`,
    batchLot: movement.batchLot || "",
    quantity: Number(movement.quantity),
    uomCode: movement.uom.code,
    referenceNumber: movement.referenceNumber || "",
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Movements"
        description="View history of all stock movements and transactions."
      />
      <MovementClient data={data} />
    </div>
  );
}
