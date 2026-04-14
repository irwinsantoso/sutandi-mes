"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/shared/data-table"
import { ArrowRight, ArrowUpDown } from "lucide-react"

export type ConversionRow = {
  id: string
  itemCode: string
  itemName: string
  baseUomCode: string
  fromUomCode: string
  toUomCode: string
  conversionFactor: number
}

const columns: ColumnDef<ConversionRow>[] = [
  {
    accessorKey: "itemCode",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Item
        <ArrowUpDown className="ml-1 size-3.5" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-mono font-medium">{row.original.itemCode}</span>
        <span className="text-xs text-muted-foreground">
          {row.original.itemName}
        </span>
      </div>
    ),
  },
  {
    id: "conversion",
    header: "Conversion",
    cell: ({ row }) => (
      <div className="flex items-center gap-2 font-mono text-sm">
        <Badge variant="outline">{row.original.fromUomCode}</Badge>
        <ArrowRight className="size-3.5 text-muted-foreground" />
        <Badge variant="outline">{row.original.toUomCode}</Badge>
      </div>
    ),
  },
  {
    accessorKey: "conversionFactor",
    header: () => <div className="text-right">Factor</div>,
    cell: ({ row }) => (
      <div className="text-right font-mono">
        1 {row.original.fromUomCode} ={" "}
        <span className="font-semibold">
          {row.original.conversionFactor.toLocaleString("en-US", {
            maximumFractionDigits: 6,
          })}
        </span>{" "}
        {row.original.toUomCode}
      </div>
    ),
  },
  {
    accessorKey: "baseUomCode",
    header: "Base UOM",
    cell: ({ row }) => (
      <Badge variant="secondary" className="font-mono">
        {row.original.baseUomCode}
      </Badge>
    ),
  },
]

export function ConversionsClient({ data }: { data: ConversionRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="itemCode"
      searchPlaceholder="Search by item code..."
    />
  )
}
