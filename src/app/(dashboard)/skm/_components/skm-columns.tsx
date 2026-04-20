"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowUpDown, Eye } from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"

export type SkmRow = {
  id: string
  requestNumber: string
  requestDate: Date
  status: "DRAFT" | "CONFIRMED" | "CANCELLED"
  itemCount: number
  createdBy: string
  notes: string | null
}

const statusVariantMap: Record<SkmRow["status"], "secondary" | "default" | "destructive"> = {
  DRAFT: "secondary",
  CONFIRMED: "default",
  CANCELLED: "destructive",
}

export const columns: ColumnDef<SkmRow>[] = [
  {
    accessorKey: "requestNumber",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Request #
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="font-medium">{row.getValue("requestNumber")}</span>
    ),
  },
  {
    accessorKey: "requestDate",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Request Date
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => format(row.getValue("requestDate"), "dd MMM yyyy"),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as SkmRow["status"]
      return <Badge variant={statusVariantMap[status]}>{status}</Badge>
    },
  },
  {
    accessorKey: "itemCount",
    header: "Items",
    cell: ({ row }) => row.getValue("itemCount"),
  },
  {
    accessorKey: "notes",
    header: "Notes",
    cell: ({ row }) => {
      const notes = row.getValue("notes") as string | null
      return notes ? (
        <span className="max-w-[200px] truncate block">{notes}</span>
      ) : (
        "-"
      )
    },
  },
  {
    accessorKey: "createdBy",
    header: "Created By",
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => (
      <Button variant="ghost" size="sm" render={<Link href={`/skm/${row.original.id}`} />}>
        <Eye className="mr-1 h-4 w-4" />
        View
      </Button>
    ),
  },
]
