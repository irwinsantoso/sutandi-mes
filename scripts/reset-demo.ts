/**
 * Wipes all application data and re-runs the Prisma seed to produce a clean
 * demo dataset (users, warehouses, items, bundled raw material, inventory,
 * and partial production orders).
 *
 * Usage:  npx tsx scripts/reset-demo.ts
 *
 * DESTRUCTIVE: this truncates every application table. Do not run against a
 * production database.
 */

import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { spawnSync } from "child_process"
import * as path from "path"

const prisma = new PrismaClient()

// Order doesn't matter because TRUNCATE ... CASCADE handles FKs. Listed
// explicitly so it's clear what gets wiped.
const TABLES = [
  "stock_movements",
  "inventory_reservations",
  "inventory",
  "outbound_transaction_items",
  "outbound_transactions",
  "inbound_transaction_items",
  "inbound_transactions",
  "production_order_outputs",
  "production_order_materials",
  "production_orders",
  "uom_conversions",
  "items",
  "locations",
  "warehouses",
  "users",
  "uom",
]

async function truncateAll() {
  const list = TABLES.map((t) => `"${t}"`).join(", ")
  console.log(`Truncating: ${TABLES.join(", ")}`)
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`)
}

async function runSeed() {
  console.log("Running prisma seed...")
  const result = spawnSync("npx", ["tsx", path.join("prisma", "seed.ts")], {
    stdio: "inherit",
    shell: true,
    cwd: process.cwd(),
  })
  if (result.status !== 0) {
    throw new Error(`Seed exited with status ${result.status}`)
  }
}

async function main() {
  console.log("=== Demo reset ===")
  await truncateAll()
  await prisma.$disconnect()
  await runSeed()
  console.log("=== Done ===")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
