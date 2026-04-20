"use client";

import { useState, Fragment } from "react";
import {
  ColumnFiltersState,
  SortingState,
  ExpandedState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getExpandedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  stockSummaryColumns,
  type StockSummaryRow,
} from "./stock-summary-columns";
import Link from "next/link";
import { Package } from "lucide-react";

interface StockSummaryClientProps {
  data: StockSummaryRow[];
}

function formatQty(n: number) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
}

const statusColorMap: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  IN_PROGRESS:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
};

export function StockSummaryClient({ data }: StockSummaryClientProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [expanded, setExpanded] = useState<ExpandedState>({});

  const table = useReactTable({
    data,
    columns: stockSummaryColumns,
    state: { sorting, columnFilters, expanded },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    initialState: {
      pagination: { pageSize: 20 },
    },
  });

  const colCount = stockSummaryColumns.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center">
        <Input
          placeholder="Search by item code..."
          value={
            (table.getColumn("itemCode")?.getFilterValue() as string) ?? ""
          }
          onChange={(event) =>
            table.getColumn("itemCode")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <Fragment key={row.id}>
                  <TableRow data-state={row.getIsSelected() && "selected"}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>

                  {/* Expanded detail row */}
                  {row.getIsExpanded() && (
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableCell colSpan={colCount} className="p-0">
                        <div className="px-8 py-4 space-y-4">
                          {/* Location breakdown */}
                          {row.original.locations.length > 1 && (
                            <div>
                              <h4 className="text-sm font-medium mb-2">
                                Stock by Location
                              </h4>
                              <div className="rounded-md border">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b bg-muted/50">
                                      <th className="px-3 py-1.5 text-left font-medium">
                                        Location
                                      </th>
                                      <th className="px-3 py-1.5 text-left font-medium">
                                        Batch/Lot
                                      </th>
                                      <th className="px-3 py-1.5 text-right font-medium">
                                        On Hand
                                      </th>
                                      <th className="px-3 py-1.5 text-right font-medium">
                                        Reserved
                                      </th>
                                      <th className="px-3 py-1.5 text-right font-medium">
                                        Available
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {row.original.locations.map((loc, idx) => (
                                      <tr
                                        key={idx}
                                        className="border-b last:border-0"
                                      >
                                        <td className="px-3 py-1.5">
                                          {loc.locationCode}
                                        </td>
                                        <td className="px-3 py-1.5 text-muted-foreground">
                                          {loc.batchLot || "-"}
                                        </td>
                                        <td className="px-3 py-1.5 text-right font-mono">
                                          {formatQty(loc.quantity)}
                                        </td>
                                        <td
                                          className={`px-3 py-1.5 text-right font-mono ${
                                            loc.reservedQuantity > 0
                                              ? "text-amber-600"
                                              : "text-muted-foreground"
                                          }`}
                                        >
                                          {loc.reservedQuantity > 0
                                            ? formatQty(loc.reservedQuantity)
                                            : "-"}
                                        </td>
                                        <td className="px-3 py-1.5 text-right font-mono font-medium">
                                          {formatQty(
                                            loc.quantity - loc.reservedQuantity
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {/* Draft outbound transactions */}
                          {row.original.draftOutbounds.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                                <Package className="h-3.5 w-3.5 text-orange-500" />
                                Pending Issues (Draft Outbound)
                              </h4>
                              <div className="rounded-md border">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b bg-muted/50">
                                      <th className="px-3 py-1.5 text-left font-medium">
                                        Outbound #
                                      </th>
                                      <th className="px-3 py-1.5 text-left font-medium">
                                        Production Order
                                      </th>
                                      <th className="px-3 py-1.5 text-left font-medium">
                                        Location
                                      </th>
                                      <th className="px-3 py-1.5 text-right font-medium">
                                        Qty
                                      </th>
                                      <th className="px-3 py-1.5 text-left font-medium">
                                        UOM
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {row.original.draftOutbounds.map((entry, idx) => (
                                      <tr
                                        key={idx}
                                        className="border-b last:border-0"
                                      >
                                        <td className="px-3 py-1.5">
                                          <Badge className="text-xs bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 font-mono">
                                            DRAFT
                                          </Badge>{" "}
                                          <span className="font-mono text-xs">
                                            {entry.transactionNumber}
                                          </span>
                                        </td>
                                        <td className="px-3 py-1.5">
                                          <Link
                                            href="/production-orders"
                                            className="text-blue-600 hover:underline font-mono text-xs"
                                          >
                                            {entry.productionOrderNumber}
                                          </Link>
                                        </td>
                                        <td className="px-3 py-1.5 text-muted-foreground text-xs">
                                          {entry.locationCode}
                                        </td>
                                        <td className="px-3 py-1.5 text-right font-mono text-orange-600 dark:text-orange-400 font-medium">
                                          {formatQty(entry.quantity)}
                                        </td>
                                        <td className="px-3 py-1.5">
                                          {entry.uomCode}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {/* Work order bookings */}
                          {row.original.workOrders.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium mb-2">
                                Work Order Bookings
                              </h4>
                              <div className="rounded-md border">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b bg-muted/50">
                                      <th className="px-3 py-1.5 text-left font-medium">
                                        Order #
                                      </th>
                                      <th className="px-3 py-1.5 text-left font-medium">
                                        Status
                                      </th>
                                      <th className="px-3 py-1.5 text-left font-medium">
                                        Type
                                      </th>
                                      <th className="px-3 py-1.5 text-right font-medium">
                                        Required
                                      </th>
                                      <th className="px-3 py-1.5 text-right font-medium">
                                        Consumed
                                      </th>
                                      <th className="px-3 py-1.5 text-right font-medium">
                                        Remaining
                                      </th>
                                      <th className="px-3 py-1.5 text-left font-medium">
                                        UOM
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {row.original.workOrders.map((wo, idx) => (
                                      <tr
                                        key={idx}
                                        className="border-b last:border-0"
                                      >
                                        <td className="px-3 py-1.5">
                                          <Link
                                            href={`/production-orders`}
                                            className="text-blue-600 hover:underline font-mono text-xs"
                                          >
                                            {wo.orderNumber}
                                          </Link>
                                        </td>
                                        <td className="px-3 py-1.5">
                                          <Badge
                                            className={`text-xs ${
                                              statusColorMap[wo.status] || ""
                                            }`}
                                          >
                                            {wo.status.replace("_", " ")}
                                          </Badge>
                                        </td>
                                        <td className="px-3 py-1.5 text-muted-foreground">
                                          {wo.type.replace("_", " ")}
                                        </td>
                                        <td className="px-3 py-1.5 text-right font-mono">
                                          {formatQty(wo.requiredQuantity)}
                                        </td>
                                        <td className="px-3 py-1.5 text-right font-mono">
                                          {formatQty(wo.consumedQuantity)}
                                        </td>
                                        <td className="px-3 py-1.5 text-right font-mono font-medium text-amber-600">
                                          {formatQty(wo.remainingQuantity)}
                                        </td>
                                        <td className="px-3 py-1.5">
                                          {wo.uomCode}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={colCount} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Page {table.getState().pagination.pageIndex + 1} of{" "}
          {table.getPageCount()}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
