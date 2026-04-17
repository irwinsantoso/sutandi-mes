"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
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
import {
  createProductionOrder,
  updateProductionOrder,
} from "../_actions/production-order-actions"

interface ItemOption {
  id: string
  code: string
  name: string
  baseUomId: string
  baseUom: { id: string; code: string; name: string }
}

interface UomOption {
  id: string
  code: string
  name: string
}

interface MaterialRow {
  itemId: string
  requiredQuantity: string
  uomId: string
  notes: string
}

interface OutputRow {
  itemId: string
  targetQuantity: string
  uomId: string
  notes: string
}

interface ExistingOrder {
  id: string
  type: "WIP" | "FINISHED_GOOD"
  description: string | null
  plannedStartDate: string | null
  plannedEndDate: string | null
  notes: string | null
  materials: {
    itemId: string
    requiredQuantity: number
    uomId: string
    notes: string | null
  }[]
  outputs: {
    itemId: string
    targetQuantity: number
    uomId: string
    notes: string | null
  }[]
}

interface ProductionOrderFormProps {
  items: ItemOption[]
  uoms: UomOption[]
  order?: ExistingOrder
}

export function ProductionOrderForm({
  items,
  uoms,
  order,
}: ProductionOrderFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [type, setType] = useState<"WIP" | "FINISHED_GOOD">(
    order?.type ?? "WIP"
  )
  const [description, setDescription] = useState(order?.description ?? "")
  const [plannedStartDate, setPlannedStartDate] = useState(
    order?.plannedStartDate ?? ""
  )
  const [plannedEndDate, setPlannedEndDate] = useState(
    order?.plannedEndDate ?? ""
  )
  const [notes, setNotes] = useState(order?.notes ?? "")

  const [materials, setMaterials] = useState<MaterialRow[]>(
    order?.materials.map((m) => ({
      itemId: m.itemId,
      requiredQuantity: String(m.requiredQuantity),
      uomId: m.uomId,
      notes: m.notes ?? "",
    })) ?? [{ itemId: "", requiredQuantity: "", uomId: "", notes: "" }]
  )

  const [outputs, setOutputs] = useState<OutputRow[]>(
    order?.outputs.map((o) => ({
      itemId: o.itemId,
      targetQuantity: String(o.targetQuantity),
      uomId: o.uomId,
      notes: o.notes ?? "",
    })) ?? [{ itemId: "", targetQuantity: "", uomId: "", notes: "" }]
  )

  function addMaterial() {
    setMaterials((prev) => [
      ...prev,
      { itemId: "", requiredQuantity: "", uomId: "", notes: "" },
    ])
  }

  function removeMaterial(index: number) {
    setMaterials((prev) => prev.filter((_, i) => i !== index))
  }

  function updateMaterial(
    index: number,
    field: keyof MaterialRow,
    value: string
  ) {
    setMaterials((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      if (field === "itemId") {
        const selectedItem = items.find((item) => item.id === value)
        if (selectedItem) {
          updated[index].uomId = selectedItem.baseUomId
        }
      }
      return updated
    })
  }

  function addOutput() {
    setOutputs((prev) => [
      ...prev,
      { itemId: "", targetQuantity: "", uomId: "", notes: "" },
    ])
  }

  function removeOutput(index: number) {
    setOutputs((prev) => prev.filter((_, i) => i !== index))
  }

  function updateOutput(
    index: number,
    field: keyof OutputRow,
    value: string
  ) {
    setOutputs((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      if (field === "itemId") {
        const selectedItem = items.find((item) => item.id === value)
        if (selectedItem) {
          updated[index].uomId = selectedItem.baseUomId
        }
      }
      return updated
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const parsedMaterials = materials.map((m) => ({
      itemId: m.itemId,
      requiredQuantity: parseFloat(m.requiredQuantity),
      uomId: m.uomId,
      notes: m.notes.trim() || undefined,
    }))

    const parsedOutputs = outputs.map((o) => ({
      itemId: o.itemId,
      targetQuantity: parseFloat(o.targetQuantity),
      uomId: o.uomId,
      notes: o.notes.trim() || undefined,
    }))

    const hasInvalidMaterials = parsedMaterials.some(
      (m) => !m.itemId || isNaN(m.requiredQuantity) || m.requiredQuantity <= 0 || !m.uomId
    )
    if (hasInvalidMaterials) {
      toast.error("Please fill in all material fields with valid values.")
      return
    }

    const hasInvalidOutputs = parsedOutputs.some(
      (o) => !o.itemId || isNaN(o.targetQuantity) || o.targetQuantity <= 0 || !o.uomId
    )
    if (hasInvalidOutputs) {
      toast.error("Please fill in all output fields with valid values.")
      return
    }

    const payload = {
      type,
      description: description || undefined,
      plannedStartDate: plannedStartDate || undefined,
      plannedEndDate: plannedEndDate || undefined,
      notes: notes || undefined,
      materials: parsedMaterials,
      outputs: parsedOutputs,
    }

    startTransition(async () => {
      const result = order
        ? await updateProductionOrder(order.id, payload)
        : await createProductionOrder(payload)

      if (result && !result.success) {
        toast.error(result.error)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Order Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select
                value={type}
                onValueChange={(val) => val && setType(val as "WIP" | "FINISHED_GOOD")}
              >
                <SelectTrigger className="w-full" id="type">
                  <SelectValue placeholder="Select type">
                    {(value: string | null) => {
                      if (!value) return "Select type";
                      const typeLabels: Record<string, string> = { WIP: "WIP", FINISHED_GOOD: "Finished Good" };
                      return typeLabels[value] ?? value;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WIP">WIP</SelectItem>
                  <SelectItem value="FINISHED_GOOD">Finished Good</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Order description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isPending}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="plannedStartDate">Planned Start Date</Label>
              <Input
                id="plannedStartDate"
                type="date"
                value={plannedStartDate}
                onChange={(e) => setPlannedStartDate(e.target.value)}
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plannedEndDate">Planned End Date</Label>
              <Input
                id="plannedEndDate"
                type="date"
                value={plannedEndDate}
                onChange={(e) => setPlannedEndDate(e.target.value)}
                disabled={isPending}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isPending}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Materials (Input)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {materials.map((material, index) => (
            <div key={index}>
              {index > 0 && <Separator className="mb-4" />}
              <div className="flex items-end gap-3">
                <div className="flex-1 space-y-2">
                  <Label>Item</Label>
                  <SearchableSelect
                    value={material.itemId}
                    onValueChange={(val) => val && updateMaterial(index, "itemId", val)}
                    placeholder="Select item"
                    options={items.map((item) => ({
                      value: item.id,
                      label: `${item.code} - ${item.name}`,
                      searchText: `${item.code} ${item.name}`,
                    }))}
                    disabled={isPending}
                  />
                </div>
                <div className="w-32 space-y-2">
                  <Label>Qty Required</Label>
                  <Input
                    type="number"
                    step="any"
                    min="0.0001"
                    placeholder="0"
                    value={material.requiredQuantity}
                    onChange={(e) =>
                      updateMaterial(index, "requiredQuantity", e.target.value)
                    }
                    disabled={isPending}
                  />
                </div>
                <div className="w-40 space-y-2">
                  <Label>UOM</Label>
                  <Select
                    value={material.uomId}
                    onValueChange={(val) =>
                      val && updateMaterial(index, "uomId", val)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select UOM">
                        {(value: string | null) => {
                          if (!value) return "Select UOM";
                          const uom = uoms.find((u) => u.id === value);
                          return uom ? `${uom.code} - ${uom.name}` : value;
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {uoms.map((uom) => (
                        <SelectItem key={uom.id} value={uom.id}>
                          {uom.code} - {uom.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={() => removeMaterial(index)}
                  disabled={materials.length <= 1 || isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-2 space-y-1">
                <Label className="text-xs text-muted-foreground">Notes</Label>
                <Input
                  placeholder="Line notes (optional)"
                  value={material.notes}
                  onChange={(e) =>
                    updateMaterial(index, "notes", e.target.value)
                  }
                  disabled={isPending}
                />
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={addMaterial}
            disabled={isPending}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Material
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Outputs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {outputs.map((output, index) => (
            <div key={index}>
              {index > 0 && <Separator className="mb-4" />}
              <div className="flex items-end gap-3">
                <div className="flex-1 space-y-2">
                  <Label>Item</Label>
                  <SearchableSelect
                    value={output.itemId}
                    onValueChange={(val) => val && updateOutput(index, "itemId", val)}
                    placeholder="Select item"
                    options={items.map((item) => ({
                      value: item.id,
                      label: `${item.code} - ${item.name}`,
                      searchText: `${item.code} ${item.name}`,
                    }))}
                    disabled={isPending}
                  />
                </div>
                <div className="w-32 space-y-2">
                  <Label>Target Qty</Label>
                  <Input
                    type="number"
                    step="any"
                    min="0.0001"
                    placeholder="0"
                    value={output.targetQuantity}
                    onChange={(e) =>
                      updateOutput(index, "targetQuantity", e.target.value)
                    }
                    disabled={isPending}
                  />
                </div>
                <div className="w-40 space-y-2">
                  <Label>UOM</Label>
                  <Select
                    value={output.uomId}
                    onValueChange={(val) =>
                      val && updateOutput(index, "uomId", val)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select UOM">
                        {(value: string | null) => {
                          if (!value) return "Select UOM";
                          const uom = uoms.find((u) => u.id === value);
                          return uom ? `${uom.code} - ${uom.name}` : value;
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {uoms.map((uom) => (
                        <SelectItem key={uom.id} value={uom.id}>
                          {uom.code} - {uom.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={() => removeOutput(index)}
                  disabled={outputs.length <= 1 || isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-2 space-y-1">
                <Label className="text-xs text-muted-foreground">Notes</Label>
                <Input
                  placeholder="Line notes (optional)"
                  value={output.notes}
                  onChange={(e) => updateOutput(index, "notes", e.target.value)}
                  disabled={isPending}
                />
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={addOutput}
            disabled={isPending}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Output
          </Button>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending
            ? "Saving..."
            : order
              ? "Update Order"
              : "Create Order"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/production-orders")}
          disabled={isPending}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
