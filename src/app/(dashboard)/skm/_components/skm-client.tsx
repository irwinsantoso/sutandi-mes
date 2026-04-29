"use client"

import { DataTable } from "@/components/shared/data-table"
import { columns, SkmRow } from "./skm-columns"

interface SkmClientProps {
  data: SkmRow[]
}

export function SkmClient({ data }: SkmClientProps) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="requestNumber"
      searchPlaceholder="Search by request number..."
    />
  )
}
