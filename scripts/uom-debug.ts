import { Prisma } from "@prisma/client"
import { convertQuantity, toBaseUom } from "../src/lib/uom-converter"
import { prisma } from "../src/lib/prisma"
;(async () => {
  const itemId = "cmnx8hd1e000eqemc6xil5pyb"
  const bundle = "cmnx8hcwb0002qemc3xym0pqh"
  const pcs = "cmnx8hcvp0000qemcwtgs7v6o"

  const r1 = await convertQuantity(itemId, bundle, pcs, new Prisma.Decimal(1))
  console.log("1 bundle =", r1.toString(), "pcs (expect 120)")

  const r2 = await convertQuantity(itemId, pcs, bundle, new Prisma.Decimal(240))
  console.log("240 pcs =", r2.toString(), "bundle (expect 2)")

  const r3 = await toBaseUom(itemId, bundle, new Prisma.Decimal(0.5))
  console.log("0.5 bundle in base =", r3.toString(), "pcs (expect 60)")

  await prisma.$disconnect()
})()
