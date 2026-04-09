import { describe, it, expect } from "vitest"
import { encodeQrPayload, parseQrPayload, type QrPayload } from "@/lib/qr-code"

describe("QR Code utilities", () => {
  const samplePayload: QrPayload = {
    id: "item-123",
    txn: "IN-20260318-001",
    item: "RM-001",
    batch: "BATCH-A",
    qty: 100,
    uom: "PCS",
    date: "2026-03-18",
  }

  describe("encodeQrPayload", () => {
    it("should encode a payload to JSON string", () => {
      const result = encodeQrPayload(samplePayload)
      expect(result).toBe(JSON.stringify(samplePayload))
    })

    it("should handle null batch", () => {
      const payload = { ...samplePayload, batch: null }
      const result = encodeQrPayload(payload)
      const parsed = JSON.parse(result)
      expect(parsed.batch).toBeNull()
    })
  })

  describe("parseQrPayload", () => {
    it("should parse a valid JSON string into QrPayload", () => {
      const json = JSON.stringify(samplePayload)
      const result = parseQrPayload(json)
      expect(result).toEqual(samplePayload)
    })

    it("should return null for invalid JSON", () => {
      expect(parseQrPayload("not-json")).toBeNull()
    })

    it("should return null for empty string", () => {
      expect(parseQrPayload("")).toBeNull()
    })

    it("should round-trip encode and parse", () => {
      const encoded = encodeQrPayload(samplePayload)
      const decoded = parseQrPayload(encoded)
      expect(decoded).toEqual(samplePayload)
    })

    it("should handle payload with special characters", () => {
      const payload: QrPayload = {
        ...samplePayload,
        item: 'RM-001 "Special" & <tagged>',
        batch: "BATCH/001\\002",
      }
      const encoded = encodeQrPayload(payload)
      const decoded = parseQrPayload(encoded)
      expect(decoded).toEqual(payload)
    })
  })
})
