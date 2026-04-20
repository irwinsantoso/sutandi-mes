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

  // Fetch DRAFT outbound transactions linked to production orders
  const draftOutboundTransactions = await prisma.outboundTransaction.findMany({
    where: {
      status: "DRAFT",
      productionOrderId: { not: null },
    },
    select: {
      transactionNumber: true,
      productionOrder: { select: { orderNumber: true } },
      items: {
        select: {
          itemId: true,
          quantity: true,
          uom: { select: { code: true } },
          location: {
            select: { code: true, warehouse: { select: { code: true } } },
          },
        },
      },
    },
    orderBy: { transactionNumber: "asc" },
  });

  // Build a map: itemId → list of draft outbound entries
  const draftOutboundsByItem = new Map<
    string,
    Array<{
      transactionNumber: string;
      productionOrderNumber: string;
      quantity: number;
      uomCode: string;
      locationCode: string;
    }>
  >();

  for (const tx of draftOutboundTransactions) {
    for (const item of tx.items) {
      const list = draftOutboundsByItem.get(item.itemId) || [];
      list.push({
        transactionNumber: tx.transactionNumber,
        productionOrderNumber: tx.productionOrder!.orderNumber,
        quantity: Number(item.quantity),
        uomCode: item.uom.code,
        locationCode: `${item.location.warehouse.code} / ${item.location.code}`,
      });
      draftOutboundsByItem.set(item.itemId, list);
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

  const data = Array.from(itemAggregation.values()).map((agg) => {
    const workOrders = woBookingsByItem.get(agg.itemId) || [];
    const draftOutbounds = draftOutboundsByItem.get(agg.itemId) || [];
    // Reserved = total remaining commitment across active WOs (required − consumed).
    // This is authoritative regardless of whether InventoryReservation records exist.
    const totalReserved = workOrders.reduce((sum, wo) => sum + wo.remainingQuantity, 0);
    return {
      itemId: agg.itemId,
      itemCode: agg.itemCode,
      itemName: agg.itemName,
      itemCategory: agg.itemCategory,
      uomCode: agg.uomCode,
      totalOnHand: agg.totalOnHand,
      totalReserved,
      totalAvailable: agg.totalOnHand - totalReserved,
      locations: agg.locations,
      workOrders,
      draftOutbounds,
    };
  });

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
