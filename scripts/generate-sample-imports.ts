/**
 * Generates sample master-data Excel uploads with coherent dummy data.
 * Run with:  npx tsx scripts/generate-sample-imports.ts
 * Output:    samples/imports/*.xlsx
 *
 * Upload order (matches the /import page):
 *   1) warehouses.xlsx       -> creates WH-02 and its locations
 *   2) items.xlsx            -> creates raw materials, packaging, WIP, finished goods
 *   3) uom-conversions.xlsx  -> adds PACK/BUNDLE conversions for items
 *   4) inventory.xlsx        -> seeds starting stock in WH-02 locations
 *   5) bom.xlsx              -> creates production order templates (WIP + FG)
 *   6) production-orders.xlsx -> creates scheduled production orders with dates/status
 *
 * Assumes the default seed has already run (UOMs: PCS, PACK, BUNDLE; admin user).
 */

import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";
import { IMPORT_CONFIGS, type ImportType } from "../src/lib/excel-import";

type Row = Record<string, string | number>;

const SAMPLES: Record<ImportType, Row[]> = {
  warehouses: [
    { warehouseCode: "WH-02", warehouseName: "Secondary Warehouse", warehouseAddress: "Jl. Industri No. 42", locationCode: "WH-02-A1", locationName: "Rack A Row 1", zone: "A" },
    { warehouseCode: "WH-02", warehouseName: "Secondary Warehouse", warehouseAddress: "Jl. Industri No. 42", locationCode: "WH-02-A2", locationName: "Rack A Row 2", zone: "A" },
    { warehouseCode: "WH-02", warehouseName: "Secondary Warehouse", warehouseAddress: "Jl. Industri No. 42", locationCode: "WH-02-B1", locationName: "Rack B Row 1", zone: "B" },
    { warehouseCode: "WH-02", warehouseName: "Secondary Warehouse", warehouseAddress: "Jl. Industri No. 42", locationCode: "WH-02-B2", locationName: "Rack B Row 2", zone: "B" },
    { warehouseCode: "WH-02", warehouseName: "Secondary Warehouse", warehouseAddress: "Jl. Industri No. 42", locationCode: "WH-02-FG", locationName: "Finished Goods Bay", zone: "FG" },
  ],

  items: [
    { code: "RM-101", name: "Steel Sheet 1mm",     description: "Cold-rolled steel sheet 1mm", category: "RAW_MATERIAL",  baseUomCode: "PCS" },
    { code: "RM-102", name: "Bolt M8 x 20mm",      description: "Hex bolt M8, zinc-plated",    category: "RAW_MATERIAL",  baseUomCode: "PCS" },
    { code: "RM-103", name: "Plastic Granule PP",  description: "Polypropylene pellets",       category: "RAW_MATERIAL",  baseUomCode: "PCS" },
    { code: "PKG-01", name: "Cardboard Box Small", description: "200x150x100mm corrugated",    category: "PACKAGING",     baseUomCode: "PCS" },
    { code: "PKG-02", name: "Shrink Wrap Roll",    description: "500mm x 300m LDPE",           category: "PACKAGING",     baseUomCode: "PCS" },
    { code: "WIP-01", name: "Sub-Assembly Frame",  description: "Pre-assembled steel frame",   category: "WIP",           baseUomCode: "PCS" },
    { code: "FG-101", name: "Widget A",            description: "Standard widget",             category: "FINISHED_GOOD", baseUomCode: "PCS" },
    { code: "FG-102", name: "Widget B",            description: "Premium widget",              category: "FINISHED_GOOD", baseUomCode: "PCS" },
  ],

  "uom-conversions": [
    { itemCode: "RM-101", fromUomCode: "PACK",   toUomCode: "PCS",  conversionFactor: 20 },
    { itemCode: "RM-101", fromUomCode: "BUNDLE", toUomCode: "PACK", conversionFactor: 10 },
    { itemCode: "RM-102", fromUomCode: "PACK",   toUomCode: "PCS",  conversionFactor: 50 },
    { itemCode: "RM-103", fromUomCode: "PACK",   toUomCode: "PCS",  conversionFactor: 100 },
    { itemCode: "PKG-01", fromUomCode: "PACK",   toUomCode: "PCS",  conversionFactor: 25 },
    { itemCode: "PKG-02", fromUomCode: "BUNDLE", toUomCode: "PCS",  conversionFactor: 12 },
  ],

  inventory: [
    { itemCode: "RM-101", locationCode: "WH-02-A1", batchLot: "LOT-2026-0101", quantity: 500,  uomCode: "PCS" },
    { itemCode: "RM-102", locationCode: "WH-02-A2", batchLot: "LOT-2026-0102", quantity: 2000, uomCode: "PCS" },
    { itemCode: "RM-103", locationCode: "WH-02-A2", batchLot: "LOT-2026-0103", quantity: 1500, uomCode: "PCS" },
    { itemCode: "PKG-01", locationCode: "WH-02-B1", batchLot: "LOT-2026-0201", quantity: 1000, uomCode: "PCS" },
    { itemCode: "PKG-02", locationCode: "WH-02-B1", batchLot: "LOT-2026-0202", quantity: 300,  uomCode: "PCS" },
    { itemCode: "WIP-01", locationCode: "WH-02-B2", batchLot: "LOT-2026-0301", quantity: 50,   uomCode: "PCS" },
  ],

  "production-orders": [
    // Order 1: scheduled DRAFT, make 100 Widget A from sub-assembly + bolts + box
    { orderNumber: "PO-20260415-001", description: "Widget A Production - Batch Apr-01", orderType: "FINISHED_GOOD", status: "DRAFT", plannedStartDate: "2026-04-15", plannedEndDate: "2026-04-18", lineType: "MATERIAL", itemCode: "WIP-01", quantity: 100, uomCode: "PCS", notes: "Priority order for Customer X" },
    { orderNumber: "PO-20260415-001", description: "Widget A Production - Batch Apr-01", orderType: "FINISHED_GOOD", status: "DRAFT", plannedStartDate: "2026-04-15", plannedEndDate: "2026-04-18", lineType: "MATERIAL", itemCode: "RM-102", quantity: 200, uomCode: "PCS" },
    { orderNumber: "PO-20260415-001", description: "Widget A Production - Batch Apr-01", orderType: "FINISHED_GOOD", status: "DRAFT", plannedStartDate: "2026-04-15", plannedEndDate: "2026-04-18", lineType: "MATERIAL", itemCode: "PKG-01", quantity: 100, uomCode: "PCS" },
    { orderNumber: "PO-20260415-001", description: "Widget A Production - Batch Apr-01", orderType: "FINISHED_GOOD", status: "DRAFT", plannedStartDate: "2026-04-15", plannedEndDate: "2026-04-18", lineType: "OUTPUT",   itemCode: "FG-101", quantity: 100, uomCode: "PCS" },

    // Order 2: IN_PROGRESS — make 50 sub-assemblies (WIP)
    { orderNumber: "PO-20260415-002", description: "Sub-Assembly Frame Run - 50 units", orderType: "WIP", status: "IN_PROGRESS", plannedStartDate: "2026-04-15", plannedEndDate: "2026-04-16", lineType: "MATERIAL", itemCode: "RM-101", quantity: 50,  uomCode: "PCS" },
    { orderNumber: "PO-20260415-002", description: "Sub-Assembly Frame Run - 50 units", orderType: "WIP", status: "IN_PROGRESS", plannedStartDate: "2026-04-15", plannedEndDate: "2026-04-16", lineType: "MATERIAL", itemCode: "RM-102", quantity: 200, uomCode: "PCS" },
    { orderNumber: "PO-20260415-002", description: "Sub-Assembly Frame Run - 50 units", orderType: "WIP", status: "IN_PROGRESS", plannedStartDate: "2026-04-15", plannedEndDate: "2026-04-16", lineType: "OUTPUT",   itemCode: "WIP-01", quantity: 50,  uomCode: "PCS" },

    // Order 3: auto-numbered (Order Number blank) — grouped by Description
    { orderNumber: "", description: "Widget B Molding - Batch Apr-02", orderType: "FINISHED_GOOD", status: "DRAFT", plannedStartDate: "2026-04-20", plannedEndDate: "2026-04-22", lineType: "MATERIAL", itemCode: "RM-103", quantity: 250, uomCode: "PCS" },
    { orderNumber: "", description: "Widget B Molding - Batch Apr-02", orderType: "FINISHED_GOOD", status: "DRAFT", plannedStartDate: "2026-04-20", plannedEndDate: "2026-04-22", lineType: "MATERIAL", itemCode: "PKG-02", quantity: 50,  uomCode: "PCS" },
    { orderNumber: "", description: "Widget B Molding - Batch Apr-02", orderType: "FINISHED_GOOD", status: "DRAFT", plannedStartDate: "2026-04-20", plannedEndDate: "2026-04-22", lineType: "OUTPUT",   itemCode: "FG-102", quantity: 50,  uomCode: "PCS" },
  ],

  bom: [
    // Sub-assembly (WIP): 1 steel sheet + 4 bolts -> 1 WIP frame
    { bomName: "Sub-Assembly Frame", orderType: "WIP",           lineType: "MATERIAL", itemCode: "RM-101", quantity: 1, uomCode: "PCS" },
    { bomName: "Sub-Assembly Frame", orderType: "WIP",           lineType: "MATERIAL", itemCode: "RM-102", quantity: 4, uomCode: "PCS" },
    { bomName: "Sub-Assembly Frame", orderType: "WIP",           lineType: "OUTPUT",   itemCode: "WIP-01", quantity: 1, uomCode: "PCS" },

    // Widget A (FG): 1 sub-assembly + 2 bolts + 1 box -> 1 Widget A
    { bomName: "Widget A Assembly",  orderType: "FINISHED_GOOD", lineType: "MATERIAL", itemCode: "WIP-01", quantity: 1, uomCode: "PCS" },
    { bomName: "Widget A Assembly",  orderType: "FINISHED_GOOD", lineType: "MATERIAL", itemCode: "RM-102", quantity: 2, uomCode: "PCS" },
    { bomName: "Widget A Assembly",  orderType: "FINISHED_GOOD", lineType: "MATERIAL", itemCode: "PKG-01", quantity: 1, uomCode: "PCS" },
    { bomName: "Widget A Assembly",  orderType: "FINISHED_GOOD", lineType: "OUTPUT",   itemCode: "FG-101", quantity: 1, uomCode: "PCS" },

    // Widget B (FG): plastic molding + shrink wrap -> 1 Widget B
    { bomName: "Widget B Molding",   orderType: "FINISHED_GOOD", lineType: "MATERIAL", itemCode: "RM-103", quantity: 5, uomCode: "PCS" },
    { bomName: "Widget B Molding",   orderType: "FINISHED_GOOD", lineType: "MATERIAL", itemCode: "PKG-02", quantity: 1, uomCode: "PCS" },
    { bomName: "Widget B Molding",   orderType: "FINISHED_GOOD", lineType: "OUTPUT",   itemCode: "FG-102", quantity: 1, uomCode: "PCS" },
  ],
};

function buildWorkbook(importType: ImportType, rows: Row[]): XLSX.WorkBook {
  const config = IMPORT_CONFIGS[importType];
  const headers = config.columns.map((c) => c.header);
  const dataMatrix: (string | number)[][] = [
    headers,
    ...rows.map((r) => config.columns.map((c) => (r[c.key] ?? "") as string | number)),
  ];

  const ws = XLSX.utils.aoa_to_sheet(dataMatrix);
  ws["!cols"] = config.columns.map((c) => ({
    wch: Math.max(c.header.length, 18) + 2,
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, config.sheetName);

  // Instructions sheet
  const instructions: (string | number)[][] = [
    ["Column", "Required", "Type", "Description", "Valid Values"],
    ...config.columns.map((c) => [
      c.header,
      c.required ? "Yes" : "No",
      c.type === "enum" ? "Enum" : c.type === "number" ? "Number" : "Text",
      c.description ?? "",
      c.enumValues?.join(", ") ?? "",
    ]),
  ];
  const wsInstr = XLSX.utils.aoa_to_sheet(instructions);
  wsInstr["!cols"] = [{ wch: 22 }, { wch: 10 }, { wch: 10 }, { wch: 55 }, { wch: 45 }];
  XLSX.utils.book_append_sheet(wb, wsInstr, "Instructions");

  return wb;
}

function main() {
  const outDir = path.join(process.cwd(), "samples", "imports");
  fs.mkdirSync(outDir, { recursive: true });

  const order: ImportType[] = ["warehouses", "items", "uom-conversions", "inventory", "bom", "production-orders"];
  for (let i = 0; i < order.length; i++) {
    const type = order[i];
    const wb = buildWorkbook(type, SAMPLES[type]);
    const file = path.join(outDir, `${String(i + 1).padStart(2, "0")}-${type}.xlsx`);
    XLSX.writeFile(wb, file);
    console.log(`Wrote ${file}  (${SAMPLES[type].length} rows)`);
  }
}

main();
