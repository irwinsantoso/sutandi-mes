"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, ChevronRight } from "lucide-react";

export type WorkOrderBooking = {
  orderNumber: string;
  status: string;
  type: string;
  requiredQuantity: number;
  consumedQuantity: number;
  remainingQuantity: number;
  uomCode: string;
};

export type LocationDetail = {
  locationCode: string;
  batchLot: string;
  quantity: number;
  reservedQuantity: number;
};

export type DraftOutboundEntry = {
  transactionNumber: string;
  productionOrderNumber: string;
  quantity: number;
  uomCode: string;
  locationCode: string;
};

export type StockSummaryRow = {
  itemId: string;
  itemCode: string;
  itemName: string;
  itemCategory: string;
  uomCode: string;
  totalOnHand: number;
  totalReserved: number;
  totalAvailable: number;
  locations: LocationDetail[];
  workOrders: WorkOrderBooking[];
  draftOutbounds: DraftOutboundEntry[];
};

const categoryColorMap: Record<string, string> = {
  RAW_MATERIAL:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  WIP: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  FINISHED_GOOD:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  PACKAGING:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  CONSUMABLE:
    "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

const categoryLabelMap: Record<string, string> = {
  RAW_MATERIAL: "Raw Material",
  WIP: "WIP",
  FINISHED_GOOD: "Finished Good",
  PACKAGING: "Packaging",
  CONSUMABLE: "Consumable",
};

const statusColorMap: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  IN_PROGRESS:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
};

function formatQty(n: number) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
}

export const stockSummaryColumns: ColumnDef<StockSummaryRow>[] = [
  {
    id: "expand",
    header: "",
    cell: ({ row }) => {
      const hasDetails =
        row.original.locations.length > 1 ||
        row.original.workOrders.length > 0 ||
        row.original.draftOutbounds.length > 0;
      if (!hasDetails) return null;
      return (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={() => row.toggleExpanded()}
        >
          <ChevronRight
            className={`h-4 w-4 transition-transform ${
              row.getIsExpanded() ? "rotate-90" : ""
            }`}
          />
        </Button>
      );
    },
    size: 32,
  },
  {
    accessorKey: "itemCode",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Item Code
        <ArrowUpDown className="ml-1 size-3.5" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="font-mono font-medium">
        {row.getValue("itemCode")}
      </span>
    ),
  },
  {
    accessorKey: "itemName",
    header: "Item Name",
  },
  {
    accessorKey: "itemCategory",
    header: "Category",
    cell: ({ row }) => {
      const category = row.getValue("itemCategory") as string;
      return (
        <Badge className={categoryColorMap[category] || ""}>
          {categoryLabelMap[category] || category}
        </Badge>
      );
    },
  },
  {
    accessorKey: "totalOnHand",
    header: () => <div className="text-right">On Hand</div>,
    cell: ({ row }) => (
      <div className="text-right font-mono">
        {formatQty(row.getValue("totalOnHand"))}
      </div>
    ),
  },
  {
    accessorKey: "totalReserved",
    header: () => <div className="text-right">Reserved</div>,
    cell: ({ row }) => {
      const reserved = row.getValue("totalReserved") as number;
      return (
        <div
          className={`text-right font-mono ${
            reserved > 0
              ? "text-amber-600 dark:text-amber-400"
              : "text-muted-foreground"
          }`}
        >
          {reserved > 0 ? formatQty(reserved) : "-"}
        </div>
      );
    },
  },
  {
    accessorKey: "totalAvailable",
    header: () => <div className="text-right">Available</div>,
    cell: ({ row }) => {
      const available = row.getValue("totalAvailable") as number;
      return (
        <div
          className={`text-right font-mono font-medium ${
            available < 0 ? "text-destructive" : ""
          }`}
        >
          {formatQty(available)}
        </div>
      );
    },
  },
  {
    accessorKey: "uomCode",
    header: "UOM",
  },
  {
    id: "workOrders",
    header: "Booked by WO",
    cell: ({ row }) => {
      const wos = row.original.workOrders;
      if (wos.length === 0) {
        return <span className="text-muted-foreground">-</span>;
      }
      return (
        <div className="flex flex-wrap gap-1">
          {wos.map((wo) => (
            <Badge
              key={wo.orderNumber}
              variant="outline"
              className={statusColorMap[wo.status] || ""}
            >
              {wo.orderNumber}
            </Badge>
          ))}
        </div>
      );
    },
  },
];
