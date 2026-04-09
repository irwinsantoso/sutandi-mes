"use client"

import { DataTable } from "@/components/shared/data-table"
import {
  columns,
  type ProductionOrderRow,
} from "./production-order-columns"

interface ProductionOrderClientProps {
  data: ProductionOrderRow[]
}

export function ProductionOrderClient({ data }: ProductionOrderClientProps) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="orderNumber"
      searchPlaceholder="Search by order number..."
    />
  )
}
