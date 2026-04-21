import { format } from "date-fns"
import { prisma } from "./prisma"

export async function generateTransactionNumber(
  prefix: "IN" | "OUT" | "PO" | "SKM" | "SPL"
): Promise<string> {
  const today = format(new Date(), "yyyyMMdd")

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
  } else if (prefix === "PO") {
    const result = await prisma.productionOrder.findFirst({
      where: { orderNumber: { startsWith: `${prefix}-${today}-` } },
      orderBy: { orderNumber: "desc" },
      select: { orderNumber: true },
    })
    latest = result?.orderNumber ?? null
  } else if (prefix === "SPL") {
    const result = await prisma.directWorkOrder.findFirst({
      where: { orderNumber: { startsWith: `${prefix}-${today}-` } },
      orderBy: { orderNumber: "desc" },
      select: { orderNumber: true },
    })
    latest = result?.orderNumber ?? null
  } else {
    const result = await prisma.materialRequest.findFirst({
      where: { requestNumber: { startsWith: `${prefix}-${today}-` } },
      orderBy: { requestNumber: "desc" },
      select: { requestNumber: true },
    })
    latest = result?.requestNumber ?? null
  }

  const seq = latest ? parseInt(latest.split("-")[2]) + 1 : 1
  return `${prefix}-${today}-${String(seq).padStart(3, "0")}`
}
