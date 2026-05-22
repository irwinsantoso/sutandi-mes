"use client"

import { useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Check, X } from "lucide-react"
import { toast } from "sonner"
import { confirmReturInbound, cancelReturInbound } from "../../_actions/retur-inbound-actions"

interface ReturInboundDetailClientProps {
  id: string
}

export function ReturInboundDetailClient({ id }: ReturInboundDetailClientProps) {
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    startTransition(async () => {
      const result = await confirmReturInbound(id)
      if (result.success) {
        toast.success("Retur dikonfirmasi. Stok telah diperbarui.")
      } else {
        toast.error(result.error)
      }
    })
  }

  function handleCancel() {
    if (!confirm("Batalkan retur ini?")) return
    startTransition(async () => {
      const result = await cancelReturInbound(id)
      if (result.success) {
        toast.success("Retur dibatalkan.")
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <div className="flex items-center gap-3">
      <Button onClick={handleConfirm} disabled={isPending}>
        <Check className="mr-1 h-4 w-4" />
        Confirm Retur
      </Button>
      <Button variant="destructive" onClick={handleCancel} disabled={isPending}>
        <X className="mr-1 h-4 w-4" />
        Cancel
      </Button>
    </div>
  )
}
