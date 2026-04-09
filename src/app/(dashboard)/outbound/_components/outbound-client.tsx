"use client"

import { DataTable } from "@/components/shared/data-table"
import { columns, OutboundRow } from "./outbound-columns"

interface OutboundClientProps {
  data: OutboundRow[]
}

export function OutboundClient({ data }: OutboundClientProps) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="transactionNumber"
      searchPlaceholder="Search by transaction number..."
    />
  )
}
