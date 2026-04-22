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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { format } from "date-fns"
import { createDirectWorkOrder } from "../../_actions/spl-actions"

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

interface UomOption {
  id: string
  code: string
  name: string
}

interface LocationOption {
  id: string
  code: string
  name: string
  warehouse: { code: string; name: string }
}

interface CategoryOption {
  id: string
  code: string
  name: string
}

interface SplFormProps {
  items: ItemOption[]
  uoms: UomOption[]
  locations: LocationOption[]
  categories: CategoryOption[]
}

interface MaterialLine {
  key: string
  itemId: string
  quantity: string
  uomId: string
  batchLot: string
  locationId: string
  notes: string
}

function createEmptyMaterial(): MaterialLine {
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

export function SplForm({ items, uoms, locations, categories }: SplFormProps) {
  const [isPending, startTransition] = useTransition()

  // Header fields
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [transferFrom, setTransferFrom] = useState("")
  const [transferTo, setTransferTo] = useState("")
  const [transferToAddress, setTransferToAddress] = useState("")
  const [preparedBy, setPreparedBy] = useState("")
  const [approvedBy, setApprovedBy] = useState("")
  const [receivedBy, setReceivedBy] = useState("")
  const [description, setDescription] = useState("")

  // Output item
  const [outputItemId, setOutputItemId] = useState("")
  const [outputItemName, setOutputItemName] = useState("")
  const [outputItemCode, setOutputItemCode] = useState("")
  const [outputCategoryId, setOutputCategoryId] = useState("")
  const [outputQty, setOutputQty] = useState("")
  const [outputUomId, setOutputUomId] = useState("")
  const [outputLocationId, setOutputLocationId] = useState("")
  const [isNewOutputItem, setIsNewOutputItem] = useState(false)

  // Materials
  const [materials, setMaterials] = useState<MaterialLine[]>([createEmptyMaterial()])

  const selectedOutputItem = items.find((i) => i.id === outputItemId)

  function handleOutputItemChange(val: string | null) {
    if (!val || val === "__none__") {
      setOutputItemId("")
      setIsNewOutputItem(false)
      setOutputItemName("")
      setOutputUomId("")
    } else if (val === "__new__") {
      setOutputItemId("")
      setIsNewOutputItem(true)
      setOutputItemName("")
      setOutputUomId("")
    } else {
      const item = items.find((i) => i.id === val)
      setOutputItemId(val)
      setIsNewOutputItem(false)
      if (item) {
        setOutputItemName(item.name)
        setOutputUomId(item.baseUomId)
      }
    }
  }

  function updateMaterial(index: number, updates: Partial<MaterialLine>) {
    setMaterials((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], ...updates }
      if (updates.itemId !== undefined) {
        const selected = items.find((i) => i.id === updates.itemId)
        next[index].uomId = selected?.baseUomId ?? ""
      }
      return next
    })
  }

  function addMaterial() {
    setMaterials((prev) => [...prev, createEmptyMaterial()])
  }

  function removeMaterial(index: number) {
    setMaterials((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((_, i) => i !== index)
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!outputItemId && !isNewOutputItem) {
      toast.error("Please select an existing output item or choose to create a new one.")
      return
    }
    if (isNewOutputItem && (!outputItemName || !outputItemCode || !outputCategoryId)) {
      toast.error("For a new output item, name, code, and category are required.")
      return
    }
    if (!outputQty || !outputUomId || !outputLocationId) {
      toast.error("Output quantity, UOM, and location are required.")
      return
    }

    const validMaterials = materials.filter(
      (m) => m.itemId && m.quantity && m.uomId && m.locationId
    )
    if (validMaterials.length === 0) {
      toast.error("At least one complete material line is required.")
      return
    }

    startTransition(async () => {
      const result = await createDirectWorkOrder({
        date,
        transferFrom,
        transferTo,
        transferToAddress: transferToAddress || undefined,
        preparedBy,
        approvedBy: approvedBy || undefined,
        receivedBy: receivedBy || undefined,
        description: description || undefined,
        outputItemId: outputItemId || undefined,
        outputItemName: isNewOutputItem ? outputItemName : (selectedOutputItem?.name ?? outputItemName),
        outputItemCode: isNewOutputItem ? outputItemCode : undefined,
        outputCategoryId: isNewOutputItem ? outputCategoryId : undefined,
        outputQty: parseFloat(outputQty),
        outputUomId,
        outputLocationId,
        materials: validMaterials.map((m) => ({
          itemId: m.itemId,
          quantity: parseFloat(m.quantity),
          uomId: m.uomId,
          batchLot: m.batchLot || undefined,
          locationId: m.locationId,
          notes: m.notes || undefined,
        })),
      })

      if (result && !result.success) {
        toast.error(result.error)
      }
    })
  }

  const outputUomOptions = selectedOutputItem
    ? getAvailableUoms(selectedOutputItem)
    : uoms

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle>SPL Header</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="transferFrom">Transfer From *</Label>
              <Input
                id="transferFrom"
                placeholder="e.g. G-1"
                value={transferFrom}
                onChange={(e) => setTransferFrom(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="preparedBy">Disiapkan (Prepared By) *</Label>
              <Input
                id="preparedBy"
                placeholder="Prepared by"
                value={preparedBy}
                onChange={(e) => setPreparedBy(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="transferTo">Transfer To *</Label>
              <Input
                id="transferTo"
                placeholder="e.g. Citra Indah Abadi"
                value={transferTo}
                onChange={(e) => setTransferTo(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="transferToAddress">Transfer To Address</Label>
              <Input
                id="transferToAddress"
                placeholder="Address (optional)"
                value={transferToAddress}
                onChange={(e) => setTransferToAddress(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="approvedBy">Disetujui Oleh (Approved By)</Label>
              <Input
                id="approvedBy"
                placeholder="Approved by (optional)"
                value={approvedBy}
                onChange={(e) => setApprovedBy(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="receivedBy">Diterima Oleh (Received By)</Label>
              <Input
                id="receivedBy"
                placeholder="Received by (optional)"
                value={receivedBy}
                onChange={(e) => setReceivedBy(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Keterangan Pengerjaan)</Label>
            <Textarea
              id="description"
              placeholder="e.g. Pengerjaan TB80 (Harvest Link)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Materials (Input Items) */}
      <Card>
        <CardHeader>
          <CardTitle>Material Items (Bahan Baku)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {materials.map((mat, index) => {
            const selectedItem = items.find((i) => i.id === mat.itemId)
            const availableUoms = getAvailableUoms(selectedItem)

            return (
              <div key={mat.key} className="space-y-4">
                {index > 0 && <Separator />}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Item #{index + 1}
                  </span>
                  {materials.length > 1 && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeMaterial(index)}
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      Remove
                    </Button>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2 lg:col-span-2">
                    <Label>Item *</Label>
                    <SearchableSelect
                      value={mat.itemId}
                      onValueChange={(val) => updateMaterial(index, { itemId: val })}
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
                    <Label>Batch / Lot</Label>
                    <Input
                      placeholder="Optional"
                      value={mat.batchLot}
                      onChange={(e) => updateMaterial(index, { batchLot: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Quantity *</Label>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="0"
                      value={mat.quantity}
                      onChange={(e) => updateMaterial(index, { quantity: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>UOM *</Label>
                    <Select
                      value={mat.uomId || "__none__"}
                      onValueChange={(val: string | null) =>
                        updateMaterial(index, { uomId: !val || val === "__none__" ? "" : val })
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
                          <SelectItem key={uom.id} value={uom.id} label={`${uom.name} (${uom.code})`}>
                            {uom.name} ({uom.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Location *</Label>
                    <SearchableSelect
                      value={mat.locationId}
                      onValueChange={(val) => updateMaterial(index, { locationId: val })}
                      placeholder="Select location"
                      options={locations.map((loc) => ({
                        value: loc.id,
                        label: `${loc.warehouse.code} - ${loc.code} (${loc.name})`,
                        searchText: `${loc.warehouse.code} ${loc.warehouse.name} ${loc.code} ${loc.name}`,
                      }))}
                      renderValue={(val) => {
                        const loc = locations.find((l) => l.id === val)
                        return loc ? `${loc.warehouse.code} - ${loc.code} (${loc.name})` : val
                      }}
                    />
                  </div>
                </div>
              </div>
            )
          })}

          <Button type="button" variant="outline" onClick={addMaterial} className="w-full">
            <Plus className="mr-1 h-4 w-4" />
            Add Material
          </Button>
        </CardContent>
      </Card>

      {/* Output Item */}
      <Card>
        <CardHeader>
          <CardTitle>Output Item (Barang Hasil)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Select Existing Item or Create New *</Label>
            <SearchableSelect
              value={isNewOutputItem ? "__new__" : (outputItemId || "__none__")}
              onValueChange={handleOutputItemChange}
              placeholder="Search existing item or create new"
              options={[
                { value: "__none__", label: "— Select output item —" },
                { value: "__new__", label: "+ Create new item" },
                ...items.map((item) => ({
                  value: item.id,
                  label: `${item.code} - ${item.name}`,
                  searchText: `${item.code} ${item.name}`,
                })),
              ]}
              renderValue={(val) => {
                if (val === "__none__") return "— Select output item —"
                if (val === "__new__") return "+ Create new item"
                const item = items.find((i) => i.id === val)
                return item ? `${item.code} - ${item.name}` : val
              }}
            />
          </div>

          {isNewOutputItem && (
            <div className="rounded-md border border-dashed p-4 space-y-4">
              <p className="text-sm font-medium text-muted-foreground">New Item Details</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="outputItemName">Item Name *</Label>
                  <Input
                    id="outputItemName"
                    placeholder="e.g. Frame Casement Besar"
                    value={outputItemName}
                    onChange={(e) => setOutputItemName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="outputItemCode">Item Code *</Label>
                  <Input
                    id="outputItemCode"
                    placeholder="e.g. 1-1-019-01-001-53-0060"
                    value={outputItemCode}
                    onChange={(e) => setOutputItemCode(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select
                    value={outputCategoryId || "__none__"}
                    onValueChange={(val: string | null) => setOutputCategoryId(!val || val === "__none__" ? "" : val)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__" disabled>Select category</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name} ({cat.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="outputQty">Output Quantity *</Label>
              <Input
                id="outputQty"
                type="number"
                step="any"
                min="0"
                placeholder="0"
                value={outputQty}
                onChange={(e) => setOutputQty(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Output UOM *</Label>
              <Select
                value={outputUomId || "__none__"}
                onValueChange={(val: string | null) => setOutputUomId(!val || val === "__none__" ? "" : val)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select UOM">
                    {(value: string | null) => {
                      if (!value || value === "__none__") return "Select UOM"
                      const uom = outputUomOptions.find((u) => u.id === value)
                      return uom ? `${uom.name} (${uom.code})` : value
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" disabled>Select UOM</SelectItem>
                  {outputUomOptions.map((uom) => (
                    <SelectItem key={uom.id} value={uom.id} label={`${uom.name} (${uom.code})`}>
                      {uom.name} ({uom.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Output Location *</Label>
              <SearchableSelect
                value={outputLocationId}
                onValueChange={setOutputLocationId}
                placeholder="Select location"
                options={locations.map((loc) => ({
                  value: loc.id,
                  label: `${loc.warehouse.code} - ${loc.code} (${loc.name})`,
                  searchText: `${loc.warehouse.code} ${loc.warehouse.name} ${loc.code} ${loc.name}`,
                }))}
                renderValue={(val) => {
                  const loc = locations.find((l) => l.id === val)
                  return loc ? `${loc.warehouse.code} - ${loc.code} (${loc.name})` : val
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creating..." : "Create SPL (Draft)"}
        </Button>
        <Button variant="outline" type="button" render={<Link href="/spl" />}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
