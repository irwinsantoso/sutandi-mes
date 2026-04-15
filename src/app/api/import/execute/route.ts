import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { type ImportType, IMPORT_CONFIGS } from "@/lib/excel-import";
import type { KopParseResult } from "@/lib/kop-import";
import { estimateItemMatch, type MatchConfidence } from "@/lib/kop-matcher";
import { generateTransactionNumber } from "@/lib/transaction-number";

type RowData = Record<string, string | number | null>;

interface ImportRequest {
  importType: ImportType;
  rows?: Array<{ rowIndex: number; data: RowData }>;
  defaultBaseUomCode?: string;
  kop?: KopParseResult;
}

interface RowResult {
  rowIndex: number;
  success: boolean;
  error?: string;
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: ImportRequest = await request.json();
  const { importType, rows, defaultBaseUomCode, kop } = body;

  if (!importType || !IMPORT_CONFIGS[importType]) {
    return NextResponse.json(
      { error: "Invalid import type" },
      { status: 400 }
    );
  }

  if (importType === "kop-production-order") {
    if (!kop) {
      return NextResponse.json({ error: "Missing KOP payload" }, { status: 400 });
    }
  } else if (!rows || rows.length === 0) {
    return NextResponse.json({ error: "No data to import" }, { status: 400 });
  }

  try {
    let results: RowResult[];

    switch (importType) {
      case "items":
        results = await importItems(rows!);
        break;
      case "items-simple":
        if (!defaultBaseUomCode) {
          return NextResponse.json(
            { error: "defaultBaseUomCode is required for items-simple import" },
            { status: 400 }
          );
        }
        results = await importItemsSimple(rows!, defaultBaseUomCode);
        break;
      case "warehouses":
        results = await importWarehouses(rows!);
        break;
      case "uom-conversions":
        results = await importUomConversions(rows!);
        break;
      case "inventory":
        results = await importInventory(rows!, session.user.id);
        break;
      case "bom":
        results = await importBom(rows!, session.user.id);
        break;
      case "production-orders":
        results = await importProductionOrders(rows!, session.user.id);
        break;
      case "kop-production-order":
        return await importKopOrder(kop!, session.user.id);
      default:
        return NextResponse.json(
          { error: "Unsupported import type" },
          { status: 400 }
        );
    }

    const successCount = results.filter((r) => r.success).length;
    const errorCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      summary: {
        total: results.length,
        imported: successCount,
        errors: errorCount,
      },
      results,
    });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json(
      { error: "Import failed. Please try again." },
      { status: 500 }
    );
  }
}

// ============================================================
// ITEMS IMPORT
// ============================================================

async function importItems(
  rows: Array<{ rowIndex: number; data: RowData }>
): Promise<RowResult[]> {
  // Pre-fetch all UOMs for lookup
  const uoms = await prisma.uom.findMany();
  const uomByCode = new Map(uoms.map((u) => [u.code.toUpperCase(), u]));

  // Pre-fetch categories; import rows must reference one by code.
  const categories = await prisma.itemCategory.findMany();
  const categoryByCode = new Map(
    categories.map((c) => [c.code.toUpperCase(), c])
  );

  // Pre-fetch existing item codes
  const existingItems = await prisma.item.findMany({
    select: { code: true },
  });
  const existingCodes = new Set(existingItems.map((i) => i.code.toUpperCase()));

  const results: RowResult[] = [];

  for (const row of rows) {
    const { data } = row;
    const code = String(data.code ?? "").trim();
    const name = String(data.name ?? "").trim();
    const description = data.description ? String(data.description).trim() : null;
    const categoryCode = String(data.category ?? "").trim().toUpperCase();
    const baseUomCode = String(data.baseUomCode ?? "").trim().toUpperCase();

    if (!code || !name || !categoryCode || !baseUomCode) {
      results.push({ rowIndex: row.rowIndex, success: false, error: "Missing required fields." });
      continue;
    }

    if (existingCodes.has(code.toUpperCase())) {
      results.push({ rowIndex: row.rowIndex, success: false, error: `Item code "${code}" already exists.` });
      continue;
    }

    const category = categoryByCode.get(categoryCode);
    if (!category) {
      results.push({
        rowIndex: row.rowIndex,
        success: false,
        error: `Category "${data.category}" not found. Add it under Master Data → Item Categories first.`,
      });
      continue;
    }

    const uom = uomByCode.get(baseUomCode);
    if (!uom) {
      results.push({ rowIndex: row.rowIndex, success: false, error: `UOM code "${data.baseUomCode}" not found.` });
      continue;
    }

    try {
      await prisma.item.create({
        data: {
          code,
          name,
          description,
          categoryId: category.id,
          baseUomId: uom.id,
        },
      });
      existingCodes.add(code.toUpperCase());
      results.push({ rowIndex: row.rowIndex, success: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      results.push({ rowIndex: row.rowIndex, success: false, error: msg });
    }
  }

  return results;
}

// ============================================================
// WAREHOUSES & LOCATIONS IMPORT
// ============================================================

async function importWarehouses(
  rows: Array<{ rowIndex: number; data: RowData }>
): Promise<RowResult[]> {
  const results: RowResult[] = [];

  // Pre-fetch existing warehouses and locations
  const existingWarehouses = await prisma.warehouse.findMany({
    include: { locations: true },
  });
  const warehouseByCode = new Map(
    existingWarehouses.map((w) => [w.code.toUpperCase(), w])
  );
  const existingLocationCodes = new Set(
    existingWarehouses.flatMap((w) =>
      w.locations.map((l) => l.code.toUpperCase())
    )
  );

  for (const row of rows) {
    const { data } = row;
    const whCode = String(data.warehouseCode ?? "").trim();
    const whName = String(data.warehouseName ?? "").trim();
    const whAddress = data.warehouseAddress ? String(data.warehouseAddress).trim() : null;
    const locCode = data.locationCode ? String(data.locationCode).trim() : null;
    const locName = data.locationName ? String(data.locationName).trim() : null;
    const zone = data.zone ? String(data.zone).trim() : null;

    if (!whCode || !whName) {
      results.push({ rowIndex: row.rowIndex, success: false, error: "Warehouse Code and Name are required." });
      continue;
    }

    try {
      // Upsert warehouse
      let warehouse = warehouseByCode.get(whCode.toUpperCase());
      if (!warehouse) {
        const created = await prisma.warehouse.create({
          data: { code: whCode, name: whName, address: whAddress },
          include: { locations: true },
        });
        warehouse = created;
        warehouseByCode.set(whCode.toUpperCase(), warehouse);
      }

      // Create location if provided
      if (locCode && locName) {
        if (existingLocationCodes.has(locCode.toUpperCase())) {
          results.push({ rowIndex: row.rowIndex, success: false, error: `Location code "${locCode}" already exists.` });
          continue;
        }

        await prisma.location.create({
          data: {
            code: locCode,
            name: locName,
            warehouseId: warehouse.id,
            zone,
          },
        });
        existingLocationCodes.add(locCode.toUpperCase());
      }

      results.push({ rowIndex: row.rowIndex, success: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      results.push({ rowIndex: row.rowIndex, success: false, error: msg });
    }
  }

  return results;
}

// ============================================================
// UOM CONVERSIONS IMPORT
// ============================================================

async function importUomConversions(
  rows: Array<{ rowIndex: number; data: RowData }>
): Promise<RowResult[]> {
  const items = await prisma.item.findMany({ select: { id: true, code: true } });
  const itemByCode = new Map(items.map((i) => [i.code.toUpperCase(), i]));

  const uoms = await prisma.uom.findMany();
  const uomByCode = new Map(uoms.map((u) => [u.code.toUpperCase(), u]));

  const results: RowResult[] = [];

  for (const row of rows) {
    const { data } = row;
    const itemCode = String(data.itemCode ?? "").trim().toUpperCase();
    const fromUomCode = String(data.fromUomCode ?? "").trim().toUpperCase();
    const toUomCode = String(data.toUomCode ?? "").trim().toUpperCase();
    const conversionFactor = Number(data.conversionFactor);

    const item = itemByCode.get(itemCode);
    if (!item) {
      results.push({ rowIndex: row.rowIndex, success: false, error: `Item "${data.itemCode}" not found.` });
      continue;
    }

    const fromUom = uomByCode.get(fromUomCode);
    if (!fromUom) {
      results.push({ rowIndex: row.rowIndex, success: false, error: `From UOM "${data.fromUomCode}" not found.` });
      continue;
    }

    const toUom = uomByCode.get(toUomCode);
    if (!toUom) {
      results.push({ rowIndex: row.rowIndex, success: false, error: `To UOM "${data.toUomCode}" not found.` });
      continue;
    }

    if (fromUom.id === toUom.id) {
      results.push({ rowIndex: row.rowIndex, success: false, error: "From UOM and To UOM must be different." });
      continue;
    }

    if (isNaN(conversionFactor) || conversionFactor <= 0) {
      results.push({ rowIndex: row.rowIndex, success: false, error: "Conversion factor must be a positive number." });
      continue;
    }

    try {
      await prisma.uomConversion.upsert({
        where: {
          itemId_fromUomId_toUomId: {
            itemId: item.id,
            fromUomId: fromUom.id,
            toUomId: toUom.id,
          },
        },
        update: { conversionFactor },
        create: {
          itemId: item.id,
          fromUomId: fromUom.id,
          toUomId: toUom.id,
          conversionFactor,
        },
      });
      results.push({ rowIndex: row.rowIndex, success: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      results.push({ rowIndex: row.rowIndex, success: false, error: msg });
    }
  }

  return results;
}

// ============================================================
// INVENTORY (STOCK ADJUSTMENT) IMPORT
// ============================================================

async function importInventory(
  rows: Array<{ rowIndex: number; data: RowData }>,
  userId: string
): Promise<RowResult[]> {
  const items = await prisma.item.findMany({
    select: { id: true, code: true, baseUomId: true },
  });
  const itemByCode = new Map(items.map((i) => [i.code.toUpperCase(), i]));

  const locations = await prisma.location.findMany({
    select: { id: true, code: true },
  });
  const locationByCode = new Map(
    locations.map((l) => [l.code.toUpperCase(), l])
  );

  const uoms = await prisma.uom.findMany();
  const uomByCode = new Map(uoms.map((u) => [u.code.toUpperCase(), u]));

  const results: RowResult[] = [];

  for (const row of rows) {
    const { data } = row;
    const itemCode = String(data.itemCode ?? "").trim().toUpperCase();
    const locationCode = String(data.locationCode ?? "").trim().toUpperCase();
    const batchLot = data.batchLot ? String(data.batchLot).trim() : "";
    const quantity = Number(data.quantity);
    const uomCode = String(data.uomCode ?? "").trim().toUpperCase();

    const item = itemByCode.get(itemCode);
    if (!item) {
      results.push({ rowIndex: row.rowIndex, success: false, error: `Item "${data.itemCode}" not found.` });
      continue;
    }

    const location = locationByCode.get(locationCode);
    if (!location) {
      results.push({ rowIndex: row.rowIndex, success: false, error: `Location "${data.locationCode}" not found.` });
      continue;
    }

    const uom = uomByCode.get(uomCode);
    if (!uom) {
      results.push({ rowIndex: row.rowIndex, success: false, error: `UOM "${data.uomCode}" not found.` });
      continue;
    }

    if (isNaN(quantity) || quantity < 0) {
      results.push({ rowIndex: row.rowIndex, success: false, error: "Quantity must be a non-negative number." });
      continue;
    }

    try {
      await prisma.$transaction(async (tx) => {
        // Get existing inventory to calculate delta
        const existing = await tx.inventory.findUnique({
          where: {
            itemId_locationId_batchLot_uomId: {
              itemId: item.id,
              locationId: location.id,
              batchLot: batchLot,
              uomId: uom.id,
            },
          },
        });

        const oldQty = existing ? Number(existing.quantity) : 0;
        const delta = quantity - oldQty;

        // Upsert inventory
        await tx.inventory.upsert({
          where: {
            itemId_locationId_batchLot_uomId: {
              itemId: item.id,
              locationId: location.id,
              batchLot: batchLot,
              uomId: uom.id,
            },
          },
          update: { quantity },
          create: {
            itemId: item.id,
            locationId: location.id,
            batchLot: batchLot,
            uomId: uom.id,
            quantity,
            reservedQuantity: 0,
          },
        });

        // Create stock movement for audit trail if there's a change
        if (delta !== 0) {
          await tx.stockMovement.create({
            data: {
              movementType: "ADJUSTMENT",
              itemId: item.id,
              locationId: location.id,
              batchLot: batchLot || null,
              quantity: Math.abs(delta),
              uomId: uom.id,
              quantityInBaseUom: Math.abs(delta),
              referenceNumber: "EXCEL-IMPORT",
              notes: `Excel import adjustment: ${oldQty} → ${quantity}`,
            },
          });
        }
      });

      results.push({ rowIndex: row.rowIndex, success: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      results.push({ rowIndex: row.rowIndex, success: false, error: msg });
    }
  }

  return results;
}

// ============================================================
// BOM (PRODUCTION ORDER) IMPORT
// ============================================================

async function importBom(
  rows: Array<{ rowIndex: number; data: RowData }>,
  userId: string
): Promise<RowResult[]> {
  const items = await prisma.item.findMany({
    select: { id: true, code: true },
  });
  const itemByCode = new Map(items.map((i) => [i.code.toUpperCase(), i]));

  const uoms = await prisma.uom.findMany();
  const uomByCode = new Map(uoms.map((u) => [u.code.toUpperCase(), u]));

  // Group rows by BOM name
  const bomGroups = new Map<
    string,
    Array<{ rowIndex: number; data: RowData }>
  >();
  for (const row of rows) {
    const bomName = String(row.data.bomName ?? "").trim();
    if (!bomName) continue;
    if (!bomGroups.has(bomName)) {
      bomGroups.set(bomName, []);
    }
    bomGroups.get(bomName)!.push(row);
  }

  const results: RowResult[] = [];

  for (const [bomName, groupRows] of bomGroups) {
    // Determine order type from first row
    const orderType = String(groupRows[0].data.orderType ?? "")
      .trim()
      .toUpperCase();

    if (orderType !== "WIP" && orderType !== "FINISHED_GOOD") {
      for (const row of groupRows) {
        results.push({
          rowIndex: row.rowIndex,
          success: false,
          error: `Invalid order type "${orderType}".`,
        });
      }
      continue;
    }

    // Validate all rows in the group
    const materials: Array<{
      rowIndex: number;
      itemId: string;
      uomId: string;
      quantity: number;
    }> = [];
    const outputs: Array<{
      rowIndex: number;
      itemId: string;
      uomId: string;
      quantity: number;
    }> = [];
    let groupValid = true;

    for (const row of groupRows) {
      const lineType = String(row.data.lineType ?? "").trim().toUpperCase();
      const itemCode = String(row.data.itemCode ?? "").trim().toUpperCase();
      const uomCode = String(row.data.uomCode ?? "").trim().toUpperCase();
      const quantity = Number(row.data.quantity);

      const item = itemByCode.get(itemCode);
      if (!item) {
        results.push({ rowIndex: row.rowIndex, success: false, error: `Item "${row.data.itemCode}" not found.` });
        groupValid = false;
        continue;
      }

      const uom = uomByCode.get(uomCode);
      if (!uom) {
        results.push({ rowIndex: row.rowIndex, success: false, error: `UOM "${row.data.uomCode}" not found.` });
        groupValid = false;
        continue;
      }

      if (isNaN(quantity) || quantity <= 0) {
        results.push({ rowIndex: row.rowIndex, success: false, error: "Quantity must be a positive number." });
        groupValid = false;
        continue;
      }

      if (lineType === "MATERIAL") {
        materials.push({ rowIndex: row.rowIndex, itemId: item.id, uomId: uom.id, quantity });
      } else if (lineType === "OUTPUT") {
        outputs.push({ rowIndex: row.rowIndex, itemId: item.id, uomId: uom.id, quantity });
      } else {
        results.push({ rowIndex: row.rowIndex, success: false, error: `Invalid line type "${lineType}".` });
        groupValid = false;
      }
    }

    if (!groupValid) continue;

    if (materials.length === 0) {
      for (const row of groupRows) {
        results.push({ rowIndex: row.rowIndex, success: false, error: "BOM must have at least one MATERIAL line." });
      }
      continue;
    }

    if (outputs.length === 0) {
      for (const row of groupRows) {
        results.push({ rowIndex: row.rowIndex, success: false, error: "BOM must have at least one OUTPUT line." });
      }
      continue;
    }

    try {
      const orderNumber = await generateTransactionNumber("PO");

      await prisma.$transaction(async (tx) => {
        const po = await tx.productionOrder.create({
          data: {
            orderNumber,
            type: orderType as "WIP" | "FINISHED_GOOD",
            description: `Imported BOM: ${bomName}`,
            status: "DRAFT",
            createdById: userId,
            materials: {
              create: materials.map((m) => ({
                itemId: m.itemId,
                uomId: m.uomId,
                requiredQuantity: m.quantity,
                consumedQuantity: 0,
              })),
            },
            outputs: {
              create: outputs.map((o) => ({
                itemId: o.itemId,
                uomId: o.uomId,
                targetQuantity: o.quantity,
                producedQuantity: 0,
              })),
            },
          },
        });

        return po;
      });

      // Mark all rows in the group as successful
      for (const m of materials) {
        results.push({ rowIndex: m.rowIndex, success: true });
      }
      for (const o of outputs) {
        results.push({ rowIndex: o.rowIndex, success: true });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      for (const row of groupRows) {
        results.push({ rowIndex: row.rowIndex, success: false, error: msg });
      }
    }
  }

  return results;
}

// ============================================================
// PRODUCTION ORDERS IMPORT
// ============================================================

// Excel may hand us either a string "2026-04-15" or a serial number. Accept both.
function parseDate(value: string | number | null): Date | null {
  if (value === null || value === "") return null;
  if (typeof value === "number") {
    // Excel serial date: days since 1899-12-30 (handles the 1900 leap-year bug).
    const ms = Math.round((value - 25569) * 86400 * 1000);
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(String(value));
  return isNaN(d.getTime()) ? null : d;
}

async function importProductionOrders(
  rows: Array<{ rowIndex: number; data: RowData }>,
  userId: string
): Promise<RowResult[]> {
  const items = await prisma.item.findMany({ select: { id: true, code: true } });
  const itemByCode = new Map(items.map((i) => [i.code.toUpperCase(), i]));

  const uoms = await prisma.uom.findMany();
  const uomByCode = new Map(uoms.map((u) => [u.code.toUpperCase(), u]));

  const existingOrders = await prisma.productionOrder.findMany({
    select: { orderNumber: true },
  });
  const existingOrderNumbers = new Set(
    existingOrders.map((o) => o.orderNumber.toUpperCase())
  );

  // Group rows: by Order Number if provided, else by Description.
  const groups = new Map<string, Array<{ rowIndex: number; data: RowData }>>();
  for (const row of rows) {
    const orderNumber = String(row.data.orderNumber ?? "").trim();
    const description = String(row.data.description ?? "").trim();
    const key = orderNumber || `__desc__${description}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }

  const results: RowResult[] = [];

  for (const [, groupRows] of groups) {
    const head = groupRows[0].data;
    const providedOrderNumber = String(head.orderNumber ?? "").trim();
    const description = String(head.description ?? "").trim();
    const orderType = String(head.orderType ?? "").trim().toUpperCase();
    const status = String(head.status ?? "DRAFT").trim().toUpperCase() || "DRAFT";
    const notes = head.notes ? String(head.notes).trim() : null;
    const plannedStart = parseDate(head.plannedStartDate);
    const plannedEnd = parseDate(head.plannedEndDate);

    if (!description) {
      for (const r of groupRows)
        results.push({ rowIndex: r.rowIndex, success: false, error: "Description is required." });
      continue;
    }
    if (orderType !== "WIP" && orderType !== "FINISHED_GOOD") {
      for (const r of groupRows)
        results.push({ rowIndex: r.rowIndex, success: false, error: `Invalid Order Type "${orderType}".` });
      continue;
    }
    const validStatuses = ["DRAFT", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
    if (!validStatuses.includes(status)) {
      for (const r of groupRows)
        results.push({ rowIndex: r.rowIndex, success: false, error: `Invalid Status "${status}".` });
      continue;
    }
    if (providedOrderNumber && existingOrderNumbers.has(providedOrderNumber.toUpperCase())) {
      for (const r of groupRows)
        results.push({ rowIndex: r.rowIndex, success: false, error: `Order Number "${providedOrderNumber}" already exists.` });
      continue;
    }

    const materials: Array<{ rowIndex: number; itemId: string; uomId: string; quantity: number }> = [];
    const outputs: Array<{ rowIndex: number; itemId: string; uomId: string; quantity: number }> = [];
    let groupValid = true;

    for (const row of groupRows) {
      const lineType = String(row.data.lineType ?? "").trim().toUpperCase();
      const itemCode = String(row.data.itemCode ?? "").trim().toUpperCase();
      const uomCode = String(row.data.uomCode ?? "").trim().toUpperCase();
      const quantity = Number(row.data.quantity);

      const item = itemByCode.get(itemCode);
      if (!item) {
        results.push({ rowIndex: row.rowIndex, success: false, error: `Item "${row.data.itemCode}" not found.` });
        groupValid = false;
        continue;
      }
      const uom = uomByCode.get(uomCode);
      if (!uom) {
        results.push({ rowIndex: row.rowIndex, success: false, error: `UOM "${row.data.uomCode}" not found.` });
        groupValid = false;
        continue;
      }
      if (isNaN(quantity) || quantity <= 0) {
        results.push({ rowIndex: row.rowIndex, success: false, error: "Quantity must be a positive number." });
        groupValid = false;
        continue;
      }
      if (lineType === "MATERIAL") {
        materials.push({ rowIndex: row.rowIndex, itemId: item.id, uomId: uom.id, quantity });
      } else if (lineType === "OUTPUT") {
        outputs.push({ rowIndex: row.rowIndex, itemId: item.id, uomId: uom.id, quantity });
      } else {
        results.push({ rowIndex: row.rowIndex, success: false, error: `Invalid Line Type "${lineType}".` });
        groupValid = false;
      }
    }

    if (!groupValid) continue;
    if (materials.length === 0) {
      for (const r of groupRows)
        results.push({ rowIndex: r.rowIndex, success: false, error: "Production order needs at least one MATERIAL line." });
      continue;
    }
    if (outputs.length === 0) {
      for (const r of groupRows)
        results.push({ rowIndex: r.rowIndex, success: false, error: "Production order needs at least one OUTPUT line." });
      continue;
    }

    try {
      const orderNumber = providedOrderNumber || (await generateTransactionNumber("PO"));

      await prisma.productionOrder.create({
        data: {
          orderNumber,
          type: orderType as "WIP" | "FINISHED_GOOD",
          description,
          status: status as "DRAFT" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED",
          plannedStartDate: plannedStart,
          plannedEndDate: plannedEnd,
          notes,
          createdById: userId,
          materials: {
            create: materials.map((m) => ({
              itemId: m.itemId,
              uomId: m.uomId,
              requiredQuantity: m.quantity,
              consumedQuantity: 0,
            })),
          },
          outputs: {
            create: outputs.map((o) => ({
              itemId: o.itemId,
              uomId: o.uomId,
              targetQuantity: o.quantity,
              producedQuantity: 0,
            })),
          },
        },
      });
      existingOrderNumbers.add(orderNumber.toUpperCase());

      for (const m of materials) results.push({ rowIndex: m.rowIndex, success: true });
      for (const o of outputs) results.push({ rowIndex: o.rowIndex, success: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      for (const row of groupRows) {
        results.push({ rowIndex: row.rowIndex, success: false, error: msg });
      }
    }
  }

  return results;
}

// ============================================================
// ITEMS (SIMPLE / LEGACY 3-COLUMN) IMPORT
// ============================================================

async function importItemsSimple(
  rows: Array<{ rowIndex: number; data: RowData }>,
  defaultBaseUomCode: string
): Promise<RowResult[]> {
  const results: RowResult[] = [];

  const uom = await prisma.uom.findUnique({
    where: { code: defaultBaseUomCode },
  });
  if (!uom) {
    for (const row of rows) {
      results.push({
        rowIndex: row.rowIndex,
        success: false,
        error: `Default Base UOM "${defaultBaseUomCode}" not found.`,
      });
    }
    return results;
  }

  const categories = await prisma.itemCategory.findMany();
  const categoryByCode = new Map(
    categories.map((c) => [c.code.toUpperCase(), c])
  );

  const existingItems = await prisma.item.findMany({ select: { code: true } });
  const existingCodes = new Set(existingItems.map((i) => i.code.toUpperCase()));

  for (const row of rows) {
    const { data } = row;
    const code = String(data.code ?? "").trim();
    const name = String(data.name ?? "").trim();
    const rawCategory = String(data.category ?? "").trim();

    if (!code || !name || !rawCategory) {
      results.push({ rowIndex: row.rowIndex, success: false, error: "Missing required fields." });
      continue;
    }

    if (existingCodes.has(code.toUpperCase())) {
      results.push({ rowIndex: row.rowIndex, success: false, error: `Item code "${code}" already exists.` });
      continue;
    }

    const categoryCode = rawCategory.toUpperCase().replace(/\s+/g, "_");
    let category = categoryByCode.get(categoryCode);
    if (!category) {
      category = await prisma.itemCategory.create({
        data: { code: categoryCode, name: rawCategory },
      });
      categoryByCode.set(categoryCode, category);
    }

    try {
      await prisma.item.create({
        data: {
          code,
          name,
          categoryId: category.id,
          baseUomId: uom.id,
        },
      });
      existingCodes.add(code.toUpperCase());
      results.push({ rowIndex: row.rowIndex, success: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      results.push({ rowIndex: row.rowIndex, success: false, error: msg });
    }
  }

  return results;
}

// ============================================================
// KOP PRODUCTION ORDER IMPORT (one workbook = one production order)
// ============================================================

async function importKopOrder(kop: KopParseResult, userId: string) {
  if (kop.errors.length > 0) {
    return NextResponse.json(
      { error: `KOP parse errors: ${kop.errors.join("; ")}` },
      { status: 400 }
    );
  }
  if (!kop.header.orderNumber) {
    return NextResponse.json({ error: "KOP is missing No. WO (order number)." }, { status: 400 });
  }

  const sessionUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!sessionUser) {
    return NextResponse.json(
      {
        error:
          "Your session references a user that no longer exists (likely after a demo reset). Sign out and sign back in, then retry.",
      },
      { status: 401 }
    );
  }
  if (kop.outputs.length === 0) {
    return NextResponse.json({ error: "KOP has no outputs." }, { status: 400 });
  }

  const existing = await prisma.productionOrder.findUnique({
    where: { orderNumber: kop.header.orderNumber },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json(
      { error: `Production order "${kop.header.orderNumber}" already exists.` },
      { status: 409 }
    );
  }

  // Auto-upsert any missing UOMs the KOP references. Codes are small and
  // case-insensitive; default the display name to the code itself.
  const neededUomCodes = new Set<string>(["pcs"]);
  for (const m of kop.materials) neededUomCodes.add(m.uomCode.toLowerCase());

  const existingUoms = await prisma.uom.findMany({
    where: { code: { in: Array.from(neededUomCodes) } },
    select: { id: true, code: true },
  });
  const uomByCode = new Map(existingUoms.map((u) => [u.code.toLowerCase(), u]));
  for (const code of neededUomCodes) {
    if (!uomByCode.has(code)) {
      const created = await prisma.uom.create({
        data: { code, name: code.toUpperCase() },
      });
      uomByCode.set(code, created);
    }
  }
  const pcs = uomByCode.get("pcs")!;

  // Ensure UNMATCHED category exists for placeholder items.
  const unmatchedCategory = await prisma.itemCategory.upsert({
    where: { code: "UNMATCHED" },
    update: {},
    create: { code: "UNMATCHED", name: "Unmatched (Pending Review)" },
  });

  // Fuzzy-match KOP codes to existing items.
  const allItems = await prisma.item.findMany({
    select: { id: true, code: true, name: true },
  });

  type LineResolution = {
    kopCode: string;
    section: "output" | "material" | "accessory";
    itemId: string;
    matchedItemCode: string;
    confidence: MatchConfidence;
    created: boolean;
  };
  const resolutions: LineResolution[] = [];

  async function resolve(
    kopCode: string,
    section: "output" | "material" | "accessory"
  ): Promise<LineResolution> {
    const match = estimateItemMatch(kopCode, allItems);
    if (match.item) {
      return {
        kopCode,
        section,
        itemId: match.item.id,
        matchedItemCode: match.item.code,
        confidence: match.confidence,
        created: false,
      };
    }
    // No match: upsert a placeholder item using the KOP code as item.code so
    // the operator can identify and merge/rename it later.
    const placeholder = await prisma.item.upsert({
      where: { code: kopCode },
      update: {},
      create: {
        code: kopCode,
        name: `[KOP] ${kopCode}`,
        categoryId: unmatchedCategory.id,
        baseUomId: pcs.id,
      },
    });
    allItems.push({ id: placeholder.id, code: placeholder.code, name: placeholder.name });
    return {
      kopCode,
      section,
      itemId: placeholder.id,
      matchedItemCode: placeholder.code,
      confidence: "none",
      created: true,
    };
  }

  const outputResolutions: LineResolution[] = [];
  for (const o of kop.outputs) {
    const r = await resolve(o.itemCode, "output");
    outputResolutions.push(r);
    resolutions.push(r);
  }
  const materialResolutions: LineResolution[] = [];
  for (const m of kop.materials) {
    const section = m.section === "material" ? "material" : "accessory";
    const r = await resolve(m.itemCode, section);
    materialResolutions.push(r);
    resolutions.push(r);
  }

  const matchedCount = resolutions.filter((r) => !r.created).length;
  const placeholderCount = resolutions.filter((r) => r.created).length;
  const notes =
    `Imported from KOP ${kop.header.orderNumber}. ` +
    `${matchedCount} matched, ${placeholderCount} auto-created. ` +
    `Review each line before starting production.`;

  function lineNote(
    r: LineResolution,
    extra: string | null = null
  ): string {
    const tag = r.created
      ? `KOP ${r.kopCode} · auto-created placeholder`
      : `KOP ${r.kopCode} · matched [${r.confidence}] → ${r.matchedItemCode}`;
    return extra ? `${tag} · ${extra}` : tag;
  }

  try {
    const created = await prisma.productionOrder.create({
      data: {
        orderNumber: kop.header.orderNumber,
        description: kop.header.description,
        type: "FINISHED_GOOD",
        status: "DRAFT",
        plannedStartDate: kop.header.plannedStartDate
          ? new Date(kop.header.plannedStartDate)
          : null,
        jenisWarna: kop.header.jenisWarna,
        typeVariant: kop.header.typeVariant,
        tangga: kop.header.tangga,
        departmentName: kop.header.departmentName,
        notes,
        createdById: userId,
        outputs: {
          create: kop.outputs.map((o, i) => {
            const extras = [o.warna, o.keterangan].filter(Boolean).join(" · ");
            return {
              itemId: outputResolutions[i].itemId,
              uomId: pcs.id,
              targetQuantity: o.quantity,
              producedQuantity: 0,
              notes: lineNote(outputResolutions[i], extras || null),
            };
          }),
        },
        materials: {
          create: kop.materials.map((m, i) => {
            const extras = [
              m.panjang != null ? `PANJANG ${m.panjang}` : null,
              m.keterangan,
            ]
              .filter(Boolean)
              .join(" · ");
            return {
              itemId: materialResolutions[i].itemId,
              uomId: uomByCode.get(m.uomCode.toLowerCase())!.id,
              requiredQuantity: m.quantity,
              consumedQuantity: 0,
              notes: lineNote(materialResolutions[i], extras || null),
            };
          }),
        },
      },
    });

    return NextResponse.json({
      success: true,
      summary: {
        total: resolutions.length,
        imported: resolutions.length,
        errors: 0,
        matched: matchedCount,
        placeholders: placeholderCount,
      },
      results: resolutions.map((r) => ({
        kopCode: r.kopCode,
        section: r.section,
        matchedItemCode: r.matchedItemCode,
        confidence: r.confidence,
        created: r.created,
      })),
      productionOrderId: created.id,
      productionOrderNumber: created.orderNumber,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
