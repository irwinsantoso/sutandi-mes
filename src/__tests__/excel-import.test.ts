import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import {
  IMPORT_CONFIGS,
  generateTemplate,
  templateToBuffer,
  parseExcelFile,
  type ImportType,
  type ParseResult,
} from "@/lib/excel-import";

// ============================================================
// HELPERS
// ============================================================

/** Build an in-memory xlsx workbook from an array-of-arrays and return its ArrayBuffer */
function buildXlsx(
  sheetName: string,
  rows: (string | number | null | undefined)[][]
): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return buf;
}

/** Shorthand: parse a sheet built from rows against an import type */
function parseRows(
  importType: ImportType,
  rows: (string | number | null | undefined)[][]
): ParseResult {
  const sheetName = IMPORT_CONFIGS[importType].sheetName;
  const buf = buildXlsx(sheetName, rows);
  return parseExcelFile(buf, importType);
}

// ============================================================
// CONFIG SANITY CHECKS
// ============================================================

describe("IMPORT_CONFIGS", () => {
  const importTypes: ImportType[] = [
    "items",
    "warehouses",
    "uom-conversions",
    "inventory",
    "bom",
  ];

  it("should have a config for every ImportType", () => {
    for (const t of importTypes) {
      expect(IMPORT_CONFIGS[t]).toBeDefined();
      expect(IMPORT_CONFIGS[t].label).toBeTruthy();
      expect(IMPORT_CONFIGS[t].sheetName).toBeTruthy();
      expect(IMPORT_CONFIGS[t].columns.length).toBeGreaterThan(0);
    }
  });

  it("every column should have key, header, required, and type", () => {
    for (const t of importTypes) {
      for (const col of IMPORT_CONFIGS[t].columns) {
        expect(col.key).toBeTruthy();
        expect(col.header).toBeTruthy();
        expect(typeof col.required).toBe("boolean");
        expect(["string", "number", "enum"]).toContain(col.type);
      }
    }
  });

  it("enum columns should have enumValues defined", () => {
    for (const t of importTypes) {
      for (const col of IMPORT_CONFIGS[t].columns) {
        if (col.type === "enum") {
          expect(col.enumValues).toBeDefined();
          expect(col.enumValues!.length).toBeGreaterThan(0);
        }
      }
    }
  });
});

// ============================================================
// TEMPLATE GENERATION
// ============================================================

describe("generateTemplate", () => {
  const importTypes: ImportType[] = [
    "items",
    "warehouses",
    "uom-conversions",
    "inventory",
    "bom",
  ];

  it.each(importTypes)(
    'should generate a valid workbook for "%s"',
    (importType) => {
      const wb = generateTemplate(importType);
      const config = IMPORT_CONFIGS[importType];

      // Should have two sheets: data + instructions
      expect(wb.SheetNames).toContain(config.sheetName);
      expect(wb.SheetNames).toContain("Instructions");

      // Data sheet should have headers in row 1
      const ws = wb.Sheets[config.sheetName];
      const data: string[][] = XLSX.utils.sheet_to_json(ws, {
        header: 1,
        defval: "",
      });
      expect(data.length).toBeGreaterThanOrEqual(2); // header + example

      const headerRow = data[0];
      for (const col of config.columns) {
        expect(headerRow).toContain(col.header);
      }

      // Example row should have values matching config examples
      const exampleRow = data[1];
      for (let i = 0; i < config.columns.length; i++) {
        const col = config.columns[i];
        if (col.example) {
          expect(String(exampleRow[i])).toBe(col.example);
        }
      }
    }
  );

  it("should have column widths set on data sheet", () => {
    const wb = generateTemplate("items");
    const ws = wb.Sheets["Items"];
    expect(ws["!cols"]).toBeDefined();
    expect(ws["!cols"]!.length).toBe(IMPORT_CONFIGS.items.columns.length);
  });
});

describe("templateToBuffer", () => {
  it("should return a non-empty buffer", () => {
    const buf = templateToBuffer("items");
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.byteLength).toBeGreaterThan(0);
  });

  it("the buffer should be re-parseable as a valid xlsx", () => {
    const buf = templateToBuffer("inventory");
    const wb = XLSX.read(buf, { type: "buffer" });
    expect(wb.SheetNames.length).toBe(2);
  });
});

// ============================================================
// PARSING — ITEMS
// ============================================================

describe("parseExcelFile — items", () => {
  const headers = ["Code", "Name", "Description", "Category", "Base UOM Code"];

  it("should parse a valid items row", () => {
    const result = parseRows("items", [
      headers,
      ["RM-001", "Steel Sheet", "1mm thick", "RAW_MATERIAL", "PCS"],
    ]);

    expect(result.totalRows).toBe(1);
    expect(result.validRows).toBe(1);
    expect(result.errorRows).toBe(0);

    const row = result.rows[0];
    expect(row.data.code).toBe("RM-001");
    expect(row.data.name).toBe("Steel Sheet");
    expect(row.data.description).toBe("1mm thick");
    expect(row.data.category).toBe("RAW_MATERIAL");
    expect(row.data.baseUomCode).toBe("PCS");
    expect(row.errors).toHaveLength(0);
  });

  it("should flag missing required fields", () => {
    const result = parseRows("items", [
      headers,
      ["", "Steel Sheet", null, "RAW_MATERIAL", "PCS"], // missing code
      ["RM-002", "", null, "RAW_MATERIAL", "PCS"], // missing name
      ["RM-003", "Bolt", null, "", "PCS"], // missing category
      ["RM-004", "Nut", null, "RAW_MATERIAL", ""], // missing UOM code
    ]);

    expect(result.totalRows).toBe(4);
    expect(result.errorRows).toBe(4);

    expect(result.rows[0].errors).toContain('"Code" is required.');
    expect(result.rows[1].errors).toContain('"Name" is required.');
    expect(result.rows[2].errors).toContain('"Category" is required.');
    expect(result.rows[3].errors).toContain('"Base UOM Code" is required.');
  });

  it("should flag invalid enum values for category", () => {
    const result = parseRows("items", [
      headers,
      ["RM-001", "Steel", null, "INVALID_CAT", "PCS"],
    ]);

    expect(result.rows[0].errors.length).toBe(1);
    expect(result.rows[0].errors[0]).toContain("must be one of");
    expect(result.rows[0].errors[0]).toContain("INVALID_CAT");
  });

  it("should normalise enum values to uppercase", () => {
    const result = parseRows("items", [
      headers,
      ["RM-001", "Steel", null, "raw_material", "PCS"],
    ]);

    expect(result.rows[0].errors).toHaveLength(0);
    expect(result.rows[0].data.category).toBe("RAW_MATERIAL");
  });

  it("description should be optional", () => {
    const result = parseRows("items", [
      headers,
      ["RM-001", "Steel Sheet", null, "RAW_MATERIAL", "PCS"],
    ]);

    expect(result.rows[0].errors).toHaveLength(0);
    expect(result.rows[0].data.description).toBeNull();
  });

  it("should handle multiple valid rows", () => {
    const result = parseRows("items", [
      headers,
      ["RM-001", "Steel Sheet", "desc1", "RAW_MATERIAL", "PCS"],
      ["FG-001", "Widget", "desc2", "FINISHED_GOOD", "BOX"],
      ["PK-001", "Cardboard Box", null, "PACKAGING", "PCS"],
    ]);

    expect(result.totalRows).toBe(3);
    expect(result.validRows).toBe(3);
    expect(result.errorRows).toBe(0);
  });

  it("should skip completely empty rows", () => {
    const result = parseRows("items", [
      headers,
      ["RM-001", "Steel Sheet", null, "RAW_MATERIAL", "PCS"],
      [null, null, null, null, null], // empty row
      ["FG-001", "Widget", null, "FINISHED_GOOD", "BOX"],
    ]);

    expect(result.totalRows).toBe(2);
    expect(result.rows.map((r) => r.data.code)).toEqual(["RM-001", "FG-001"]);
  });

  it("row index should reflect original Excel row number (1-based, header=row 1)", () => {
    const result = parseRows("items", [
      headers,
      ["RM-001", "Steel", null, "RAW_MATERIAL", "PCS"],
      ["RM-002", "Bolt", null, "RAW_MATERIAL", "PCS"],
    ]);

    expect(result.rows[0].rowIndex).toBe(2);
    expect(result.rows[1].rowIndex).toBe(3);
  });
});

// ============================================================
// PARSING — WAREHOUSES & LOCATIONS
// ============================================================

describe("parseExcelFile — warehouses", () => {
  const headers = [
    "Warehouse Code",
    "Warehouse Name",
    "Warehouse Address",
    "Location Code",
    "Location Name",
    "Zone",
  ];

  it("should parse warehouse-only rows (no location)", () => {
    const result = parseRows("warehouses", [
      headers,
      ["WH-01", "Main Warehouse", "123 St", null, null, null],
    ]);

    expect(result.validRows).toBe(1);
    expect(result.rows[0].data.warehouseCode).toBe("WH-01");
    expect(result.rows[0].data.locationCode).toBeNull();
  });

  it("should parse rows with warehouse + location", () => {
    const result = parseRows("warehouses", [
      headers,
      ["WH-01", "Main Warehouse", "123 St", "WH-01-A1", "Rack A1", "Zone A"],
    ]);

    expect(result.validRows).toBe(1);
    expect(result.rows[0].data.locationCode).toBe("WH-01-A1");
    expect(result.rows[0].data.locationName).toBe("Rack A1");
    expect(result.rows[0].data.zone).toBe("Zone A");
  });

  it("should flag missing warehouse code", () => {
    const result = parseRows("warehouses", [
      headers,
      [null, "Main Warehouse", null, null, null, null],
    ]);

    expect(result.rows[0].errors).toContain('"Warehouse Code" is required.');
  });

  it("should flag missing warehouse name", () => {
    const result = parseRows("warehouses", [
      headers,
      ["WH-01", null, null, null, null, null],
    ]);

    expect(result.rows[0].errors).toContain('"Warehouse Name" is required.');
  });
});

// ============================================================
// PARSING — UOM CONVERSIONS
// ============================================================

describe("parseExcelFile — uom-conversions", () => {
  const headers = [
    "Item Code",
    "From UOM Code",
    "To UOM Code",
    "Conversion Factor",
  ];

  it("should parse a valid conversion row", () => {
    const result = parseRows("uom-conversions", [
      headers,
      ["RM-001", "BOX", "PCS", 12],
    ]);

    expect(result.validRows).toBe(1);
    expect(result.rows[0].data.itemCode).toBe("RM-001");
    expect(result.rows[0].data.fromUomCode).toBe("BOX");
    expect(result.rows[0].data.toUomCode).toBe("PCS");
    expect(result.rows[0].data.conversionFactor).toBe(12);
  });

  it("should parse decimal conversion factors", () => {
    const result = parseRows("uom-conversions", [
      headers,
      ["RM-001", "KG", "LB", 2.20462],
    ]);

    expect(result.rows[0].data.conversionFactor).toBeCloseTo(2.20462, 4);
    expect(result.rows[0].errors).toHaveLength(0);
  });

  it("should flag non-numeric conversion factor", () => {
    // XLSX will convert "abc" to NaN when we do Number("abc")
    const result = parseRows("uom-conversions", [
      headers,
      ["RM-001", "BOX", "PCS", "abc"],
    ]);

    expect(result.rows[0].errors.length).toBeGreaterThan(0);
    expect(result.rows[0].errors.some((e) => e.includes("valid number"))).toBe(
      true
    );
  });

  it("should flag all missing required fields", () => {
    // At least one cell must be non-empty or the row is skipped as empty
    const result = parseRows("uom-conversions", [
      headers,
      ["", "", "", "not-a-number"],
    ]);

    expect(result.rows[0].errors).toContain('"Item Code" is required.');
    expect(result.rows[0].errors).toContain('"From UOM Code" is required.');
    expect(result.rows[0].errors).toContain('"To UOM Code" is required.');
  });
});

// ============================================================
// PARSING — INVENTORY
// ============================================================

describe("parseExcelFile — inventory", () => {
  const headers = [
    "Item Code",
    "Location Code",
    "Batch / Lot",
    "Quantity",
    "UOM Code",
  ];

  it("should parse a valid inventory row", () => {
    const result = parseRows("inventory", [
      headers,
      ["RM-001", "WH-01-A1", "LOT-001", 100, "PCS"],
    ]);

    expect(result.validRows).toBe(1);
    expect(result.rows[0].data.itemCode).toBe("RM-001");
    expect(result.rows[0].data.locationCode).toBe("WH-01-A1");
    expect(result.rows[0].data.batchLot).toBe("LOT-001");
    expect(result.rows[0].data.quantity).toBe(100);
    expect(result.rows[0].data.uomCode).toBe("PCS");
  });

  it("batch/lot should be optional", () => {
    const result = parseRows("inventory", [
      headers,
      ["RM-001", "WH-01-A1", null, 50, "PCS"],
    ]);

    expect(result.rows[0].errors).toHaveLength(0);
    expect(result.rows[0].data.batchLot).toBeNull();
  });

  it("should flag missing item code", () => {
    const result = parseRows("inventory", [
      headers,
      [null, "WH-01-A1", null, 50, "PCS"],
    ]);

    expect(result.rows[0].errors).toContain('"Item Code" is required.');
  });

  it("should handle zero quantity", () => {
    const result = parseRows("inventory", [
      headers,
      ["RM-001", "WH-01-A1", null, 0, "PCS"],
    ]);

    // 0 is a valid number
    expect(result.rows[0].data.quantity).toBe(0);
    expect(result.rows[0].errors).toHaveLength(0);
  });

  it("should handle decimal quantities", () => {
    const result = parseRows("inventory", [
      headers,
      ["RM-001", "WH-01-A1", null, 12.5, "KG"],
    ]);

    expect(result.rows[0].data.quantity).toBe(12.5);
    expect(result.rows[0].errors).toHaveLength(0);
  });
});

// ============================================================
// PARSING — BOM
// ============================================================

describe("parseExcelFile — bom", () => {
  const headers = [
    "BOM Name",
    "Order Type",
    "Line Type",
    "Item Code",
    "Quantity",
    "UOM Code",
  ];

  it("should parse a complete BOM with materials and outputs", () => {
    const result = parseRows("bom", [
      headers,
      ["Widget Assembly", "FINISHED_GOOD", "MATERIAL", "RM-001", 10, "PCS"],
      ["Widget Assembly", "FINISHED_GOOD", "MATERIAL", "RM-002", 5, "PCS"],
      ["Widget Assembly", "FINISHED_GOOD", "OUTPUT", "FG-001", 1, "PCS"],
    ]);

    expect(result.totalRows).toBe(3);
    expect(result.validRows).toBe(3);
    expect(result.errorRows).toBe(0);

    expect(result.rows[0].data.bomName).toBe("Widget Assembly");
    expect(result.rows[0].data.lineType).toBe("MATERIAL");
    expect(result.rows[2].data.lineType).toBe("OUTPUT");
  });

  it("should normalise enum values to uppercase", () => {
    const result = parseRows("bom", [
      headers,
      ["Test BOM", "finished_good", "material", "RM-001", 10, "PCS"],
    ]);

    expect(result.rows[0].data.orderType).toBe("FINISHED_GOOD");
    expect(result.rows[0].data.lineType).toBe("MATERIAL");
    expect(result.rows[0].errors).toHaveLength(0);
  });

  it("should flag invalid order type", () => {
    const result = parseRows("bom", [
      headers,
      ["Test BOM", "INVALID_TYPE", "MATERIAL", "RM-001", 10, "PCS"],
    ]);

    expect(result.rows[0].errors.length).toBe(1);
    expect(result.rows[0].errors[0]).toContain("Order Type");
    expect(result.rows[0].errors[0]).toContain("INVALID_TYPE");
  });

  it("should flag invalid line type", () => {
    const result = parseRows("bom", [
      headers,
      ["Test BOM", "WIP", "CONSUMPTION", "RM-001", 10, "PCS"],
    ]);

    expect(result.rows[0].errors.length).toBe(1);
    expect(result.rows[0].errors[0]).toContain("Line Type");
  });

  it("should flag non-numeric quantity", () => {
    const result = parseRows("bom", [
      headers,
      ["Test BOM", "WIP", "MATERIAL", "RM-001", "many", "PCS"],
    ]);

    expect(result.rows[0].errors.some((e) => e.includes("valid number"))).toBe(
      true
    );
  });
});

// ============================================================
// EDGE CASES
// ============================================================

describe("parseExcelFile — edge cases", () => {
  it("should return empty result for header-only file", () => {
    const result = parseRows("items", [
      ["Code", "Name", "Description", "Category", "Base UOM Code"],
    ]);

    expect(result.totalRows).toBe(0);
    expect(result.validRows).toBe(0);
    expect(result.rows).toHaveLength(0);
  });

  it("should return empty result for empty workbook", () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([]);
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });

    const result = parseExcelFile(buf, "items");
    expect(result.totalRows).toBe(0);
  });

  it("should use first sheet if named sheet not found", () => {
    const rows = [
      ["Code", "Name", "Description", "Category", "Base UOM Code"],
      ["RM-001", "Steel", null, "RAW_MATERIAL", "PCS"],
    ];
    const buf = buildXlsx("RandomSheetName", rows);
    const result = parseExcelFile(buf, "items");

    expect(result.totalRows).toBe(1);
    expect(result.validRows).toBe(1);
  });

  it("should handle case-insensitive header matching", () => {
    const result = parseRows("items", [
      ["code", "NAME", "Description", "CATEGORY", "base uom code"],
      ["RM-001", "Steel", null, "RAW_MATERIAL", "PCS"],
    ]);

    expect(result.validRows).toBe(1);
    expect(result.rows[0].data.code).toBe("RM-001");
  });

  it("should flag required columns that are missing from headers entirely", () => {
    // Missing "Category" and "Base UOM Code" columns
    const buf = buildXlsx("Items", [
      ["Code", "Name", "Description"],
      ["RM-001", "Steel", "desc"],
    ]);
    const result = parseExcelFile(buf, "items");

    expect(result.rows[0].errors).toContain(
      'Column "Category" not found in the spreadsheet.'
    );
    expect(result.rows[0].errors).toContain(
      'Column "Base UOM Code" not found in the spreadsheet.'
    );
  });

  it("should trim whitespace from string values", () => {
    const result = parseRows("items", [
      ["Code", "Name", "Description", "Category", "Base UOM Code"],
      ["  RM-001  ", "  Steel  ", "  desc  ", "  RAW_MATERIAL  ", "  PCS  "],
    ]);

    expect(result.rows[0].data.code).toBe("RM-001");
    expect(result.rows[0].data.name).toBe("Steel");
    expect(result.rows[0].data.description).toBe("desc");
    expect(result.rows[0].data.baseUomCode).toBe("PCS");
    expect(result.rows[0].errors).toHaveLength(0);
  });

  it("should handle a mix of valid and invalid rows", () => {
    const result = parseRows("items", [
      ["Code", "Name", "Description", "Category", "Base UOM Code"],
      ["RM-001", "Steel", null, "RAW_MATERIAL", "PCS"], // valid
      ["", "Missing Code", null, "WIP", "PCS"], // invalid
      ["FG-001", "Widget", null, "FINISHED_GOOD", "BOX"], // valid
      ["PK-001", "Box", null, "NONSENSE", "PCS"], // invalid (bad enum)
    ]);

    expect(result.totalRows).toBe(4);
    expect(result.validRows).toBe(2);
    expect(result.errorRows).toBe(2);

    expect(result.rows[0].errors).toHaveLength(0);
    expect(result.rows[1].errors.length).toBeGreaterThan(0);
    expect(result.rows[2].errors).toHaveLength(0);
    expect(result.rows[3].errors.length).toBeGreaterThan(0);
  });

  it("should handle extra columns gracefully (ignored)", () => {
    const result = parseRows("items", [
      [
        "Code",
        "Name",
        "Description",
        "Category",
        "Base UOM Code",
        "Extra Column",
      ],
      ["RM-001", "Steel", null, "RAW_MATERIAL", "PCS", "ignored value"],
    ]);

    expect(result.validRows).toBe(1);
    expect(result.rows[0].errors).toHaveLength(0);
    // Extra column data should not appear in parsed data
    expect(result.rows[0].data).not.toHaveProperty("Extra Column");
  });

  it("should handle columns in different order", () => {
    const result = parseRows("items", [
      ["Base UOM Code", "Category", "Name", "Code", "Description"],
      ["PCS", "RAW_MATERIAL", "Steel", "RM-001", "desc"],
    ]);

    expect(result.validRows).toBe(1);
    expect(result.rows[0].data.code).toBe("RM-001");
    expect(result.rows[0].data.name).toBe("Steel");
    expect(result.rows[0].data.category).toBe("RAW_MATERIAL");
    expect(result.rows[0].data.baseUomCode).toBe("PCS");
  });
});

// ============================================================
// ROUND-TRIP: TEMPLATE → PARSE
// ============================================================

describe("round-trip: generate template then parse it", () => {
  const importTypes: ImportType[] = [
    "items",
    "warehouses",
    "uom-conversions",
    "inventory",
    "bom",
  ];

  it.each(importTypes)(
    'template for "%s" should be parseable with the example row being valid',
    (importType) => {
      const buf = templateToBuffer(importType);
      // Node Buffer may share a pooled ArrayBuffer, so copy to a fresh one
      const arrayBuffer = Uint8Array.from(buf).buffer;
      const result = parseExcelFile(arrayBuffer, importType);

      // The template has exactly one example row
      expect(result.totalRows).toBe(1);
      // The example row should be valid (all examples should satisfy their own constraints)
      expect(result.validRows).toBe(1);
      expect(result.errorRows).toBe(0);
      expect(result.rows[0].errors).toHaveLength(0);
    }
  );
});
