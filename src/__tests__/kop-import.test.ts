import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { parseKopFile } from "@/lib/kop-import";

function loadAstera(): ArrayBuffer {
  const p = resolve(
    process.cwd(),
    "existing-sys-docs/01. ASTERA ( MOCKUP TERPASANG ).xlsx"
  );
  const buf = readFileSync(p);
  // Copy into a fresh ArrayBuffer so it is decoupled from the Node Buffer's
  // internal (possibly pooled) backing store.
  const ab = new ArrayBuffer(buf.byteLength);
  new Uint8Array(ab).set(buf);
  return ab;
}

describe("parseKopFile — ASTERA fixture", () => {
  const result = parseKopFile(loadAstera());

  it("has no parse errors", () => {
    expect(result.errors).toEqual([]);
  });

  it("extracts every header field from rows 5-11", () => {
    expect(result.header.orderNumber).toBe("01/WO/IV/26");
    expect(result.header.description).toBe("ASTERA ( MOCKUP TERPASANG )");
    expect(result.header.plannedStartDateRaw).toBe("01 APRIL 2026");
    expect(result.header.plannedStartDate).toBe("2026-04-01");
    expect(result.header.jenisWarna).toBe("SF-100 / YB1N");
    expect(result.header.typeVariant).toBe("A2 STD");
    expect(result.header.tangga).toBe("Kanan");
    expect(result.header.departmentName).toBe("RAT-SBU-26002");
  });

  it("reads the 4 outputs with correct quantities (1/1/1/2)", () => {
    expect(result.outputs).toHaveLength(4);
    expect(result.outputs.map((o) => o.itemCode)).toEqual([
      "P1-DSR_A2 STD",
      "J1-DSR_A2 STD",
      "J2-DSR_A2 STD",
      "J2-01_A2 STD",
    ]);
    expect(result.outputs.map((o) => o.quantity)).toEqual([1, 1, 1, 2]);
  });

  it("reads 15 materials from KEBUTUHAN MATERIAL", () => {
    const mats = result.materials.filter((m) => m.section === "material");
    expect(mats).toHaveLength(15);
    expect(mats[0].itemCode).toBe("9K-86001");
    expect(mats[0].panjang).toBe(6000);
    expect(mats[0].quantity).toBe(2);
    expect(mats[0].uomCode).toBe("pcs");
  });

  it("reads accessories with their UOM from Satuan column", () => {
    const accs = result.materials.filter((m) => m.section === "accessory");
    expect(accs.length).toBeGreaterThan(0);
    const first = accs[0];
    expect(first.itemCode).toBe("2K-22464");
    expect(first.uomCode).toBe("mm");
    expect(first.quantity).toBe(12460);
  });

  it("stops collecting when it hits a blank row", () => {
    // The file has ~29 accessories then blank rows; we should not be pulling in
    // nulls beyond the last real row.
    for (const m of result.materials) {
      expect(m.itemCode).toBeTruthy();
      expect(m.quantity).toBeGreaterThan(0);
    }
  });
});
