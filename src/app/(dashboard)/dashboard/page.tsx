import { Boxes, PackagePlus, Factory, AlertTriangle } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const [totalItems, pendingInbound, activeOrders, inventoryByItem] =
    await Promise.all([
      prisma.item.count({ where: { isActive: true } }),
      prisma.inboundTransaction.count({ where: { status: "DRAFT" } }),
      prisma.productionOrder.count({ where: { status: "IN_PROGRESS" } }),
      prisma.inventory.groupBy({
        by: ["itemId"],
        _sum: { quantity: true, reservedQuantity: true },
      }),
    ]);

  const itemsWithStock = new Set(
    inventoryByItem
      .filter(
        (r) =>
          Number(r._sum.quantity ?? 0) - Number(r._sum.reservedQuantity ?? 0) >
          0,
      )
      .map((r) => r.itemId),
  );
  const lowStockItems = Math.max(totalItems - itemsWithStock.size, 0);

  const kpiCards = [
    {
      title: "Total Items",
      value: totalItems.toLocaleString("en-US"),
      icon: Boxes,
      description: "Active items in master data",
    },
    {
      title: "Pending Inbound",
      value: pendingInbound.toLocaleString("en-US"),
      icon: PackagePlus,
      description: "Draft receipts awaiting confirmation",
    },
    {
      title: "Active Production Orders",
      value: activeOrders.toLocaleString("en-US"),
      icon: Factory,
      description: "Currently in progress",
    },
    {
      title: "Low Stock Items",
      value: lowStockItems.toLocaleString("en-US"),
      icon: AlertTriangle,
      description: "No available stock across locations",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to Sutandi MES Warehouse Management.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <card.icon className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">
                {card.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
