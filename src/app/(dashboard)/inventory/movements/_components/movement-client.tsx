"use client";

import { DataTable } from "@/components/shared/data-table";
import { movementColumns, type MovementRow } from "./movement-columns";

interface MovementClientProps {
  data: MovementRow[];
}

export function MovementClient({ data }: MovementClientProps) {
  return (
    <DataTable
      columns={movementColumns}
      data={data}
      searchKey="referenceNumber"
      searchPlaceholder="Search by reference number..."
    />
  );
}
