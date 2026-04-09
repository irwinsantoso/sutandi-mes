import QRCode from "qrcode"

export interface QrPayload {
  id: string
  txn: string
  item: string
  batch: string | null
  qty: number
  uom: string
  date: string
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
    return JSON.parse(data) as QrPayload
  } catch {
    return null
  }
}
