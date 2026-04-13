"use client";

import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ArrowUpDown } from "lucide-react";
import { format } from "date-fns";
import { LabelDialog } from "./label-dialog";

export type ReservationInfo = {
  orderId: string;
  orderNumber: string;
  orderStatus: string;
  quantity: number;
};

export type InventoryRow = {
  id: string;
  itemCode: string;
  itemName: string;
  itemCategory: string;
  locationCode: string;
  locationCodeRaw: string;
  batchLot: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  uomCode: string;
  updatedAt: string;
  reservations: ReservationInfo[];
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

export const inventoryColumns: ColumnDef<InventoryRow>[] = [
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
    header: () => <div className="text-right">On Hand</div>,
    cell: ({ row }) => {
      const quantity = row.getValue("quantity") as number;
      return (
        <div className="text-right font-mono">
          {quantity.toLocaleString("en-US", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 4,
          })}
        </div>
      );
    },
  },
  {
    accessorKey: "reservedQuantity",
    header: () => <div className="text-right">Reserved</div>,
    cell: ({ row }) => {
      const reserved = row.getValue("reservedQuantity") as number;
      const reservations = row.original.reservations;
      const uom = row.original.uomCode;

      if (reserved <= 0) {
        return <div className="text-right font-mono text-muted-foreground">-</div>;
      }

      const formatted = reserved.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 4,
      });

      if (reservations.length === 0) {
        return (
          <div className="text-right font-mono text-amber-600 dark:text-amber-400">
            {formatted}
          </div>
        );
      }

      return (
        <div className="text-right">
          <Popover>
            <PopoverTrigger
              render={
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto px-1 py-0.5 font-mono text-amber-600 underline-offset-2 hover:underline dark:text-amber-400"
                />
              }
            >
              {formatted}
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 p-0">
              <div className="border-b px-3 py-2 text-xs font-medium text-muted-foreground">
                Reserved by production orders
              </div>
              <ul className="divide-y">
                {reservations.map((r) => (
                  <li
                    key={r.orderId}
                    className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                  >
                    <Link
                      href={`/production-orders/${r.orderId}`}
                      className="font-mono text-primary hover:underline"
                    >
                      {r.orderNumber}
                    </Link>
                    <span className="font-mono">
                      {r.quantity.toLocaleString("en-US", {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 4,
                      })}{" "}
                      <span className="text-muted-foreground">{uom}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </PopoverContent>
          </Popover>
        </div>
      );
    },
  },
  {
    accessorKey: "availableQuantity",
    header: () => <div className="text-right">Available</div>,
    cell: ({ row }) => {
      const available = row.getValue("availableQuantity") as number;
      return (
        <div className="text-right font-mono font-medium">
          {available.toLocaleString("en-US", {
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
    accessorKey: "updatedAt",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Updated At
        <ArrowUpDown className="ml-1 size-3.5" />
      </Button>
    ),
    cell: ({ row }) => {
      const dateStr = row.getValue("updatedAt") as string;
      return (
        <span className="text-muted-foreground">
          {format(new Date(dateStr), "dd MMM yyyy HH:mm")}
        </span>
      );
    },
  },
  {
    id: "label",
    header: () => <div className="text-center">Label</div>,
    cell: ({ row }) => (
      <div className="flex justify-center">
        <LabelDialog
          itemCode={row.original.itemCode}
          itemName={row.original.itemName}
          locationCode={row.original.locationCodeRaw}
          locationDisplay={row.original.locationCode}
          batchLot={row.original.batchLot}
          uomCode={row.original.uomCode}
        />
      </div>
    ),
  },
];
