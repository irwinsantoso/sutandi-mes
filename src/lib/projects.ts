import { prisma } from "@/lib/prisma"

export async function getDistinctProjectNames(): Promise<string[]> {
  const [spls, prods] = await Promise.all([
    prisma.directWorkOrder.findMany({
      where: { projectName: { not: null } },
      select: { projectName: true },
      distinct: ["projectName"],
    }),
    prisma.productionOrder.findMany({
      where: { projectName: { not: null } },
      select: { projectName: true },
      distinct: ["projectName"],
    }),
  ])

  const set = new Set<string>()
  for (const r of spls) if (r.projectName) set.add(r.projectName)
  for (const r of prods) if (r.projectName) set.add(r.projectName)
  return Array.from(set).sort((a, b) => a.localeCompare(b))
}
