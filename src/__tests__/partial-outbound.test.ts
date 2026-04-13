import { describe, it, expect } from "vitest"
import { parseQrPayload, encodeQrPayload, isV2, type QrPayloadV1 } from "@/lib/qr-code"

/**
 * Tests for partial outbound QR scanning logic.
 *
 * When a QR label is scanned during outbound, the system auto-fills item,
 * batch, UOM, and quantity. The user can then adjust the quantity to take
 * a partial amount. These tests verify the parsing, partial qty detection,
 * and validation logic used in the outbound form.
 */

// Simulates the form-level logic from outbound-form.tsx handleParseQr
function simulateQrScan(qrText: string, items: Array<{ code: string; id: string }>) {
  const payload = parseQrPayload(qrText)
  if (!payload) return null
  if (isV2(payload)) return null

  const matchedItem = items.find((i) => i.code === payload.item)

  return {
    itemId: matchedItem?.id ?? null,
    quantity: payload.qty,
    qrOriginalQty: payload.qty,
    batchLot: payload.batch,
    uom: payload.uom,
    scannedQrData: qrText,
  }
}

// Simulates the partial quantity validation shown below the quantity field
function getPartialInfo(qrOriginalQty: number | null, outboundQty: number) {
  if (qrOriginalQty === null) {
    return { isPartial: false, remaining: 0, exceedsLabel: false, excessAmount: 0 }
  }
  const isPartial = outboundQty < qrOriginalQty
  const remaining = isPartial ? qrOriginalQty - outboundQty : 0
  const exceedsLabel = outboundQty > qrOriginalQty
  const excessAmount = exceedsLabel ? outboundQty - qrOriginalQty : 0
  return { isPartial, remaining, exceedsLabel, excessAmount }
}

describe("Partial outbound QR scanning", () => {
  const samplePayload: QrPayloadV1 = {
    id: "item-abc",
    txn: "IN-20260410-001",
    item: "RM-001",
    batch: "BATCH-X",
    qty: 5,
    uom: "PCS",
    date: "2026-04-10",
  }

  const items = [
    { code: "RM-001", id: "id-rm-001" },
    { code: "RM-002", id: "id-rm-002" },
  ]

  describe("QR scan parsing for outbound", () => {
    it("should parse a valid QR and return all fields including original qty", () => {
      const qrText = encodeQrPayload(samplePayload)
      const result = simulateQrScan(qrText, items)

      expect(result).not.toBeNull()
      expect(result!.itemId).toBe("id-rm-001")
      expect(result!.quantity).toBe(5)
      expect(result!.qrOriginalQty).toBe(5)
      expect(result!.batchLot).toBe("BATCH-X")
      expect(result!.uom).toBe("PCS")
      expect(result!.scannedQrData).toBe(qrText)
    })

    it("should return null for invalid QR data", () => {
      expect(simulateQrScan("not-valid-json", items)).toBeNull()
      expect(simulateQrScan("", items)).toBeNull()
    })

    it("should set itemId to null when item code is not found in master list", () => {
      const payload = { ...samplePayload, item: "UNKNOWN-999" }
      const qrText = encodeQrPayload(payload)
      const result = simulateQrScan(qrText, items)

      expect(result).not.toBeNull()
      expect(result!.itemId).toBeNull()
      expect(result!.quantity).toBe(5)
      expect(result!.qrOriginalQty).toBe(5)
    })

    it("should handle QR with null batch", () => {
      const payload = { ...samplePayload, batch: null }
      const qrText = encodeQrPayload(payload)
      const result = simulateQrScan(qrText, items)

      expect(result).not.toBeNull()
      expect(result!.batchLot).toBeNull()
    })

    it("should preserve original qty even when qty is 0 in QR", () => {
      const payload = { ...samplePayload, qty: 0 }
      const qrText = encodeQrPayload(payload)
      const result = simulateQrScan(qrText, items)

      expect(result).not.toBeNull()
      expect(result!.qrOriginalQty).toBe(0)
      expect(result!.quantity).toBe(0)
    })

    it("should handle decimal quantities from QR", () => {
      const payload = { ...samplePayload, qty: 2.5 }
      const qrText = encodeQrPayload(payload)
      const result = simulateQrScan(qrText, items)

      expect(result).not.toBeNull()
      expect(result!.qrOriginalQty).toBe(2.5)
      expect(result!.quantity).toBe(2.5)
    })
  })

  describe("Partial quantity detection", () => {
    it("should detect partial when outbound qty < QR label qty", () => {
      const info = getPartialInfo(5, 2)

      expect(info.isPartial).toBe(true)
      expect(info.remaining).toBe(3)
      expect(info.exceedsLabel).toBe(false)
      expect(info.excessAmount).toBe(0)
    })

    it("should detect partial when taking 1 out of many", () => {
      const info = getPartialInfo(100, 1)

      expect(info.isPartial).toBe(true)
      expect(info.remaining).toBe(99)
    })

    it("should not be partial when qty equals QR label qty (full take)", () => {
      const info = getPartialInfo(5, 5)

      expect(info.isPartial).toBe(false)
      expect(info.remaining).toBe(0)
      expect(info.exceedsLabel).toBe(false)
      expect(info.excessAmount).toBe(0)
    })

    it("should handle decimal partial quantities", () => {
      const info = getPartialInfo(10.5, 3.5)

      expect(info.isPartial).toBe(true)
      expect(info.remaining).toBe(7)
    })

    it("should not flag anything when no QR was scanned (qrOriginalQty is null)", () => {
      const info = getPartialInfo(null, 10)

      expect(info.isPartial).toBe(false)
      expect(info.remaining).toBe(0)
      expect(info.exceedsLabel).toBe(false)
      expect(info.excessAmount).toBe(0)
    })
  })

  describe("Exceeds QR label quantity validation", () => {
    it("should warn when outbound qty exceeds QR label qty", () => {
      const info = getPartialInfo(5, 8)

      expect(info.exceedsLabel).toBe(true)
      expect(info.excessAmount).toBe(3)
      expect(info.isPartial).toBe(false)
    })

    it("should warn when exceeding by a fractional amount", () => {
      const info = getPartialInfo(5, 5.5)

      expect(info.exceedsLabel).toBe(true)
      expect(info.excessAmount).toBeCloseTo(0.5)
    })

    it("should not warn when qty equals label qty exactly", () => {
      const info = getPartialInfo(10, 10)

      expect(info.exceedsLabel).toBe(false)
      expect(info.excessAmount).toBe(0)
    })

    it("should not warn when qty is less than label qty", () => {
      const info = getPartialInfo(10, 7)

      expect(info.exceedsLabel).toBe(false)
      expect(info.excessAmount).toBe(0)
    })
  })

  describe("QR scan → adjust quantity workflow", () => {
    it("should allow full workflow: scan → get original qty → adjust to partial", () => {
      // Step 1: Scan the QR label
      const qrText = encodeQrPayload(samplePayload)
      const scanResult = simulateQrScan(qrText, items)
      expect(scanResult).not.toBeNull()

      // Step 2: Form is populated with original qty of 5
      expect(scanResult!.quantity).toBe(5)
      expect(scanResult!.qrOriginalQty).toBe(5)

      // Step 3: User changes qty to 2 (partial outbound)
      const userQty = 2
      const info = getPartialInfo(scanResult!.qrOriginalQty, userQty)

      expect(info.isPartial).toBe(true)
      expect(info.remaining).toBe(3)
      expect(info.exceedsLabel).toBe(false)
    })

    it("should handle scan → user increases qty above label (with warning)", () => {
      const qrText = encodeQrPayload(samplePayload)
      const scanResult = simulateQrScan(qrText, items)
      expect(scanResult).not.toBeNull()

      // User enters more than label qty
      const userQty = 10
      const info = getPartialInfo(scanResult!.qrOriginalQty, userQty)

      expect(info.exceedsLabel).toBe(true)
      expect(info.excessAmount).toBe(5)
    })

    it("should support multiple items with different partial amounts", () => {
      const line1Payload: QrPayloadV1 = { ...samplePayload, qty: 10, item: "RM-001" }
      const line2Payload: QrPayloadV1 = { ...samplePayload, qty: 20, item: "RM-002" }

      const scan1 = simulateQrScan(encodeQrPayload(line1Payload), items)
      const scan2 = simulateQrScan(encodeQrPayload(line2Payload), items)

      expect(scan1!.itemId).toBe("id-rm-001")
      expect(scan2!.itemId).toBe("id-rm-002")

      // Take partial from each
      const info1 = getPartialInfo(scan1!.qrOriginalQty, 3)
      const info2 = getPartialInfo(scan2!.qrOriginalQty, 15)

      expect(info1.isPartial).toBe(true)
      expect(info1.remaining).toBe(7)
      expect(info2.isPartial).toBe(true)
      expect(info2.remaining).toBe(5)
    })
  })
})
