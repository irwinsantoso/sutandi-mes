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

  // Create admin user
  const passwordHash = await bcrypt.hash("admin123", 10)
  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      name: "Administrator",
      passwordHash,
      role: "ADMIN",
    },
  })

  console.log("Created admin user:", admin.username)

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
      category: "RAW_MATERIAL",
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
      category: "FINISHED_GOOD",
      baseUomId: pcs.id,
    },
  })

  console.log("Created items:", rm001.code, fg001.code)
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
