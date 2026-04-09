"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";
import { format } from "date-fns";

export type MovementRow = {
  id: string;
  createdAt: string;
  movementType: "INBOUND" | "OUTBOUND" | "ADJUSTMENT" | "TRANSFER" | "PRODUCTION";
  itemCode: string;
  itemName: string;
  locationCode: string;
  batchLot: string;
  quantity: number;
  uomCode: string;
  referenceNumber: string;
};

const movementTypeColorMap: Record<string, string> = {
  INBOUND:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  OUTBOUND: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  ADJUSTMENT:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  TRANSFER:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  PRODUCTION:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
};

export const movementColumns: ColumnDef<MovementRow>[] = [
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Date/Time
        <ArrowUpDown className="ml-1 size-3.5" />
      </Button>
    ),
    cell: ({ row }) => {
      const dateStr = row.getValue("createdAt") as string;
      return (
        <span className="text-muted-foreground">
          {format(new Date(dateStr), "dd MMM yyyy HH:mm:ss")}
        </span>
      );
    },
  },
  {
    accessorKey: "movementType",
    header: "Type",
    cell: ({ row }) => {
      const type = row.getValue("movementType") as string;
      return (
        <Badge className={movementTypeColorMap[type] || ""}>
          {type}
        </Badge>
      );
    },
  },
  {
    accessorKey: "itemCode",
    header: "Item Code",
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
    accessorKey: "locationCode",
    header: "Location",
  },
  {
    accessorKey: "batchLot",
    header: "Batch/Lot",
    cell: ({ row }) => {
      const value = row.getValue("batchLot") as string;
      return (
        <span className={value ? "" : "text-muted-foreground"}>
          {value || "-"}
        </span>
      );
    },
  },
  {
    accessorKey: "quantity",
    header: () => <div className="text-right">Quantity</div>,
    cell: ({ row }) => {
      const quantity = row.getValue("quantity") as number;
      const isPositive = quantity >= 0;
      return (
        <div
          className={`text-right font-mono ${
            isPositive
              ? "text-green-600 dark:text-green-400"
              : "text-red-600 dark:text-red-400"
          }`}
        >
          {isPositive ? "+" : ""}
          {quantity.toLocaleString("en-US", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 4,
          })}
        </div>
      );
    },
  },
  {
    accessorKey: "uomCode",
    header: "UOM",
  },
  {
    accessorKey: "referenceNumber",
    header: "Reference",
    cell: ({ row }) => {
      const value = row.getValue("referenceNumber") as string;
      return (
        <span className={value ? "font-mono" : "text-muted-foreground"}>
          {value || "-"}
        </span>
      );
    },
  },
];
