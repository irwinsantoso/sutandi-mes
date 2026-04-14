import { describe, it, expect, vi } from "vitest"

// We test the pure logic portion of transaction number generation
// The actual function uses Prisma, so we test the formatting logic

describe("Transaction number format", () => {
  it("should format sequence numbers with 3-digit padding", () => {
    const format = (prefix: string, date: string, seq: number) =>
      `${prefix}-${date}-${String(seq).padStart(3, "0")}`

    expect(format("IN", "20260318", 1)).toBe("IN-20260318-001")
    expect(format("IN", "20260318", 99)).toBe("IN-20260318-099")
    expect(format("OUT", "20260318", 100)).toBe("OUT-20260318-100")
    expect(format("PO", "20260318", 1000)).toBe("PO-20260318-1000")
  })

  it("should extract sequence from transaction number", () => {
    const extractSeq = (txn: string) => parseInt(txn.split("-")[2])

    expect(extractSeq("IN-20260318-001")).toBe(1)
    expect(extractSeq("OUT-20260318-042")).toBe(42)
    expect(extractSeq("PO-20260318-100")).toBe(100)
  })

  it("should increment sequence correctly", () => {
    const latest = "IN-20260318-005"
    const seq = parseInt(latest.split("-")[2]) + 1
    expect(seq).toBe(6)
  })

  it("should start at 1 when no latest exists", () => {
    const latest = null as string | null
    const seq = latest ? parseInt(latest.split("-")[2]) + 1 : 1
    expect(seq).toBe(1)
  })

  it("should produce valid prefixes", () => {
    const validPrefixes = ["IN", "OUT", "PO"]
    validPrefixes.forEach((prefix) => {
      const txn = `${prefix}-20260318-001`
      expect(txn).toMatch(new RegExp(`^${prefix}-\\d{8}-\\d{3,}$`))
    })
  })
})
