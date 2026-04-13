import QRCode from "qrcode"

// v2 QR: identifies an inventory bin (item + location + batch + uom),
// not a specific receipt. Stays valid through partial picks and reprints.
export interface QrPayloadV2 {
  v: 2
  item: string              // item code
  loc: string               // location code (unique globally)
  batch: string | null      // batch/lot, null if none
  uom: string               // uom code
}

// v1 QR (legacy): tied to an inbound transaction line. Still accepted at
// outbound so pre-migration stickers continue to work.
export interface QrPayloadV1 {
  v?: 1
  id: string
  txn: string
  item: string
  batch: string | null
  qty: number
  uom: string
  date: string
}

export type QrPayload = QrPayloadV1 | QrPayloadV2

export function isV2(p: QrPayload): p is QrPayloadV2 {
  return (p as QrPayloadV2).v === 2
}

export async function generateQrDataUrl(payload: QrPayload): Promise<string> {
  const json = JSON.stringify(payload)
  return QRCode.toDataURL(json, { errorCorrectionLevel: "M", width: 300 })
}

export function encodeQrPayload(payload: QrPayload): string {
  return JSON.stringify(payload)
}

export function parseQrPayload(data: string): QrPayload | null {
  try {
    const parsed = JSON.parse(data)
    if (parsed && typeof parsed === "object" && "item" in parsed && "uom" in parsed) {
      return parsed as QrPayload
    }
    return null
  } catch {
    return null
  }
}
