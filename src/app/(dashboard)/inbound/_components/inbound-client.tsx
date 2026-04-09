"use client"

import { DataTable } from "@/components/shared/data-table"
import { columns, InboundRow } from "./inbound-columns"

interface InboundClientProps {
  data: InboundRow[]
}

export function InboundClient({ data }: InboundClientProps) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="transactionNumber"
      searchPlaceholder="Search by transaction number..."
    />
  )
}
