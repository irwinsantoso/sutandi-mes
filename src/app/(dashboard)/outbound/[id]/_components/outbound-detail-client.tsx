"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle, XCircle } from "lucide-react"
import { toast } from "sonner"
import {
  confirmOutboundTransaction,
  cancelOutboundTransaction,
} from "../../_actions/outbound-actions"

interface OutboundDetailClientProps {
  transactionId: string
}

export function OutboundDetailClient({ transactionId }: OutboundDetailClientProps) {
  const [isConfirming, startConfirm] = useTransition()
  const [isCancelling, startCancel] = useTransition()
  const router = useRouter()

  function handleConfirm() {
    startConfirm(async () => {
      const result = await confirmOutboundTransaction(transactionId)
      if (result.success) {
        toast.success("Transaction confirmed. Inventory has been decremented.")
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  function handleCancel() {
    startCancel(async () => {
      const result = await cancelOutboundTransaction(transactionId)
      if (result.success) {
        toast.success("Transaction cancelled.")
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-6">
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button disabled={isConfirming}>
                <CheckCircle className="mr-1 h-4 w-4" />
                {isConfirming ? "Confirming..." : "Confirm Transaction"}
              </Button>
            }
          />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Outbound Transaction</AlertDialogTitle>
              <AlertDialogDescription>
                This will decrement inventory quantities for all line items and record stock
                movements. If linked to a production order, consumed quantities will be
                updated. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirm} disabled={isConfirming}>
                {isConfirming ? "Confirming..." : "Confirm"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button variant="destructive" disabled={isCancelling}>
                <XCircle className="mr-1 h-4 w-4" />
                {isCancelling ? "Cancelling..." : "Cancel Transaction"}
              </Button>
            }
          />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Outbound Transaction</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to cancel this transaction? This will mark it as
                cancelled. No inventory changes will be made.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Go Back</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCancel}
                disabled={isCancelling}
                className="bg-destructive/10 text-destructive hover:bg-destructive/20"
              >
                {isCancelling ? "Cancelling..." : "Yes, Cancel Transaction"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}
