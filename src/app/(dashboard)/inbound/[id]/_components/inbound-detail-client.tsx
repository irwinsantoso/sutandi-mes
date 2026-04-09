"use client"

import { useState, useTransition } from "react"
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
import { CheckCircle, XCircle, Printer } from "lucide-react"
import {
  confirmInboundTransaction,
  cancelInboundTransaction,
} from "../../_actions/inbound-actions"

interface InboundDetailClientProps {
  transactionId: string
  status: string
}

export function InboundDetailClient({
  transactionId,
  status,
}: InboundDetailClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleConfirm() {
    setError(null)
    startTransition(async () => {
      const result = await confirmInboundTransaction(transactionId)
      if (!result.success) {
        setError(result.error)
      } else {
        router.refresh()
      }
    })
  }

  function handleCancel() {
    setError(null)
    startTransition(async () => {
      const result = await cancelInboundTransaction(transactionId)
      if (!result.success) {
        setError(result.error)
      } else {
        router.refresh()
      }
    })
  }

  function handlePrint() {
    window.print()
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex items-center gap-2 print:hidden">
        <Button variant="outline" onClick={handlePrint}>
          <Printer className="mr-1 h-4 w-4" />
          Print QR Codes
        </Button>

        {status === "DRAFT" && (
          <>
            <Button onClick={handleConfirm} disabled={isPending}>
              <CheckCircle className="mr-1 h-4 w-4" />
              {isPending ? "Processing..." : "Confirm"}
            </Button>

            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button variant="destructive" disabled={isPending}>
                    <XCircle className="mr-1 h-4 w-4" />
                    Cancel
                  </Button>
                }
              />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel Transaction</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to cancel this inbound transaction?
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>No, keep it</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={handleCancel}
                    disabled={isPending}
                  >
                    Yes, cancel it
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </div>
    </div>
  )
}
