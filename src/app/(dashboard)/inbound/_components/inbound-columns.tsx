"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowUpDown, Eye } from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"

export type InboundRow = {
  id: string
  transactionNumber: string
  supplier: string | null
  referenceNumber: string | null
  receivingDate: Date
  status: "DRAFT" | "CONFIRMED" | "CANCELLED"
  itemCount: number
  createdBy: string
}

export const columns: ColumnDef<InboundRow>[] = [
  {
    accessorKey: "transactionNumber",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Transaction #
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="font-medium">{row.getValue("transactionNumber")}</span>
    ),
  },
  {
    accessorKey: "supplier",
    header: "Supplier",
    cell: ({ row }) => row.getValue("supplier") || "-",
  },
  {
    accessorKey: "referenceNumber",
    header: "Reference #",
    cell: ({ row }) => row.getValue("referenceNumber") || "-",
  },
  {
    accessorKey: "receivingDate",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Receiving Date
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => format(row.getValue("receivingDate"), "dd MMM yyyy"),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as InboundRow["status"]
      const variantMap: Record<InboundRow["status"], "secondary" | "default" | "destructive"> = {
        DRAFT: "secondary",
        CONFIRMED: "default",
        CANCELLED: "destructive",
      }
      return <Badge variant={variantMap[status]}>{status}</Badge>
    },
  },
  {
    accessorKey: "itemCount",
    header: "Items",
    cell: ({ row }) => row.getValue("itemCount"),
  },
  {
    accessorKey: "createdBy",
    header: "Created By",
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => {
      const inbound = row.original
      return (
        <Button variant="ghost" size="sm" render={<Link href={`/inbound/${inbound.id}`} />}>
          <Eye className="mr-1 h-4 w-4" />
          View
        </Button>
      )
    },
  },
]
