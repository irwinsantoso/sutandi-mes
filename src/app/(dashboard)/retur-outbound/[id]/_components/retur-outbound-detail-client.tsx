"use client"

import { useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Check, X } from "lucide-react"
import { toast } from "sonner"
import { confirmReturOutbound, cancelReturOutbound } from "../../_actions/retur-outbound-actions"

interface ReturOutboundDetailClientProps {
  id: string
}

export function ReturOutboundDetailClient({ id }: ReturOutboundDetailClientProps) {
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    startTransition(async () => {
      const result = await confirmReturOutbound(id)
      if (result.success) {
        toast.success("Retur dikonfirmasi. Stok telah dikurangi.")
      } else {
        toast.error(result.error)
      }
    })
  }

  function handleCancel() {
    if (!confirm("Batalkan retur ini?")) return
    startTransition(async () => {
      const result = await cancelReturOutbound(id)
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
