import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  // Create default UOMs
  const pcs = await prisma.uom.upsert({
    where: { code: "pcs" },
    update: {},
    create: { code: "pcs", name: "Piece" },
  })

  const pack = await prisma.uom.upsert({
    where: { code: "pack" },
    update: {},
    create: { code: "pack", name: "Pack" },
  })

  const bundle = await prisma.uom.upsert({
    where: { code: "bundle" },
    update: {},
    create: { code: "bundle", name: "Bundle" },
  })

  console.log("Created UOMs:", { pcs: pcs.id, pack: pack.id, bundle: bundle.id })

  // Create default item categories. Keep the original enum codes so existing
  // seed data and imports that reference RAW_MATERIAL / WIP / etc. still work.
  const defaultCategories = [
    { code: "RAW_MATERIAL", name: "Raw Material" },
    { code: "WIP", name: "WIP" },
    { code: "FINISHED_GOOD", name: "Finished Good" },
    { code: "PACKAGING", name: "Packaging" },
    { code: "CONSUMABLE", name: "Consumable" },
  ]
  for (const cat of defaultCategories) {
    await prisma.itemCategory.upsert({
      where: { code: cat.code },
      update: {},
      create: cat,
    })
  }
  console.log("Created item categories:", defaultCategories.map((c) => c.code).join(", "))

  const rawMaterialCat = await prisma.itemCategory.findUniqueOrThrow({ where: { code: "RAW_MATERIAL" } })
  const finishedGoodCat = await prisma.itemCategory.findUniqueOrThrow({ where: { code: "FINISHED_GOOD" } })

  // Create default users, one per role.
  // Access rights are enforced in the app by `role` (see docs/flow-process-document.md):
  //   ADMIN      - full access, master data & user management
  //   SUPERVISOR - create & confirm transactions, view all reports
  //   OPERATOR   - create draft transactions, limited access
  const defaultUsers = [
    { username: "admin", name: "Administrator", password: "admin123", role: "ADMIN" as const },
    { username: "supervisor", name: "Supervisor", password: "supervisor123", role: "SUPERVISOR" as const },
    { username: "operator", name: "Operator", password: "operator123", role: "OPERATOR" as const },
  ]

  for (const u of defaultUsers) {
    const passwordHash = await bcrypt.hash(u.password, 10)
    const user = await prisma.user.upsert({
      where: { username: u.username },
      update: {},
      create: {
        username: u.username,
        name: u.name,
        passwordHash,
        role: u.role,
      },
    })
    console.log("Created user:", user.username, `(${user.role})`)
  }

  // Create sample warehouse with locations
  const warehouse = await prisma.warehouse.upsert({
    where: { code: "WH-01" },
    update: {},
    create: {
      code: "WH-01",
      name: "Main Warehouse",
      address: "Main Building",
    },
  })

  const locationCodes = ["WH-01-A1", "WH-01-A2", "WH-01-B1", "WH-01-B2"]
  for (const code of locationCodes) {
    await prisma.location.upsert({
      where: { code },
      update: {},
      create: {
        code,
        name: code,
        warehouseId: warehouse.id,
        zone: code.split("-")[2]?.[0] ?? "A",
      },
    })
  }

  console.log("Created warehouse:", warehouse.code, "with", locationCodes.length, "locations")

  // Create sample items with UOM conversions
  const rm001 = await prisma.item.upsert({
    where: { code: "RM-001" },
    update: {},
    create: {
      code: "RM-001",
      name: "Raw Material A",
      categoryId: rawMaterialCat.id,
      baseUomId: pcs.id,
    },
  })

  // 1 pack = 12 pcs
  await prisma.uomConversion.upsert({
    where: {
      itemId_fromUomId_toUomId: {
        itemId: rm001.id,
        fromUomId: pack.id,
        toUomId: pcs.id,
      },
    },
    update: {},
    create: {
      itemId: rm001.id,
      fromUomId: pack.id,
      toUomId: pcs.id,
      conversionFactor: 12,
    },
  })

  // 1 bundle = 10 packs
  await prisma.uomConversion.upsert({
    where: {
      itemId_fromUomId_toUomId: {
        itemId: rm001.id,
        fromUomId: bundle.id,
        toUomId: pack.id,
      },
    },
    update: {},
    create: {
      itemId: rm001.id,
      fromUomId: bundle.id,
      toUomId: pack.id,
      conversionFactor: 10,
    },
  })

  const fg001 = await prisma.item.upsert({
    where: { code: "FG-001" },
    update: {},
    create: {
      code: "FG-001",
      name: "Finished Product A",
      categoryId: finishedGoodCat.id,
      baseUomId: pcs.id,
    },
  })

  // Additional component for the bundle
  const rm002 = await prisma.item.upsert({
    where: { code: "RM-002" },
    update: {},
    create: {
      code: "RM-002",
      name: "Raw Material B",
      categoryId: rawMaterialCat.id,
      baseUomId: pcs.id,
    },
  })

  // Bundled raw material: received and stored in "bundle" UOM.
  // 1 bundle = 10 packs = 120 pcs. Production consumes partial bundles
  // (i.e. breaks a bundle open and uses some pcs, leaving the rest).
  const rm003 = await prisma.item.upsert({
    where: { code: "RM-003" },
    update: {},
    create: {
      code: "RM-003",
      name: "Raw Material C (Bundled)",
      description: "Raw material delivered in bundles of 10 packs (120 pcs).",
      categoryId: rawMaterialCat.id,
      baseUomId: pcs.id,
    },
  })

  // 1 pack = 12 pcs
  await prisma.uomConversion.upsert({
    where: {
      itemId_fromUomId_toUomId: { itemId: rm003.id, fromUomId: pack.id, toUomId: pcs.id },
    },
    update: {},
    create: { itemId: rm003.id, fromUomId: pack.id, toUomId: pcs.id, conversionFactor: 12 },
  })
  // 1 bundle = 10 packs
  await prisma.uomConversion.upsert({
    where: {
      itemId_fromUomId_toUomId: { itemId: rm003.id, fromUomId: bundle.id, toUomId: pack.id },
    },
    update: {},
    create: { itemId: rm003.id, fromUomId: bundle.id, toUomId: pack.id, conversionFactor: 10 },
  })

  // Bundled / kitted finished good. Assembled from RM-001 + RM-002 + FG-001
  // via a production order (see orders below).
  const bundle001 = await prisma.item.upsert({
    where: { code: "BUNDLE-001" },
    update: {},
    create: {
      code: "BUNDLE-001",
      name: "Starter Kit Bundle",
      description: "Kit containing 2x RM-001, 1x RM-002, and 1x FG-001",
      categoryId: finishedGoodCat.id,
      baseUomId: pcs.id,
    },
  })

  console.log("Created items:", rm001.code, rm002.code, fg001.code, bundle001.code)

  // ========== Seed inventory so production orders can consume materials ==========
  const loc = await prisma.location.findUniqueOrThrow({ where: { code: "WH-01-A1" } })

  const inventorySeed = [
    { itemId: rm001.id, quantity: 500, uomId: pcs.id },
    { itemId: rm002.id, quantity: 300, uomId: pcs.id },
    { itemId: fg001.id, quantity: 100, uomId: pcs.id },
    // RM-003 stocked in bundles (5 bundles = 50 packs = 600 pcs on hand)
    { itemId: rm003.id, quantity: 5, uomId: bundle.id },
  ]
  for (const row of inventorySeed) {
    await prisma.inventory.upsert({
      where: {
        itemId_locationId_batchLot_uomId: {
          itemId: row.itemId,
          locationId: loc.id,
          batchLot: "",
          uomId: row.uomId,
        },
      },
      update: {},
      create: {
        itemId: row.itemId,
        locationId: loc.id,
        uomId: row.uomId,
        quantity: row.quantity,
      },
    })
  }

  // ========== Partial (IN_PROGRESS) production orders for BUNDLE-001 ==========
  const admin = await prisma.user.findUniqueOrThrow({ where: { username: "admin" } })

  // Partial order #1: target 50 bundles, ~40% produced.
  // Per-bundle BOM: 2 RM-001, 1 RM-002, 1 FG-001  =>  needs 100 / 50 / 50.
  const po1 = await prisma.productionOrder.upsert({
    where: { orderNumber: "PO-BUNDLE-001" },
    update: {},
    create: {
      orderNumber: "PO-BUNDLE-001",
      type: "FINISHED_GOOD",
      description: "Assemble Starter Kit Bundle - batch 1",
      status: "IN_PROGRESS",
      plannedStartDate: new Date("2026-04-10"),
      plannedEndDate: new Date("2026-04-15"),
      actualStartDate: new Date("2026-04-11"),
      notes: "Partial: 20 of 50 produced",
      createdById: admin.id,
      materials: {
        create: [
          { itemId: rm001.id, uomId: pcs.id, requiredQuantity: 100, consumedQuantity: 40 },
          { itemId: rm002.id, uomId: pcs.id, requiredQuantity: 50, consumedQuantity: 20 },
          { itemId: fg001.id, uomId: pcs.id, requiredQuantity: 50, consumedQuantity: 20 },
        ],
      },
      outputs: {
        create: [
          { itemId: bundle001.id, uomId: pcs.id, targetQuantity: 50, producedQuantity: 20 },
        ],
      },
    },
  })

  // Partial order #2: target 30 bundles, ~80% produced (near completion).
  const po2 = await prisma.productionOrder.upsert({
    where: { orderNumber: "PO-BUNDLE-002" },
    update: {},
    create: {
      orderNumber: "PO-BUNDLE-002",
      type: "FINISHED_GOOD",
      description: "Assemble Starter Kit Bundle - batch 2",
      status: "IN_PROGRESS",
      plannedStartDate: new Date("2026-04-12"),
      plannedEndDate: new Date("2026-04-14"),
      actualStartDate: new Date("2026-04-12"),
      notes: "Partial: 24 of 30 produced",
      createdById: admin.id,
      materials: {
        create: [
          { itemId: rm001.id, uomId: pcs.id, requiredQuantity: 60, consumedQuantity: 48 },
          { itemId: rm002.id, uomId: pcs.id, requiredQuantity: 30, consumedQuantity: 24 },
          { itemId: fg001.id, uomId: pcs.id, requiredQuantity: 30, consumedQuantity: 24 },
        ],
      },
      outputs: {
        create: [
          { itemId: bundle001.id, uomId: pcs.id, targetQuantity: 30, producedQuantity: 24 },
        ],
      },
    },
  })

  // Partial order #3: consumes a bundled raw material (RM-003) partially.
  // Required 2 bundles (= 20 packs = 240 pcs). So far 1 bundle has been
  // opened and 6 packs consumed -> 0.6 bundles consumed out of 2.
  const po3 = await prisma.productionOrder.upsert({
    where: { orderNumber: "PO-BUNDLE-003" },
    update: {},
    create: {
      orderNumber: "PO-BUNDLE-003",
      type: "WIP",
      description: "Break bundled RM-003 and build sub-assembly",
      status: "IN_PROGRESS",
      plannedStartDate: new Date("2026-04-13"),
      plannedEndDate: new Date("2026-04-16"),
      actualStartDate: new Date("2026-04-13"),
      notes: "Partial: 0.6 of 2 bundles consumed (one bundle opened, 6 of 10 packs used)",
      createdById: admin.id,
      materials: {
        create: [
          {
            itemId: rm003.id,
            uomId: bundle.id,
            requiredQuantity: 2,
            consumedQuantity: "0.6",
          },
        ],
      },
      outputs: {
        create: [
          { itemId: fg001.id, uomId: pcs.id, targetQuantity: 100, producedQuantity: 30 },
        ],
      },
    },
  })

  console.log("Created partial production orders:", po1.orderNumber, po2.orderNumber, po3.orderNumber)
  console.log("Seed completed!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
