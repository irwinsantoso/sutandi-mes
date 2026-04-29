"use client"

import { useTransition } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { confirmDirectWorkOrder, cancelDirectWorkOrder } from "../../_actions/spl-actions"

interface SplDetailClientProps {
  orderId: string
}

export function SplDetailClient({ orderId }: SplDetailClientProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleConfirm() {
    startTransition(async () => {
      const result = await confirmDirectWorkOrder(orderId)
      if (result.success) {
        toast.success("SPL confirmed. Inventory has been updated.")
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  function handleCancel() {
    startTransition(async () => {
      const result = await cancelDirectWorkOrder(orderId)
      if (result.success) {
        toast.success("SPL cancelled.")
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <div className="flex items-center gap-3">
      <Button onClick={handleConfirm} disabled={isPending}>
        {isPending ? "Processing..." : "Confirm SPL"}
      </Button>
      <Button variant="destructive" onClick={handleCancel} disabled={isPending}>
        Cancel SPL
      </Button>
    </div>
  )
}
