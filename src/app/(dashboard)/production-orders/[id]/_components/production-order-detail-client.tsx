"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Play, CheckCircle, XCircle, PackagePlus } from "lucide-react"
import { toast } from "sonner"
import {
  startProductionOrder,
  completeProductionOrder,
  cancelProductionOrder,
  recordOutput,
} from "../../_actions/production-order-actions"

interface OutputItem {
  id: string
  itemId: string
  itemName: string
  targetQuantity: number
  producedQuantity: number
  uomCode: string
}

interface LocationOption {
  id: string
  code: string
  name: string
  warehouseCode: string
}

interface ProductionOrderDetailClientProps {
  order: {
    id: string
    status: "DRAFT" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
    orderNumber: string
  }
  outputs: OutputItem[]
  locations: LocationOption[]
}

export function ProductionOrderDetailClient({
  order,
  outputs,
  locations,
}: ProductionOrderDetailClientProps) {
  const [isPending, startTransition] = useTransition()
  const [startDialogOpen, setStartDialogOpen] = useState(false)
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [outputDialogOpen, setOutputDialogOpen] = useState(false)
  const [selectedOutputId, setSelectedOutputId] = useState(
    outputs.length > 0 ? outputs[0].id : ""
  )
  const [outputQuantity, setOutputQuantity] = useState("")
  const [selectedLocationId, setSelectedLocationId] = useState(
    locations.length > 0 ? locations[0].id : ""
  )
  const [outputBatchLot, setOutputBatchLot] = useState("")

  function handleStart() {
    startTransition(async () => {
      const result = await startProductionOrder(order.id)
      if (result.success) {
        toast.success("Production order started.")
        setStartDialogOpen(false)
      } else {
        toast.error(result.error)
      }
    })
  }

  function handleComplete() {
    startTransition(async () => {
      const result = await completeProductionOrder(order.id)
      if (result.success) {
        toast.success("Production order completed.")
        setCompleteDialogOpen(false)
      } else {
        toast.error(result.error)
      }
    })
  }

  function handleCancel() {
    startTransition(async () => {
      const result = await cancelProductionOrder(order.id)
      if (result.success) {
        toast.success("Production order cancelled.")
        setCancelDialogOpen(false)
      } else {
        toast.error(result.error)
      }
    })
  }

  function handleRecordOutput(e: React.FormEvent) {
    e.preventDefault()
    const qty = parseFloat(outputQuantity)
    if (!selectedOutputId || isNaN(qty) || qty <= 0) {
      toast.error("Please select an output item and enter a valid quantity.")
      return
    }
    if (!selectedLocationId) {
      toast.error("Please select a location.")
      return
    }

    startTransition(async () => {
      const result = await recordOutput({
        outputId: selectedOutputId,
        quantity: qty,
        locationId: selectedLocationId,
        batchLot: outputBatchLot || undefined,
      })
      if (result.success) {
        toast.success("Output recorded successfully.")
        setOutputDialogOpen(false)
        setOutputQuantity("")
        setOutputBatchLot("")
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {order.status === "DRAFT" && (
          <>
            <Button onClick={() => setStartDialogOpen(true)} disabled={isPending}>
              <Play className="mr-2 h-4 w-4" />
              Start Production
            </Button>
            <Button
              variant="destructive"
              onClick={() => setCancelDialogOpen(true)}
              disabled={isPending}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Cancel Order
            </Button>
          </>
        )}
        {order.status === "IN_PROGRESS" && (
          <>
            <Button onClick={() => setCompleteDialogOpen(true)} disabled={isPending}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Complete
            </Button>
            <Button
              variant="outline"
              onClick={() => setOutputDialogOpen(true)}
              disabled={isPending}
            >
              <PackagePlus className="mr-2 h-4 w-4" />
              Record Output
            </Button>
          </>
        )}
      </div>

      <AlertDialog open={startDialogOpen} onOpenChange={setStartDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start Production</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to start production for order{" "}
              &quot;{order.orderNumber}&quot;? This will change the status to
              In Progress.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleStart} disabled={isPending}>
              {isPending ? "Starting..." : "Start Production"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete Production</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to complete order{" "}
              &quot;{order.orderNumber}&quot;? This will mark the production as
              finished.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleComplete} disabled={isPending}>
              {isPending ? "Completing..." : "Complete Production"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel order{" "}
              &quot;{order.orderNumber}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleCancel}
              disabled={isPending}
            >
              {isPending ? "Cancelling..." : "Cancel Order"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={outputDialogOpen} onOpenChange={setOutputDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Output</DialogTitle>
            <DialogDescription>
              Record produced quantity for an output item.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRecordOutput} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="output-item">Output Item</Label>
              <Select
                value={selectedOutputId}
                onValueChange={(v) => setSelectedOutputId(v ?? "")}
              >
                <SelectTrigger className="w-full" id="output-item">
                  <SelectValue placeholder="Select output item">
                    {(value: string | null) => {
                      if (!value) return "Select output item";
                      const output = outputs.find((o) => o.id === value);
                      return output
                        ? `${output.itemName} (${output.producedQuantity}/${output.targetQuantity} ${output.uomCode})`
                        : value;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {outputs.map((output) => (
                    <SelectItem key={output.id} value={output.id}>
                      {output.itemName} ({output.producedQuantity}/
                      {output.targetQuantity} {output.uomCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="output-quantity">Quantity Produced</Label>
              <Input
                id="output-quantity"
                type="number"
                step="any"
                min="0.0001"
                placeholder="Enter quantity"
                value={outputQuantity}
                onChange={(e) => setOutputQuantity(e.target.value)}
                disabled={isPending}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="output-location">Storage Location</Label>
              <Select
                value={selectedLocationId}
                onValueChange={(v) => setSelectedLocationId(v ?? "")}
              >
                <SelectTrigger className="w-full" id="output-location">
                  <SelectValue placeholder="Select location">
                    {(value: string | null) => {
                      if (!value) return "Select location";
                      const loc = locations.find((l) => l.id === value);
                      return loc
                        ? `${loc.warehouseCode} / ${loc.code} - ${loc.name}`
                        : value;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.warehouseCode} / {loc.code} - {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="output-batch-lot">Batch / Lot (optional)</Label>
              <Input
                id="output-batch-lot"
                placeholder="e.g. BATCH-001"
                value={outputBatchLot}
                onChange={(e) => setOutputBatchLot(e.target.value)}
                disabled={isPending}
              />
            </div>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>
                Cancel
              </DialogClose>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Recording..." : "Record"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
