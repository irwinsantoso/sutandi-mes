import * as XLSX from "xlsx";

export interface KopHeader {
  orderNumber: string | null;
  description: string | null;
  plannedStartDate: string | null; // ISO date (YYYY-MM-DD)
  plannedStartDateRaw: string | null; // original text for display
  jenisWarna: string | null;
  typeVariant: string | null;
  tangga: string | null;
  departmentName: string | null;
}

export interface KopOutput {
  itemCode: string;
  warna: string | null;
  quantity: number;
  keterangan: string | null;
}

export interface KopMaterial {
  itemCode: string;
  quantity: number;
  uomCode: string; // "pcs" default for materials, taken from Satuan for accessories
  panjang: number | null; // for materials section only (mm)
  keterangan: string | null;
  section: "material" | "accessory";
}

export interface KopParseResult {
  header: KopHeader;
  outputs: KopOutput[];
  materials: KopMaterial[];
  errors: string[];
}

const ID_MONTHS: Record<string, string> = {
  JANUARI: "01",
  FEBRUARI: "02",
  MARET: "03",
  APRIL: "04",
  MEI: "05",
  JUNI: "06",
  JULI: "07",
  AGUSTUS: "08",
  SEPTEMBER: "09",
  OKTOBER: "10",
  NOVEMBER: "11",
  DESEMBER: "12",
};

function stripLeadingColon(value: string): string {
  return value.replace(/^\s*:\s*/, "").trim();
}

function normLabel(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").replace(/[:\s]+$/, "").trim();
}

function parseIndonesianDate(raw: string): string | null {
  const parts = raw.trim().split(/\s+/);
  if (parts.length !== 3) return null;
  const day = parts[0].padStart(2, "0");
  const monthKey = parts[1].toUpperCase();
  const month = ID_MONTHS[monthKey];
  const year = parts[2];
  if (!month || !/^\d{4}$/.test(year) || !/^\d{1,2}$/.test(parts[0])) return null;
  return `${year}-${month}-${day}`;
}

function toNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function cellString(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

function isRowEmpty(row: unknown[] | undefined): boolean {
  if (!row) return true;
  return row.every((c) => c == null || String(c).trim() === "");
}

export function parseKopFile(buffer: ArrayBuffer): KopParseResult {
  const wb = XLSX.read(buffer, { type: "array" });
  const errors: string[] = [];

  if (!wb.SheetNames.includes("KOP")) {
    return {
      header: emptyHeader(),
      outputs: [],
      materials: [],
      errors: [`Sheet "KOP" not found. Available sheets: ${wb.SheetNames.join(", ")}`],
    };
  }

  const ws = wb.Sheets["KOP"];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  const header = parseHeader(rows);

  const outputHeaderIdx = rows.findIndex(
    (r) => r && cellString(r[0]).toUpperCase() === "ITEM/UNIT"
  );
  const outputs: KopOutput[] = [];
  if (outputHeaderIdx === -1) {
    errors.push("Could not find the outputs section (ITEM/UNIT header row).");
  } else {
    for (let i = outputHeaderIdx + 1; i < rows.length; i++) {
      const r = rows[i];
      if (isRowEmpty(r)) break;
      const first = cellString(r[0]);
      if (first.toUpperCase() === "TOTAL") break;
      const qty = toNumber(r[2]);
      if (!first) continue;
      if (qty == null) {
        errors.push(`Row ${i + 1}: output "${first}" has invalid quantity.`);
        continue;
      }
      outputs.push({
        itemCode: first,
        warna: cellString(r[1]) || null,
        quantity: qty,
        keterangan: cellString(r[3]) || null,
      });
    }
  }

  const materials: KopMaterial[] = [];
  const materialHeaderIdx = findMarkerRow(rows, "KEBUTUHAN MATERIAL");
  const accessoryHeaderIdx = findMarkerRow(rows, "KEBUTUHAN AKSESORIS DAN PART");

  if (materialHeaderIdx !== -1) {
    const endIdx = accessoryHeaderIdx !== -1 ? accessoryHeaderIdx : rows.length;
    collectLines(rows, materialHeaderIdx + 2, endIdx, "material", materials, errors);
  } else {
    errors.push("Could not find KEBUTUHAN MATERIAL section marker.");
  }

  if (accessoryHeaderIdx !== -1) {
    collectLines(rows, accessoryHeaderIdx + 2, rows.length, "accessory", materials, errors);
  } else {
    errors.push("Could not find KEBUTUHAN AKSESORIS DAN PART section marker.");
  }

  if (!header.orderNumber) errors.push("Header field 'No. WO' is missing.");
  if (!header.description) errors.push("Header field 'Proyek' is missing.");

  return { header, outputs, materials, errors };
}

function emptyHeader(): KopHeader {
  return {
    orderNumber: null,
    description: null,
    plannedStartDate: null,
    plannedStartDateRaw: null,
    jenisWarna: null,
    typeVariant: null,
    tangga: null,
    departmentName: null,
  };
}

function parseHeader(rows: unknown[][]): KopHeader {
  const header = emptyHeader();
  const scan = Math.min(15, rows.length);
  for (let i = 0; i < scan; i++) {
    const r = rows[i];
    if (!r) continue;
    const label = normLabel(cellString(r[0]));
    const value = stripLeadingColon(cellString(r[1]));
    if (!label || !value) continue;
    switch (label) {
      case "tanggal wo":
        header.plannedStartDateRaw = value;
        header.plannedStartDate = parseIndonesianDate(value);
        break;
      case "no. wo":
      case "no wo":
      case "nomor wo":
        header.orderNumber = value;
        break;
      case "proyek":
        header.description = value;
        break;
      case "jenis/warna":
      case "jenis / warna":
        header.jenisWarna = value;
        break;
      case "type":
        header.typeVariant = value;
        break;
      case "tangga":
        header.tangga = value;
        break;
      case "nama departemen":
        header.departmentName = value;
        break;
    }
  }
  return header;
}

function findMarkerRow(rows: unknown[][], marker: string): number {
  const target = marker.toUpperCase();
  return rows.findIndex((r) => r && cellString(r[0]).toUpperCase().includes(target));
}

function collectLines(
  rows: unknown[][],
  startIdx: number,
  endIdx: number,
  section: "material" | "accessory",
  into: KopMaterial[],
  errors: string[]
): void {
  for (let i = startIdx; i < endIdx; i++) {
    const r = rows[i];
    if (isRowEmpty(r)) break;
    const code = cellString(r?.[0]);
    if (!code) continue;

    if (section === "material") {
      const panjang = toNumber(r?.[1]);
      const qty = toNumber(r?.[2]);
      if (qty == null) {
        errors.push(`Row ${i + 1}: material "${code}" has invalid quantity.`);
        continue;
      }
      into.push({
        itemCode: code,
        quantity: qty,
        uomCode: "pcs",
        panjang: panjang,
        keterangan: cellString(r?.[3]) || null,
        section: "material",
      });
    } else {
      const satuan = cellString(r?.[1]).toLowerCase();
      const qty = toNumber(r?.[2]);
      if (!satuan) {
        errors.push(`Row ${i + 1}: accessory "${code}" is missing Satuan (UOM).`);
        continue;
      }
      if (qty == null) {
        errors.push(`Row ${i + 1}: accessory "${code}" has invalid quantity.`);
        continue;
      }
      into.push({
        itemCode: code,
        quantity: qty,
        uomCode: satuan,
        panjang: null,
        keterangan: cellString(r?.[3]) || null,
        section: "accessory",
      });
    }
  }
}
