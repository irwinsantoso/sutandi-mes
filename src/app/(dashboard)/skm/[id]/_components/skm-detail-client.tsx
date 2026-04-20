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
import { CheckCircle, XCircle } from "lucide-react"
import { confirmMaterialRequest, cancelMaterialRequest } from "../../_actions/skm-actions"

interface SkmDetailClientProps {
  requestId: string
  status: string
}

export function SkmDetailClient({ requestId, status }: SkmDetailClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleConfirm() {
    setError(null)
    startTransition(async () => {
      const result = await confirmMaterialRequest(requestId)
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
      const result = await cancelMaterialRequest(requestId)
      if (!result.success) {
        setError(result.error)
      } else {
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {status === "DRAFT" && (
        <div className="flex items-center gap-2">
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
                <AlertDialogTitle>Cancel Material Request</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to cancel this material request? This
                  action cannot be undone.
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
        </div>
      )}
    </div>
  )
}
