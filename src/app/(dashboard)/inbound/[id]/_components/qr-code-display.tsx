"use client"

interface QrItem {
  id: string
  itemCode: string
  itemName: string
  batchLot: string | null
  quantity: string
  uomCode: string
  qrDataUrl: string
}

interface QrCodeDisplayProps {
  items: QrItem[]
}

export function QrCodeDisplay({ items }: QrCodeDisplayProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-3 print:gap-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-start gap-3 rounded-lg border p-3 print:break-inside-avoid print:border-gray-300"
        >
          {item.qrDataUrl ? (
            <img
              src={item.qrDataUrl}
              alt={`QR code for ${item.itemCode}`}
              className="h-24 w-24 shrink-0"
            />
          ) : (
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
              No QR
            </div>
          )}
          <div className="min-w-0 space-y-1 text-sm">
            <p className="font-medium truncate">{item.itemCode}</p>
            <p className="text-muted-foreground truncate">{item.itemName}</p>
            {item.batchLot && (
              <p className="text-muted-foreground">Batch: {item.batchLot}</p>
            )}
            <p className="text-muted-foreground">
              Qty: {item.quantity} {item.uomCode}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
