import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { ImportClient } from "./_components/import-client";

export default async function ImportPage() {
  const uoms = await prisma.uom.findMany({
    select: { code: true, name: true },
    orderBy: { code: "asc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import Data"
        description="Import data from Excel files into the system."
      />
      <ImportClient uoms={uoms} />
    </div>
  );
}
