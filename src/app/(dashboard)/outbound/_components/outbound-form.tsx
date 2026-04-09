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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Plus, Trash2, QrCode } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { createOutboundTransaction } from "../_actions/outbound-actions"
import { parseQrPayload } from "@/lib/qr-code"
import { format } from "date-fns"

interface ProductionOrderOption {
  id: string
  orderNumber: string
  type: string
  materials: Array<{
    itemId: string
    item: { code: string; name: string }
    requiredQuantity: number
    consumedQuantity: number
    uom: { code: string }
  }>
}

interface ItemOption {
  id: string
  code: string
  name: string
  baseUomId: string
  baseUom: { id: string; code: string; name: string }
  uomConversions: Array<{
    fromUomId: string
    toUomId: string
    fromUom: { id: string; code: string; name: string }
    toUom: { id: string; code: string; name: string }
  }>
}

interface LocationOption {
  id: string
  code: string
  name: string
  warehouse: { code: string; name: string }
}

interface OutboundFormProps {
  productionOrders: ProductionOrderOption[]
  items: ItemOption[]
  locations: LocationOption[]
}

interface LineItem {
  key: string
  itemId: string
  quantity: string
  uomId: string
  batchLot: string
  locationId: string
  scannedQrData: string
  notes: string
  showQrInput: boolean
  qrText: string
}

function createEmptyLineItem(): LineItem {
  return {
    key: crypto.randomUUID(),
    itemId: "",
    quantity: "",
    uomId: "",
    batchLot: "",
    locationId: "",
    scannedQrData: "",
    notes: "",
    showQrInput: false,
    qrText: "",
  }
}

function getAvailableUoms(item: ItemOption | undefined): Array<{ id: string; code: string; name: string }> {
  if (!item) return []
  const uoms = new Map<string, { id: string; code: string; name: string }>()
  uoms.set(item.baseUom.id, item.baseUom)
  for (const conv of item.uomConversions) {
    uoms.set(conv.fromUom.id, conv.fromUom)
    uoms.set(conv.toUom.id, conv.toUom)
  }
  return Array.from(uoms.values())
}

export function OutboundForm({ productionOrders, items, locations }: OutboundFormProps) {
  const [isPending, startTransition] = useTransition()
  const [productionOrderId, setProductionOrderId] = useState("")
  const [purpose, setPurpose] = useState("")
  const [issueDate, setIssueDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [notes, setNotes] = useState("")
  const [lineItems, setLineItems] = useState<LineItem[]>([createEmptyLineItem()])

  const selectedPO = productionOrders.find((po) => po.id === productionOrderId)

  function handlePOChange(value: string | null) {
    if (!value || value === "__none__") {
      setProductionOrderId("")
      setPurpose("")
    } else {
      setProductionOrderId(value)
      setPurpose("PRODUCTION")
    }
  }

  function updateLineItem(index: number, updates: Partial<LineItem>) {
    setLineItems((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], ...updates }

      // If item changed, auto-set UOM to base UOM
      if (updates.itemId !== undefined) {
        const selectedItem = items.find((i) => i.id === updates.itemId)
        if (selectedItem) {
          next[index].uomId = selectedItem.baseUomId
        } else {
          next[index].uomId = ""
        }
      }

      return next
    })
  }

  function addLineItem() {
    setLineItems((prev) => [...prev, createEmptyLineItem()])
  }

  function removeLineItem(index: number) {
    setLineItems((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((_, i) => i !== index)
    })
  }

  function handleParseQr(index: number) {
    const line = lineItems[index]
    const payload = parseQrPayload(line.qrText)
    if (!payload) {
      toast.error("Invalid QR code data. Could not parse.")
      return
    }

    // Try to find matching item by code
    const matchedItem = items.find((i) => i.code === payload.item)
    // Try to find matching UOM by code
    let matchedUomId = ""
    if (matchedItem) {
      const availableUoms = getAvailableUoms(matchedItem)
      const matchedUom = availableUoms.find((u) => u.code === payload.uom)
      matchedUomId = matchedUom?.id || matchedItem.baseUomId
    }

    const updates: Partial<LineItem> = {
      scannedQrData: line.qrText,
      showQrInput: false,
      qrText: "",
    }

    if (matchedItem) {
      updates.itemId = matchedItem.id
      updates.uomId = matchedUomId
    }
    if (payload.qty) {
      updates.quantity = String(payload.qty)
    }
    if (payload.batch) {
      updates.batchLot = payload.batch
    }

    updateLineItem(index, updates)
    toast.success("QR data parsed successfully")
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Basic validation
    if (!issueDate) {
      toast.error("Issue date is required")
      return
    }

    const validItems = lineItems.filter((li) => li.itemId && li.quantity && li.uomId && li.locationId)
    if (validItems.length === 0) {
      toast.error("At least one complete item line is required")
      return
    }

    startTransition(async () => {
      const result = await createOutboundTransaction({
        productionOrderId: productionOrderId || undefined,
        purpose: purpose || undefined,
        issueDate,
        notes: notes || undefined,
        items: validItems.map((li) => ({
          itemId: li.itemId,
          quantity: parseFloat(li.quantity),
          uomId: li.uomId,
          batchLot: li.batchLot || undefined,
          locationId: li.locationId,
          scannedQrData: li.scannedQrData || undefined,
          notes: li.notes || undefined,
        })),
      })

      if (result && !result.success) {
        toast.error(result.error)
      }
      // On success, the server action redirects
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Transaction Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Production Order (Optional)</Label>
              <Select
                value={productionOrderId || "__none__"}
                onValueChange={handlePOChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select production order">
                    {(value: string | null) => {
                      if (!value) return "Select production order";
                      if (value === "__none__") return "None";
                      const po = productionOrders.find((p) => p.id === value);
                      return po ? `${po.orderNumber} (${po.type})` : value;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {productionOrders.map((po) => (
                    <SelectItem key={po.id} value={po.id}>
                      {po.orderNumber} ({po.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="purpose">Purpose</Label>
              <Input
                id="purpose"
                placeholder="e.g., PRODUCTION, SAMPLING"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="issueDate">Issue Date</Label>
              <Input
                id="issueDate"
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Optional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Production Order Materials Reference */}
      {selectedPO && selectedPO.materials.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Production Order Materials - {selectedPO.orderNumber}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-2 text-left font-medium">Item</th>
                    <th className="px-4 py-2 text-right font-medium">Required</th>
                    <th className="px-4 py-2 text-right font-medium">Consumed</th>
                    <th className="px-4 py-2 text-right font-medium">Remaining</th>
                    <th className="px-4 py-2 text-left font-medium">UOM</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPO.materials.map((mat, idx) => {
                    const remaining = mat.requiredQuantity - mat.consumedQuantity
                    return (
                      <tr key={idx} className="border-b last:border-0">
                        <td className="px-4 py-2">
                          <span className="font-mono text-xs">{mat.item.code}</span>
                          <span className="ml-2">{mat.item.name}</span>
                        </td>
                        <td className="px-4 py-2 text-right">{mat.requiredQuantity}</td>
                        <td className="px-4 py-2 text-right">{mat.consumedQuantity}</td>
                        <td className="px-4 py-2 text-right">
                          <span className={remaining <= 0 ? "text-green-600" : "text-amber-600"}>
                            {remaining}
                          </span>
                        </td>
                        <td className="px-4 py-2">{mat.uom.code}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {lineItems.map((line, index) => {
            const selectedItem = items.find((i) => i.id === line.itemId)
            const availableUoms = getAvailableUoms(selectedItem)

            return (
              <div key={line.key} className="space-y-4">
                {index > 0 && <Separator />}

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Item #{index + 1}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateLineItem(index, { showQrInput: !line.showQrInput })
                      }
                    >
                      <QrCode className="mr-1 h-4 w-4" />
                      Scan QR
                    </Button>
                    {lineItems.length > 1 && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removeLineItem(index)}
                      >
                        <Trash2 className="mr-1 h-4 w-4" />
                        Remove
                      </Button>
                    )}
                  </div>
                </div>

                {/* QR Input area */}
                {line.showQrInput && (
                  <div className="rounded-md border border-dashed p-4 space-y-3">
                    <Label>Paste or type QR data</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder='{"id":"...","txn":"...","item":"..."}'
                        value={line.qrText}
                        onChange={(e) =>
                          updateLineItem(index, { qrText: e.target.value })
                        }
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleParseQr(index)}
                        disabled={!line.qrText}
                      >
                        Parse
                      </Button>
                    </div>
                    {line.scannedQrData && (
                      <p className="text-xs text-muted-foreground">
                        Scanned: {line.scannedQrData.substring(0, 60)}
                        {line.scannedQrData.length > 60 ? "..." : ""}
                      </p>
                    )}
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Item</Label>
                    <Select
                      value={line.itemId || "__none__"}
                      onValueChange={(val) =>
                        updateLineItem(index, {
                          itemId: !val || val === "__none__" ? "" : val,
                        })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select item">
                          {(value: string | null) => {
                            if (!value || value === "__none__") return "Select item";
                            const item = items.find((i) => i.id === value);
                            return item ? `${item.code} - ${item.name}` : value;
                          }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__" disabled>Select item</SelectItem>
                        {items.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.code} - {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="0"
                      value={line.quantity}
                      onChange={(e) =>
                        updateLineItem(index, { quantity: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>UOM</Label>
                    <Select
                      value={line.uomId || "__none__"}
                      onValueChange={(val) =>
                        updateLineItem(index, {
                          uomId: !val || val === "__none__" ? "" : val,
                        })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select UOM">
                          {(value: string | null) => {
                            if (!value || value === "__none__") return "Select UOM";
                            const uom = availableUoms.find((u) => u.id === value);
                            return uom ? `${uom.name} (${uom.code})` : value;
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
                      placeholder="Optional batch/lot number"
                      value={line.batchLot}
                      onChange={(e) =>
                        updateLineItem(index, { batchLot: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Select
                      value={line.locationId || "__none__"}
                      onValueChange={(val) =>
                        updateLineItem(index, {
                          locationId: !val || val === "__none__" ? "" : val,
                        })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select location">
                          {(value: string | null) => {
                            if (!value || value === "__none__") return "Select location";
                            const loc = locations.find((l) => l.id === value);
                            return loc ? `${loc.warehouse.code} - ${loc.code} (${loc.name})` : value;
                          }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__" disabled>Select location</SelectItem>
                        {locations.map((loc) => (
                          <SelectItem key={loc.id} value={loc.id}>
                            {loc.warehouse.code} - {loc.code} ({loc.name})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {line.scannedQrData && !line.showQrInput && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      <QrCode className="mr-1 h-3 w-3" />
                      QR Scanned
                    </Badge>
                  </div>
                )}
              </div>
            )
          })}

          <Button type="button" variant="outline" onClick={addLineItem} className="w-full">
            <Plus className="mr-1 h-4 w-4" />
            Add Item
          </Button>
        </CardContent>
      </Card>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creating..." : "Create Outbound Transaction"}
        </Button>
        <Button variant="outline" type="button" render={<Link href="/outbound" />}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
