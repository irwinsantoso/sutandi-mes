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
import { createInboundTransaction } from "../_actions/inbound-actions"

type UomInfo = { id: string; code: string; name: string }

interface InboundFormProps {
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
}

interface LineItem {
  key: number
  itemId: string
  quantity: string
  uomId: string
  batchLot: string
  locationId: string
}

function getAvailableUoms(
  itemId: string,
  items: InboundFormProps["items"]
): UomInfo[] {
  const item = items.find((i) => i.id === itemId)
  if (!item) return []

  const uomMap = new Map<string, UomInfo>()
  uomMap.set(item.baseUom.id, item.baseUom)

  for (const conv of item.uomConversions) {
    if (!uomMap.has(conv.fromUom.id)) {
      uomMap.set(conv.fromUom.id, conv.fromUom)
    }
    if (!uomMap.has(conv.toUom.id)) {
      uomMap.set(conv.toUom.id, conv.toUom)
    }
  }

  return Array.from(uomMap.values())
}

let lineKeyCounter = 1

export function InboundForm({ items, locations }: InboundFormProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [supplier, setSupplier] = useState("")
  const [referenceNumber, setReferenceNumber] = useState("")
  const [receivingDate, setReceivingDate] = useState(
    new Date().toISOString().split("T")[0]
  )
  const [notes, setNotes] = useState("")
  const [lineItems, setLineItems] = useState<LineItem[]>([
    {
      key: lineKeyCounter++,
      itemId: "",
      quantity: "",
      uomId: "",
      batchLot: "",
      locationId: "",
    },
  ])

  function addLineItem() {
    setLineItems((prev) => [
      ...prev,
      {
        key: lineKeyCounter++,
        itemId: "",
        quantity: "",
        uomId: "",
        batchLot: "",
        locationId: "",
        expiryDate: "",
      },
    ])
  }

  function removeLineItem(key: number) {
    setLineItems((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((li) => li.key !== key)
    })
  }

  function updateLineItem(key: number, field: keyof LineItem, value: string) {
    setLineItems((prev) =>
      prev.map((li) => {
        if (li.key !== key) return li
        const updated = { ...li, [field]: value }
        if (field === "itemId") {
          updated.uomId = ""
          const selectedItem = items.find((i) => i.id === value)
          if (selectedItem) {
            updated.uomId = selectedItem.baseUomId
          }
        }
        return updated
      })
    )
  }

  function handleSubmit() {
    setError(null)

    if (!receivingDate) {
      setError("Receiving date is required.")
      return
    }

    const validItems = lineItems.filter((li) => li.itemId && li.quantity && li.uomId && li.locationId)
    if (validItems.length === 0) {
      setError("At least one complete line item is required.")
      return
    }

    startTransition(async () => {
      const result = await createInboundTransaction({
        supplier: supplier || undefined,
        referenceNumber: referenceNumber || undefined,
        receivingDate,
        notes: notes || undefined,
        items: validItems.map((li) => ({
          itemId: li.itemId,
          quantity: parseFloat(li.quantity),
          uomId: li.uomId,
          batchLot: li.batchLot || undefined,
          locationId: li.locationId,
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

      <Card>
        <CardHeader>
          <CardTitle>Transaction Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier</Label>
              <Input
                id="supplier"
                placeholder="Enter supplier name"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="referenceNumber">Reference Number</Label>
              <Input
                id="referenceNumber"
                placeholder="e.g. PO-2026-001"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="receivingDate">Receiving Date</Label>
              <Input
                id="receivingDate"
                type="date"
                value={receivingDate}
                onChange={(e) => setReceivingDate(e.target.value)}
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

      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {lineItems.map((li, index) => (
            <div key={li.key}>
              {index > 0 && <Separator className="mb-4" />}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Item</Label>
                  <SearchableSelect
                    value={li.itemId}
                    onValueChange={(val) => updateLineItem(li.key, "itemId", val)}
                    placeholder="Select item"
                    options={items.map((item) => ({
                      value: item.id,
                      label: `${item.code} - ${item.name}`,
                      searchText: `${item.code} ${item.name}`,
                    }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    value={li.quantity}
                    onChange={(e) =>
                      updateLineItem(li.key, "quantity", e.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>UOM</Label>
                  <Select
                    value={li.uomId}
                    onValueChange={(val) => updateLineItem(li.key, "uomId", val ?? "")}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select UOM">
                        {(value: string | null) => {
                          if (!value) return "Select UOM";
                          const uom = getAvailableUoms(li.itemId, items).find((u) => u.id === value);
                          return uom ? `${uom.code} - ${uom.name}` : value;
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableUoms(li.itemId, items).map((uom) => (
                        <SelectItem key={uom.id} value={uom.id}>
                          {uom.code} - {uom.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Batch / Lot</Label>
                  <Input
                    placeholder="Batch #"
                    value={li.batchLot}
                    onChange={(e) =>
                      updateLineItem(li.key, "batchLot", e.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Location</Label>
                  <SearchableSelect
                    value={li.locationId}
                    onValueChange={(val) => updateLineItem(li.key, "locationId", val)}
                    placeholder="Select location"
                    options={locations.map((loc) => ({
                      value: loc.id,
                      label: `${loc.warehouse.code} / ${loc.code} - ${loc.name}`,
                      searchText: `${loc.warehouse.code} ${loc.warehouse.name} ${loc.code} ${loc.name}`,
                    }))}
                  />
                </div>

                <div className="flex items-end">
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => removeLineItem(li.key)}
                    disabled={lineItems.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}

          <Button variant="outline" onClick={addLineItem} className="mt-2">
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
