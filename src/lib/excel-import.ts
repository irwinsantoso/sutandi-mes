import * as XLSX from "xlsx";

// ============================================================
// IMPORT TYPE DEFINITIONS
// ============================================================

export type ImportType =
  | "items"
  | "items-simple"
  | "warehouses"
  | "uom-conversions"
  | "inventory"
  | "bom"
  | "production-orders"
  | "kop-production-order";

export interface ImportTypeConfig {
  label: string;
  description: string;
  columns: ColumnConfig[];
  sheetName: string;
  /** If true, this import uses a dedicated parser (not the generic one). */
  customParser?: boolean;
}

export interface ColumnConfig {
  key: string;
  header: string;
  required: boolean;
  type: "string" | "number" | "enum";
  enumValues?: string[];
  description?: string;
  example?: string;
  /** Alternate header labels that also match this column (case-insensitive). */
  aliases?: string[];
}

export interface ParsedRow {
  rowIndex: number;
  data: Record<string, string | number | null>;
  errors: string[];
}

export interface ParseResult {
  rows: ParsedRow[];
  totalRows: number;
  validRows: number;
  errorRows: number;
}

// ============================================================
// IMPORT TYPE CONFIGURATIONS
// ============================================================

export const IMPORT_CONFIGS: Record<ImportType, ImportTypeConfig> = {
  items: {
    label: "Items",
    description:
      "Import master item data. UOM Code must match an existing Unit of Measure.",
    sheetName: "Items",
    columns: [
      {
        key: "code",
        header: "Code",
        required: true,
        type: "string",
        description: "Unique item code",
        example: "RM-001",
      },
      {
        key: "name",
        header: "Name",
        required: true,
        type: "string",
        description: "Item name",
        example: "Steel Sheet 1mm",
      },
      {
        key: "description",
        header: "Description",
        required: false,
        type: "string",
        description: "Item description",
        example: "1mm thick steel sheet",
      },
      {
        key: "category",
        header: "Category",
        required: true,
        type: "string",
        description:
          "Item category code (must match an existing category, e.g. RAW_MATERIAL). Manage categories under Master Data → Item Categories.",
        example: "RAW_MATERIAL",
      },
      {
        key: "baseUomCode",
        header: "Base UOM Code",
        required: true,
        type: "string",
        description: "Code of the base unit of measure (must exist)",
        example: "PCS",
      },
    ],
  },

  "items-simple": {
    label: "Items (Legacy 3-column)",
    description:
      "Import items from the legacy format (No. Barang / Deskripsi Barang / Nama Kategori Barang). Missing categories are auto-created. Base UOM is picked once at upload time.",
    sheetName: "Sheet1",
    columns: [
      {
        key: "code",
        header: "Code",
        aliases: ["No. Barang", "Kode Barang"],
        required: true,
        type: "string",
        description: "Unique item code",
        example: "1-1-000-01-151-57-0060",
      },
      {
        key: "name",
        header: "Name",
        aliases: ["Deskripsi Barang", "Nama Barang"],
        required: true,
        type: "string",
        description: "Item name / description",
        example: "YKK API 9k 86903 TK10 6000",
      },
      {
        key: "category",
        header: "Category",
        aliases: ["Nama Kategori Barang", "Kategori"],
        required: true,
        type: "string",
        description: "Category name. Auto-created if it does not exist.",
        example: "ALUMINIUM",
      },
    ],
  },

  warehouses: {
    label: "Warehouses & Locations",
    description:
      "Import warehouses and their locations. Rows with the same Warehouse Code are grouped. Location columns are optional for warehouse-only rows.",
    sheetName: "Warehouses",
    columns: [
      {
        key: "warehouseCode",
        header: "Warehouse Code",
        required: true,
        type: "string",
        description: "Unique warehouse code",
        example: "WH-01",
      },
      {
        key: "warehouseName",
        header: "Warehouse Name",
        required: true,
        type: "string",
        description: "Warehouse name",
        example: "Main Warehouse",
      },
      {
        key: "warehouseAddress",
        header: "Warehouse Address",
        required: false,
        type: "string",
        description: "Warehouse address",
        example: "123 Industrial Rd",
      },
      {
        key: "locationCode",
        header: "Location Code",
        required: false,
        type: "string",
        description: "Unique location code within warehouse",
        example: "WH-01-A1",
      },
      {
        key: "locationName",
        header: "Location Name",
        required: false,
        type: "string",
        description: "Location name",
        example: "Rack A Row 1",
      },
      {
        key: "zone",
        header: "Zone",
        required: false,
        type: "string",
        description: "Location zone",
        example: "Zone A",
      },
    ],
  },

  "uom-conversions": {
    label: "UOM Conversions",
    description:
      "Import unit of measure conversions for items. All codes must match existing records.",
    sheetName: "UOM Conversions",
    columns: [
      {
        key: "itemCode",
        header: "Item Code",
        required: true,
        type: "string",
        description: "Item code (must exist)",
        example: "RM-001",
      },
      {
        key: "fromUomCode",
        header: "From UOM Code",
        required: true,
        type: "string",
        description: "Source UOM code (must exist)",
        example: "BOX",
      },
      {
        key: "toUomCode",
        header: "To UOM Code",
        required: true,
        type: "string",
        description: "Target UOM code (must exist)",
        example: "PCS",
      },
      {
        key: "conversionFactor",
        header: "Conversion Factor",
        required: true,
        type: "number",
        description: "Multiply from-UOM by this to get to-UOM quantity",
        example: "12",
      },
    ],
  },

  inventory: {
    label: "Inventory (Stock Adjustment)",
    description:
      "Import inventory adjustments. Sets the absolute quantity at the specified location. All codes must match existing records.",
    sheetName: "Inventory",
    columns: [
      {
        key: "itemCode",
        header: "Item Code",
        required: true,
        type: "string",
        description: "Item code (must exist)",
        example: "RM-001",
      },
      {
        key: "locationCode",
        header: "Location Code",
        required: true,
        type: "string",
        description: "Location code (must exist)",
        example: "WH-01-A1",
      },
      {
        key: "batchLot",
        header: "Batch / Lot",
        required: false,
        type: "string",
        description: "Batch or lot number",
        example: "LOT-2026-001",
      },
      {
        key: "quantity",
        header: "Quantity",
        required: true,
        type: "number",
        description: "Stock quantity",
        example: "100",
      },
      {
        key: "uomCode",
        header: "UOM Code",
        required: true,
        type: "string",
        description: "UOM code (must exist, should be item base UOM)",
        example: "PCS",
      },
    ],
  },

  "production-orders": {
    label: "Production Orders",
    description:
      "Import scheduled production orders. Rows with the same Order Number are grouped into one order (materials + outputs). Leave Order Number blank on all rows of a group to auto-generate one per unique Description.",
    sheetName: "Production Orders",
    columns: [
      {
        key: "orderNumber",
        header: "Order Number",
        required: false,
        type: "string",
        description: "Unique order number. Leave blank to auto-generate (grouped by Description).",
        example: "PO-20260413-001",
      },
      {
        key: "description",
        header: "Description",
        required: true,
        type: "string",
        description: "Order description. Also used as group key when Order Number is blank.",
        example: "Assemble Widget A - Batch 1",
      },
      {
        key: "orderType",
        header: "Order Type",
        required: true,
        type: "enum",
        enumValues: ["WIP", "FINISHED_GOOD"],
        description: "Production order type",
        example: "FINISHED_GOOD",
      },
      {
        key: "status",
        header: "Status",
        required: false,
        type: "enum",
        enumValues: ["DRAFT", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
        description: "Order status (defaults to DRAFT)",
        example: "DRAFT",
      },
      {
        key: "plannedStartDate",
        header: "Planned Start Date",
        required: false,
        type: "string",
        description: "Planned start (YYYY-MM-DD)",
        example: "2026-04-15",
      },
      {
        key: "plannedEndDate",
        header: "Planned End Date",
        required: false,
        type: "string",
        description: "Planned end (YYYY-MM-DD)",
        example: "2026-04-20",
      },
      {
        key: "lineType",
        header: "Line Type",
        required: true,
        type: "enum",
        enumValues: ["MATERIAL", "OUTPUT"],
        description: "Whether this line is a material (input) or output",
        example: "MATERIAL",
      },
      {
        key: "itemCode",
        header: "Item Code",
        required: true,
        type: "string",
        description: "Item code (must exist)",
        example: "RM-101",
      },
      {
        key: "quantity",
        header: "Quantity",
        required: true,
        type: "number",
        description: "Required (materials) or target (outputs) quantity",
        example: "10",
      },
      {
        key: "uomCode",
        header: "UOM Code",
        required: true,
        type: "string",
        description: "UOM code (must exist)",
        example: "PCS",
      },
      {
        key: "notes",
        header: "Notes",
        required: false,
        type: "string",
        description: "Optional notes for the production order (taken from the first row of each group)",
        example: "Priority batch for customer X",
      },
    ],
  },

  "kop-production-order": {
    label: "Production Order (KOP form)",
    description:
      "Import one production order from a KOP-format workbook (ASTERA-style). Reads the 'KOP' sheet: header block (rows 5-11), outputs under ITEM/UNIT, and materials under KEBUTUHAN MATERIAL + KEBUTUHAN AKSESORIS DAN PART. All item codes and UOM codes must already exist.",
    sheetName: "KOP",
    customParser: true,
    columns: [],
  },

  bom: {
    label: "Bill of Materials",
    description:
      "Import BOM definitions. Each BOM has a name and type, with materials (inputs) and outputs. Rows with the same BOM Name are grouped into one production order template.",
    sheetName: "BOM",
    columns: [
      {
        key: "bomName",
        header: "BOM Name",
        required: true,
        type: "string",
        description:
          "Groups rows into a single production order (same name = same order)",
        example: "Widget Assembly",
      },
      {
        key: "orderType",
        header: "Order Type",
        required: true,
        type: "enum",
        enumValues: ["WIP", "FINISHED_GOOD"],
        description: "Production order type",
        example: "FINISHED_GOOD",
      },
      {
        key: "lineType",
        header: "Line Type",
        required: true,
        type: "enum",
        enumValues: ["MATERIAL", "OUTPUT"],
        description: "Whether this line is a material (input) or output",
        example: "MATERIAL",
      },
      {
        key: "itemCode",
        header: "Item Code",
        required: true,
        type: "string",
        description: "Item code (must exist)",
        example: "RM-001",
      },
      {
        key: "quantity",
        header: "Quantity",
        required: true,
        type: "number",
        description: "Required quantity (materials) or target quantity (outputs)",
        example: "10",
      },
      {
        key: "uomCode",
        header: "UOM Code",
        required: true,
        type: "string",
        description: "UOM code (must exist)",
        example: "PCS",
      },
    ],
  },
};

// ============================================================
// TEMPLATE GENERATION
// ============================================================

export function generateTemplate(importType: ImportType): XLSX.WorkBook {
  const config = IMPORT_CONFIGS[importType];
  const wb = XLSX.utils.book_new();

  // Data sheet with headers
  const headers = config.columns.map((c) => c.header);
  const exampleRow = config.columns.map((c) => c.example ?? "");
  const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow]);

  // Set column widths
  ws["!cols"] = config.columns.map((c) => ({
    wch: Math.max(c.header.length, (c.example ?? "").length, 15) + 2,
  }));

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
  const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
  wsInstructions["!cols"] = [
    { wch: 20 },
    { wch: 10 },
    { wch: 10 },
    { wch: 50 },
    { wch: 40 },
  ];
  XLSX.utils.book_append_sheet(wb, wsInstructions, "Instructions");

  return wb;
}

export function templateToBuffer(importType: ImportType): Buffer {
  const wb = generateTemplate(importType);
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

// ============================================================
// PARSING & VALIDATION
// ============================================================

function matchesColumn(cell: string, col: ColumnConfig): boolean {
  const norm = cell.toLowerCase().replace(/\s+/g, " ").trim();
  if (norm === col.header.toLowerCase()) return true;
  for (const alias of col.aliases ?? []) {
    if (norm === alias.toLowerCase()) return true;
  }
  return false;
}

export function parseExcelFile(
  buffer: ArrayBuffer,
  importType: ImportType
): ParseResult {
  const config = IMPORT_CONFIGS[importType];
  const wb = XLSX.read(buffer, { type: "array" });

  // Try to find the sheet by name, otherwise use the first sheet
  const sheetName = wb.SheetNames.includes(config.sheetName)
    ? config.sheetName
    : wb.SheetNames[0];

  const ws = wb.Sheets[sheetName];
  if (!ws) {
    return { rows: [], totalRows: 0, validRows: 0, errorRows: 0 };
  }

  // Read as array of arrays (header row + data rows)
  const rawData: (string | number | null | undefined)[][] =
    XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  if (rawData.length < 2) {
    return { rows: [], totalRows: 0, validRows: 0, errorRows: 0 };
  }

  // Auto-detect the header row: scan the first 15 rows and pick the one that
  // matches the most required columns (by header label or alias).
  const requiredCols = config.columns.filter((c) => c.required);
  let headerRowIndex = 0;
  let bestScore = -1;
  const scanUntil = Math.min(15, rawData.length);
  for (let i = 0; i < scanUntil; i++) {
    const cells = (rawData[i] ?? []).map((h) =>
      h != null ? String(h).trim() : ""
    );
    let score = 0;
    for (const col of requiredCols) {
      if (cells.some((c) => c && matchesColumn(c, col))) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      headerRowIndex = i;
      if (score === requiredCols.length) break;
    }
  }

  const headerRow = (rawData[headerRowIndex] ?? []).map((h) =>
    h != null ? String(h).trim() : ""
  );
  const columnMap = new Map<string, number>();
  for (const col of config.columns) {
    const idx = headerRow.findIndex((h) => h && matchesColumn(h, col));
    if (idx !== -1) {
      columnMap.set(col.key, idx);
    }
  }

  const rows: ParsedRow[] = [];

  for (let i = headerRowIndex + 1; i < rawData.length; i++) {
    const raw = rawData[i];
    // Skip completely empty rows
    if (!raw || raw.every((cell) => cell == null || String(cell).trim() === "")) {
      continue;
    }

    const data: Record<string, string | number | null> = {};
    const errors: string[] = [];

    for (const col of config.columns) {
      const idx = columnMap.get(col.key);
      let value: string | number | null = null;

      if (idx !== undefined && idx < raw.length) {
        const rawValue = raw[idx];
        if (rawValue != null && String(rawValue).trim() !== "") {
          value = col.type === "number" ? Number(rawValue) : String(rawValue).trim();
        }
      }

      // Missing column header check
      if (idx === undefined && col.required) {
        errors.push(`Column "${col.header}" not found in the spreadsheet.`);
        data[col.key] = null;
        continue;
      }

      // Required field check
      if (col.required && (value === null || value === "")) {
        errors.push(`"${col.header}" is required.`);
      }

      // Type validation
      if (value !== null && value !== "") {
        if (col.type === "number") {
          if (typeof value === "number" && isNaN(value)) {
            errors.push(`"${col.header}" must be a valid number.`);
            value = null;
          }
        }

        if (
          col.type === "enum" &&
          col.enumValues &&
          typeof value === "string"
        ) {
          const upper = value.toUpperCase();
          if (!col.enumValues.includes(upper)) {
            errors.push(
              `"${col.header}" must be one of: ${col.enumValues.join(", ")}. Got "${value}".`
            );
          } else {
            value = upper;
          }
        }
      }

      data[col.key] = value;
    }

    rows.push({ rowIndex: i + 1, data, errors }); // rowIndex is 1-based Excel row (header=1, first data=2)
  }

  const validRows = rows.filter((r) => r.errors.length === 0).length;
  return {
    rows,
    totalRows: rows.length,
    validRows,
    errorRows: rows.length - validRows,
  };
}
