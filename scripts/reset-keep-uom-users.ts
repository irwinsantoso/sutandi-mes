/**
 * Wipes all application data EXCEPT the `uom` and `users` tables.
 *
 * Useful for clearing operational data on prod (items, transactions,
 * inventory, production orders, etc.) while preserving login accounts
 * and the base unit-of-measure definitions.
 *
 * Usage:  npx tsx scripts/reset-keep-uom-users.ts
 *
 * DESTRUCTIVE: this truncates every listed table. There is no undo.
 */

import "dotenv/config"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// Every @@map table from prisma/schema.prisma EXCEPT `uom` and `users`.
// TRUNCATE ... CASCADE handles FK order, but explicit listing keeps it
// obvious what gets wiped.
const TABLES = [
  "stock_movements",
  "inventory_reservations",
  "inventory",
  "direct_work_order_materials",
  "direct_work_orders",
  "outbound_transaction_items",
  "outbound_transactions",
  "inbound_transaction_items",
  "inbound_transactions",
  "material_request_items",
  "material_requests",
  "production_order_outputs",
  "production_order_materials",
  "production_orders",
  "uom_conversions",
  "items",
  "item_categories",
  "locations",
  "warehouses",
]

async function main() {
  const list = TABLES.map((t) => `"${t}"`).join(", ")
  console.log(`Truncating (keeping uom + users): ${TABLES.join(", ")}`)
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`)
  console.log("Done.")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
