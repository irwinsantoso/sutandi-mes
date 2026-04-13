"use client"

import { useEffect, useState } from "react"
import QRCode from "qrcode"
import { Printer, Tag } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
import { encodeQrPayload, type QrPayloadV2 } from "@/lib/qr-code"

interface LabelDialogProps {
  itemCode: string
  itemName: string
  locationCode: string
  locationDisplay: string
  batchLot: string
  uomCode: string
}

export function LabelDialog({
  itemCode,
  itemName,
  locationCode,
  locationDisplay,
  batchLot,
  uomCode,
}: LabelDialogProps) {
  const [open, setOpen] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string>("")

  useEffect(() => {
    if (!open) return
    const payload: QrPayloadV2 = {
      v: 2,
      item: itemCode,
      loc: locationCode,
      batch: batchLot || null,
      uom: uomCode,
    }
    QRCode.toDataURL(encodeQrPayload(payload), {
      errorCorrectionLevel: "M",
      width: 320,
    }).then(setQrDataUrl)
  }, [open, itemCode, locationCode, batchLot, uomCode])

  function handlePrint() {
    if (typeof window !== "undefined") {
      window.print()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="sm" title="Print bin label">
            <Tag className="size-3.5" />
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bin Label</DialogTitle>
          <DialogDescription>
            Scannable label for this inventory bin. Reprint anytime — it stays
            valid as long as this bin exists.
          </DialogDescription>
        </DialogHeader>
        <div
          id="print-label"
          className="mx-auto flex w-full max-w-xs flex-col items-center gap-3 rounded-lg border p-4 print:border-black"
        >
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt={`Label for ${itemCode} at ${locationDisplay}`}
              className="h-56 w-56"
            />
          ) : (
            <div className="flex h-56 w-56 items-center justify-center text-sm text-muted-foreground">
              Generating…
            </div>
          )}
          <div className="w-full space-y-0.5 text-center text-sm">
            <p className="font-mono font-semibold">{itemCode}</p>
            <p className="truncate text-muted-foreground">{itemName}</p>
            <p className="font-mono">{locationDisplay}</p>
            {batchLot && <p className="text-muted-foreground">Batch: {batchLot}</p>}
            <p className="text-muted-foreground">UOM: {uomCode}</p>
          </div>
        </div>
        <div className="flex justify-end print:hidden">
          <Button onClick={handlePrint}>
            <Printer className="size-4" />
            Print
          </Button>
        </div>
        <style jsx global>{`
          @media print {
            body * {
              visibility: hidden;
            }
            #print-label,
            #print-label * {
              visibility: visible;
            }
            #print-label {
              position: absolute;
              top: 0;
              left: 0;
              border: none !important;
            }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  )
}
