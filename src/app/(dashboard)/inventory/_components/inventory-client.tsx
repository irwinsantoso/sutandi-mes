"use client";

import { DataTable } from "@/components/shared/data-table";
import { inventoryColumns, type InventoryRow } from "./inventory-columns";

interface InventoryClientProps {
  data: InventoryRow[];
}

export function InventoryClient({ data }: InventoryClientProps) {
  return (
    <DataTable
      columns={inventoryColumns}
      data={data}
      searchKey="itemCode"
      searchPlaceholder="Search by item code..."
    />
  );
}
