"use client"

import { useState, useTransition, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Plus, Trash2, Upload, FileSpreadsheet } from "lucide-react"
import { createMaterialRequest } from "../_actions/skm-actions"
import * as XLSX from "xlsx"

interface LineItem {
  key: number
  itemCode: string
  itemName: string
  qtyRequired: string
  qtyBuy: string
  qtyStock: string
  uom: string
  departmentName: string
  notes: string
}

let lineKeyCounter = 1

function emptyLine(): LineItem {
  return {
    key: lineKeyCounter++,
    itemCode: "",
    itemName: "",
    qtyRequired: "",
    qtyBuy: "",
    qtyStock: "",
    uom: "",
    departmentName: "",
    notes: "",
  }
}

function parseExcelDate(val: unknown): string {
  if (typeof val === "number") {
    const date = XLSX.SSF.parse_date_code(val)
    if (date) {
      const month = String(date.M).padStart(2, "0")
      const day = String(date.d).padStart(2, "0")
      return `${date.y}-${month}-${day}`
    }
  }
  if (typeof val === "string") {
    const parts = val.split("/")
    if (parts.length === 3) {
      const [d, m, y] = parts
      return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`
    }
  }
  return new Date().toISOString().split("T")[0]
}

export function SkmForm() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [uploadStatus, setUploadStatus] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [requestDate, setRequestDate] = useState(
    new Date().toISOString().split("T")[0]
  )
  const [notes, setNotes] = useState("")
  const [lineItems, setLineItems] = useState<LineItem[]>([emptyLine()])

  function addLineItem() {
    setLineItems((prev) => [...prev, emptyLine()])
  }

  function removeLineItem(key: number) {
    setLineItems((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((li) => li.key !== key)
    })
  }

  function updateLineItem(key: number, field: keyof LineItem, value: string) {
    setLineItems((prev) =>
      prev.map((li) => (li.key === key ? { ...li, [field]: value } : li))
    )
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadStatus("Parsing Excel file...")
    setError(null)

    try {
      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer, { type: "array" })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, {
        header: 1,
        defval: "",
      })

      // Extract request date from row 1 (col 6 = ": 05/11/2025") or row 2 (col 9 = Excel serial)
      let parsedDate = new Date().toISOString().split("T")[0]
      const dateCell = rows[2]?.[9]
      if (dateCell) {
        parsedDate = parseExcelDate(dateCell)
      } else {
        const dateStr = String(rows[1]?.[6] ?? "").replace(/^:\s*/, "")
        if (dateStr) parsedDate = parseExcelDate(dateStr)
      }
      setRequestDate(parsedDate)

      // Line items start at row 6 (index 6)
      const newLines: LineItem[] = []
      for (let i = 6; i < rows.length; i++) {
        const row = rows[i]
        const noField = row[0]
        if (!noField || String(noField).trim() === "") continue

        const itemCode = String(row[1] ?? "").trim()
        const itemName = String(row[2] ?? "").trim()
        if (!itemName) continue

        const qtyRequired = String(row[3] ?? "").trim()
        const qtyBuy = String(row[4] ?? "").trim()
        const qtyStock = String(row[5] ?? "").trim()
        const uom = String(row[6] ?? "").trim()
        const departmentName = String(row[7] ?? "").trim()
        const notesVal = String(row[9] ?? "").trim()

        newLines.push({
          key: lineKeyCounter++,
          itemCode: itemCode || "-",
          itemName,
          qtyRequired,
          qtyBuy,
          qtyStock,
          uom,
          departmentName,
          notes: notesVal,
        })
      }

      if (newLines.length === 0) {
        setUploadStatus("No line items found in file.")
        return
      }

      setLineItems(newLines)
      setUploadStatus(`Extracted ${newLines.length} item(s) from Excel.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse Excel file.")
      setUploadStatus(null)
    }

    // Reset file input so the same file can be re-uploaded if needed
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  function handleSubmit() {
    setError(null)

    if (!requestDate) {
      setError("Request date is required.")
      return
    }

    const validItems = lineItems.filter(
      (li) => li.itemName.trim() && li.qtyRequired && li.uom.trim()
    )
    if (validItems.length === 0) {
      setError("At least one complete line item (name, qty, UOM) is required.")
      return
    }

    startTransition(async () => {
      const result = await createMaterialRequest({
        requestDate,
        notes: notes || undefined,
        items: validItems.map((li, idx) => ({
          lineNumber: idx + 1,
          itemCode: li.itemCode.trim() || "-",
          itemName: li.itemName.trim(),
          qtyRequired: parseFloat(li.qtyRequired),
          qtyBuy: li.qtyBuy ? parseFloat(li.qtyBuy) : undefined,
          qtyStock: li.qtyStock ? parseFloat(li.qtyStock) : undefined,
          uom: li.uom.trim(),
          departmentName: li.departmentName || undefined,
          notes: li.notes || undefined,
        })),
      })

      if (result && !result.success) {
        setError(result.error)
      }
    })
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Excel Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import from Excel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload SKM Excel (.xls / .xlsx)
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xls,.xlsx"
              className="hidden"
              onChange={handleFileUpload}
            />
            {uploadStatus && (
              <p className="text-sm text-muted-foreground">{uploadStatus}</p>
            )}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Upload the standard SKM Excel template to auto-fill the form below.
            You can edit the fields after importing.
          </p>
        </CardContent>
      </Card>

      {/* Header Fields */}
      <Card>
        <CardHeader>
          <CardTitle>Request Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="requestDate">Request Date</Label>
              <Input
                id="requestDate"
                type="date"
                value={requestDate}
                onChange={(e) => setRequestDate(e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Optional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle>Material Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {lineItems.map((li, index) => (
            <div key={li.key}>
              {index > 0 && <Separator className="mb-4" />}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                {/* Item Code */}
                <div className="space-y-2 sm:col-span-2">
                  <Label>Item Code</Label>
                  <Input
                    placeholder="e.g. 1-1-071-02"
                    value={li.itemCode}
                    onChange={(e) => updateLineItem(li.key, "itemCode", e.target.value)}
                  />
                </div>

                {/* Item Name */}
                <div className="space-y-2 sm:col-span-4">
                  <Label>Item Name *</Label>
                  <Input
                    placeholder="Item description"
                    value={li.itemName}
                    onChange={(e) => updateLineItem(li.key, "itemName", e.target.value)}
                  />
                </div>

                {/* Qty Required */}
                <div className="space-y-2 sm:col-span-1">
                  <Label>Qty Need *</Label>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    value={li.qtyRequired}
                    onChange={(e) => updateLineItem(li.key, "qtyRequired", e.target.value)}
                  />
                </div>

                {/* Qty Buy */}
                <div className="space-y-2 sm:col-span-1">
                  <Label>Qty Buy</Label>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    value={li.qtyBuy}
                    onChange={(e) => updateLineItem(li.key, "qtyBuy", e.target.value)}
                  />
                </div>

                {/* Qty Stock */}
                <div className="space-y-2 sm:col-span-1">
                  <Label>Qty Stock</Label>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    value={li.qtyStock}
                    onChange={(e) => updateLineItem(li.key, "qtyStock", e.target.value)}
                  />
                </div>

                {/* UOM */}
                <div className="space-y-2 sm:col-span-1">
                  <Label>UOM *</Label>
                  <Input
                    placeholder="Pcs"
                    value={li.uom}
                    onChange={(e) => updateLineItem(li.key, "uom", e.target.value)}
                  />
                </div>

                {/* Department */}
                <div className="space-y-2 sm:col-span-1">
                  <Label>Department</Label>
                  <Input
                    placeholder="Dept."
                    value={li.departmentName}
                    onChange={(e) => updateLineItem(li.key, "departmentName", e.target.value)}
                  />
                </div>

                {/* Notes */}
                <div className="space-y-2 sm:col-span-1">
                  <Label>Notes</Label>
                  <Input
                    placeholder="Remarks"
                    value={li.notes}
                    onChange={(e) => updateLineItem(li.key, "notes", e.target.value)}
                  />
                </div>

                {/* Remove */}
                <div className="flex items-end sm:col-span-1">
                  <Button
                    variant="destructive"
                    size="icon"
                    type="button"
                    onClick={() => removeLineItem(li.key)}
                    disabled={lineItems.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}

          <Button variant="outline" type="button" onClick={addLineItem} className="mt-2">
            <Plus className="mr-1 h-4 w-4" />
            Add Item
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Saving..." : "Save as Draft"}
        </Button>
      </div>
    </div>
  )
}
