"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowUpDown, Eye } from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"

export type ProductionOrderRow = {
  id: string
  orderNumber: string
  type: "WIP" | "FINISHED_GOOD"
  description: string | null
  status: "DRAFT" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
  plannedStartDate: Date | null
  createdBy: { name: string }
  _count: { materials: number; outputs: number }
}

const typeVariantMap: Record<
  ProductionOrderRow["type"],
  "default" | "secondary" | "destructive" | "outline"
> = {
  WIP: "outline",
  FINISHED_GOOD: "default",
}

const typeLabels: Record<ProductionOrderRow["type"], string> = {
  WIP: "WIP",
  FINISHED_GOOD: "Finished Good",
}

const statusVariantMap: Record<
  ProductionOrderRow["status"],
  "default" | "secondary" | "destructive" | "outline"
> = {
  DRAFT: "secondary",
  IN_PROGRESS: "default",
  COMPLETED: "default",
  CANCELLED: "destructive",
}

const statusLabels: Record<ProductionOrderRow["status"], string> = {
  DRAFT: "Draft",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
}

export const columns: ColumnDef<ProductionOrderRow>[] = [
  {
    accessorKey: "orderNumber",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Order Number
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="font-medium">{row.getValue("orderNumber")}</span>
    ),
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => {
      const type = row.getValue("type") as ProductionOrderRow["type"]
      return (
        <Badge
          variant={typeVariantMap[type]}
          className={
            type === "WIP"
              ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
              : "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400"
          }
        >
          {typeLabels[type]}
        </Badge>
      )
    },
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => (
      <span className="max-w-[200px] truncate">
        {row.getValue("description") || "-"}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as ProductionOrderRow["status"]
      return (
        <Badge
          variant={statusVariantMap[status]}
          className={
            status === "IN_PROGRESS"
              ? "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400"
              : status === "COMPLETED"
                ? "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400"
                : undefined
          }
        >
          {statusLabels[status]}
        </Badge>
      )
    },
  },
  {
    accessorKey: "plannedStartDate",
    header: "Planned Start",
    cell: ({ row }) => {
      const date = row.getValue("plannedStartDate") as Date | null
      return date ? format(new Date(date), "dd MMM yyyy") : "-"
    },
  },
  {
    accessorKey: "createdBy",
    header: "Created By",
    cell: ({ row }) => {
      const createdBy = row.original.createdBy
      return createdBy.name
    },
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => {
      const order = row.original
      return (
        <Link href={`/production-orders/${order.id}`}>
          <Button variant="ghost" size="sm">
            <Eye className="mr-2 h-4 w-4" />
            View
          </Button>
        </Link>
      )
    },
  },
]
