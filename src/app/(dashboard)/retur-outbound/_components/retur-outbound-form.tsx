"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Plus, Trash2 } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { createReturOutbound } from "../_actions/retur-outbound-actions"

type UomInfo = { id: string; code: string; name: string }

interface ReturOutboundFormProps {
  items: Array<{
    id: string
    code: string
    name: string
    baseUomId: string
    baseUom: UomInfo
    uomConversions: Array<{
      fromUomId: string
      toUomId: string
      fromUom: UomInfo
      toUom: UomInfo
    }>
  }>
  locations: Array<{
    id: string
    code: string
    name: string
    warehouse: { code: string; name: string }
  }>
  projectNames: string[]
}

interface LineItem {
  key: string
  itemId: string
  quantity: string
  uomId: string
  batchLot: string
  locationId: string
  notes: string
}

function createEmptyLine(): LineItem {
  return {
    key: crypto.randomUUID(),
    itemId: "",
    quantity: "",
    uomId: "",
    batchLot: "",
    locationId: "",
    notes: "",
  }
}

function getAvailableUoms(itemId: string, items: ReturOutboundFormProps["items"]): UomInfo[] {
  const item = items.find((i) => i.id === itemId)
  if (!item) return []
  const map = new Map<string, UomInfo>()
  map.set(item.baseUom.id, item.baseUom)
  for (const conv of item.uomConversions) {
    map.set(conv.fromUom.id, conv.fromUom)
    map.set(conv.toUom.id, conv.toUom)
  }
  return Array.from(map.values())
}

export function ReturOutboundForm({ items, locations, projectNames }: ReturOutboundFormProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [projectName, setProjectName] = useState("")
  const [supplierName, setSupplierName] = useState("")
  const [issueDate, setIssueDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [notes, setNotes] = useState("")
  const [lineItems, setLineItems] = useState<LineItem[]>([createEmptyLine()])

  function updateLine(key: string, updates: Partial<LineItem>) {
    setLineItems((prev) =>
      prev.map((li) => {
        if (li.key !== key) return li
        const next = { ...li, ...updates }
        if (updates.itemId !== undefined) {
          const it = items.find((i) => i.id === updates.itemId)
          next.uomId = it?.baseUomId ?? ""
        }
        return next
      })
    )
  }

  function addLine() {
    setLineItems((prev) => [...prev, createEmptyLine()])
  }

  function removeLine(key: string) {
    setLineItems((prev) => (prev.length <= 1 ? prev : prev.filter((li) => li.key !== key)))
  }

  function handleSubmit() {
    setError(null)
    if (!issueDate) {
      setError("Tanggal retur wajib diisi.")
      return
    }
    const valid = lineItems.filter((li) => li.itemId && li.quantity && li.uomId && li.locationId)
    if (valid.length === 0) {
      setError("Minimal satu item harus lengkap.")
      return
    }

    startTransition(async () => {
      const result = await createReturOutbound({
        projectName: projectName || undefined,
        supplierName: supplierName || undefined,
        issueDate,
        notes: notes || undefined,
        items: valid.map((li) => ({
          itemId: li.itemId,
          quantity: parseFloat(li.quantity),
          uomId: li.uomId,
          batchLot: li.batchLot || undefined,
          locationId: li.locationId,
          notes: li.notes || undefined,
        })),
      })
      if (result && !result.success) setError(result.error)
    })
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Detail Retur ke Supplier</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="projectName">Nama Proyek</Label>
              <Input
                id="projectName"
                list="retur-outbound-project-names"
                placeholder="Pilih atau ketik nama proyek"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
              />
              <datalist id="retur-outbound-project-names">
                {projectNames.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplierName">Supplier (Tujuan Retur)</Label>
              <Input
                id="supplierName"
                placeholder="Nama supplier yang menerima retur"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="issueDate">Tanggal Retur</Label>
              <Input
                id="issueDate"
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Alasan retur, kondisi barang, dll"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Item yang Diretur</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {lineItems.map((line, idx) => {
            const selectedItem = items.find((i) => i.id === line.itemId)
            const availableUoms = getAvailableUoms(selectedItem?.id ?? "", items)

            return (
              <div key={line.key} className="space-y-4">
                {idx > 0 && <Separator />}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Item #{idx + 1}
                  </span>
                  {lineItems.length > 1 && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeLine(line.key)}
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      Hapus
                    </Button>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Item</Label>
                    <SearchableSelect
                      value={line.itemId}
                      onValueChange={(val) => updateLine(line.key, { itemId: val })}
                      placeholder="Select item"
                      options={items.map((item) => ({
                        value: item.id,
                        label: `${item.code} - ${item.name}`,
                        searchText: `${item.code} ${item.name}`,
                      }))}
                      renderValue={(val) => {
                        const item = items.find((i) => i.id === val)
                        return item ? `${item.code} - ${item.name}` : val
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="0"
                      value={line.quantity}
                      onChange={(e) => updateLine(line.key, { quantity: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>UOM</Label>
                    <Select
                      value={line.uomId || "__none__"}
                      onValueChange={(val) =>
                        updateLine(line.key, { uomId: !val || val === "__none__" ? "" : val })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select UOM">
                          {(value: string | null) => {
                            if (!value || value === "__none__") return "Select UOM"
                            const uom = availableUoms.find((u) => u.id === value)
                            return uom ? `${uom.name} (${uom.code})` : value
                          }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__" disabled>Select UOM</SelectItem>
                        {availableUoms.map((uom) => (
                          <SelectItem key={uom.id} value={uom.id}>
                            {uom.name} ({uom.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Batch / Lot</Label>
                    <Input
                      placeholder="Optional"
                      value={line.batchLot}
                      onChange={(e) => updateLine(line.key, { batchLot: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Lokasi (Asal Stok)</Label>
                    <SearchableSelect
                      value={line.locationId}
                      onValueChange={(val) => updateLine(line.key, { locationId: val })}
                      placeholder="Select location"
                      options={locations.map((loc) => ({
                        value: loc.id,
                        label: `${loc.warehouse.code} / ${loc.code} - ${loc.name}`,
                        searchText: `${loc.warehouse.code} ${loc.warehouse.name} ${loc.code} ${loc.name}`,
                      }))}
                      renderValue={(val) => {
                        const loc = locations.find((l) => l.id === val)
                        return loc ? `${loc.warehouse.code} / ${loc.code} - ${loc.name}` : val
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Input
                      placeholder="Optional"
                      value={line.notes}
                      onChange={(e) => updateLine(line.key, { notes: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )
          })}

          <Button type="button" variant="outline" onClick={addLine} className="w-full">
            <Plus className="mr-1 h-4 w-4" />
            Tambah Item
          </Button>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Menyimpan..." : "Simpan Draft Retur"}
        </Button>
        <Button variant="outline" type="button" render={<Link href="/retur-outbound" />}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
