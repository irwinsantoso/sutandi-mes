import { format } from "date-fns"
import { prisma } from "./prisma"

export async function generateTransactionNumber(
  prefix: "IN" | "OUT" | "PO"
): Promise<string> {
  const today = format(new Date(), "yyyyMMdd")
  const pattern = `${prefix}-${today}-%`

  let latest: string | null = null

  if (prefix === "IN") {
    const result = await prisma.inboundTransaction.findFirst({
      where: { transactionNumber: { startsWith: `${prefix}-${today}-` } },
      orderBy: { transactionNumber: "desc" },
      select: { transactionNumber: true },
    })
    latest = result?.transactionNumber ?? null
  } else if (prefix === "OUT") {
    const result = await prisma.outboundTransaction.findFirst({
      where: { transactionNumber: { startsWith: `${prefix}-${today}-` } },
      orderBy: { transactionNumber: "desc" },
      select: { transactionNumber: true },
    })
    latest = result?.transactionNumber ?? null
  } else {
    const result = await prisma.productionOrder.findFirst({
      where: { orderNumber: { startsWith: `${prefix}-${today}-` } },
      orderBy: { orderNumber: "desc" },
      select: { orderNumber: true },
    })
    latest = result?.orderNumber ?? null
  }

  const seq = latest ? parseInt(latest.split("-")[2]) + 1 : 1
  return `${prefix}-${today}-${String(seq).padStart(3, "0")}`
}
