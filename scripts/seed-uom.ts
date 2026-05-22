/**
 * Idempotently seeds the default UOMs (pcs, pack, bundle).
 *
 * Safe to run against production — uses upsert on the unique `code` column,
 * so existing rows are left untouched.
 *
 * Usage:  npx tsx scripts/seed-uom.ts
 */

import "dotenv/config"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const DEFAULT_UOMS = [
  { code: "pcs", name: "Piece" },
  { code: "pack", name: "Pack" },
  { code: "bundle", name: "Bundle" },
]

async function main() {
  for (const u of DEFAULT_UOMS) {
    const row = await prisma.uom.upsert({
      where: { code: u.code },
      update: {},
      create: u,
    })
    console.log("UOM ready:", row.code, "->", row.id)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
