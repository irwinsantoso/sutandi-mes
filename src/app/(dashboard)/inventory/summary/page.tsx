import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { StockSummaryClient } from "./_components/stock-summary-client";

export default async function StockSummaryPage() {
  // Fetch inventory grouped by item (sum across locations)
  const inventoryRecords = await prisma.inventory.findMany({
    include: {
      item: {
        select: {
          id: true,
          code: true,
          name: true,
          category: { select: { code: true } },
        },
      },
      location: {
        select: {
          code: true,
          warehouse: { select: { code: true } },
        },
      },
      uom: {
        select: { code: true },
      },
    },
    orderBy: [
      { item: { code: "asc" } },
    ],
  });

  // Fetch active production orders (DRAFT + IN_PROGRESS) with their materials
  const activeProductionOrders = await prisma.productionOrder.findMany({
    where: {
      status: { in: ["DRAFT", "IN_PROGRESS"] },
    },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      type: true,
      materials: {
        select: {
          itemId: true,
          requiredQuantity: true,
          consumedQuantity: true,
          uom: { select: { code: true } },
        },
      },
    },
    orderBy: { orderNumber: "asc" },
  });

  // Build a map: itemId → list of work orders booking that item
  const woBookingsByItem = new Map<
    string,
    Array<{
      orderNumber: string;
      status: string;
      type: string;
      requiredQuantity: number;
      consumedQuantity: number;
      remainingQuantity: number;
      uomCode: string;
    }>
  >();

  for (const po of activeProductionOrders) {
    for (const mat of po.materials) {
      const remaining = Number(mat.requiredQuantity) - Number(mat.consumedQuantity);
      if (remaining <= 0) continue;

      const list = woBookingsByItem.get(mat.itemId) || [];
      list.push({
        orderNumber: po.orderNumber,
        status: po.status,
        type: po.type,
        requiredQuantity: Number(mat.requiredQuantity),
        consumedQuantity: Number(mat.consumedQuantity),
        remainingQuantity: remaining,
        uomCode: mat.uom.code,
      });
      woBookingsByItem.set(mat.itemId, list);
    }
  }

  // Aggregate inventory by item (sum across all locations/batches)
  const itemAggregation = new Map<
    string,
    {
      itemId: string;
      itemCode: string;
      itemName: string;
      itemCategory: string;
      uomCode: string;
      totalOnHand: number;
      totalReserved: number;
      locations: Array<{
        locationCode: string;
        batchLot: string;
        quantity: number;
        reservedQuantity: number;
      }>;
    }
  >();

  for (const record of inventoryRecords) {
    const key = record.item.id;
    const existing = itemAggregation.get(key);
    const qty = Number(record.quantity);
    const reserved = Number(record.reservedQuantity);

    if (existing) {
      existing.totalOnHand += qty;
      existing.totalReserved += reserved;
      existing.locations.push({
        locationCode: `${record.location.warehouse.code} / ${record.location.code}`,
        batchLot: record.batchLot,
        quantity: qty,
        reservedQuantity: reserved,
      });
    } else {
      itemAggregation.set(key, {
        itemId: record.item.id,
        itemCode: record.item.code,
        itemName: record.item.name,
        itemCategory: record.item.category.code,
        uomCode: record.uom.code,
        totalOnHand: qty,
        totalReserved: reserved,
        locations: [
          {
            locationCode: `${record.location.warehouse.code} / ${record.location.code}`,
            batchLot: record.batchLot,
            quantity: qty,
            reservedQuantity: reserved,
          },
        ],
      });
    }
  }

  const data = Array.from(itemAggregation.values()).map((agg) => ({
    itemId: agg.itemId,
    itemCode: agg.itemCode,
    itemName: agg.itemName,
    itemCategory: agg.itemCategory,
    uomCode: agg.uomCode,
    totalOnHand: agg.totalOnHand,
    totalReserved: agg.totalReserved,
    totalAvailable: agg.totalOnHand - agg.totalReserved,
    locations: agg.locations,
    workOrders: woBookingsByItem.get(agg.itemId) || [],
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Summary"
        description="Inventory overview per item with work order bookings."
      />
      <StockSummaryClient data={data} />
    </div>
  );
}
