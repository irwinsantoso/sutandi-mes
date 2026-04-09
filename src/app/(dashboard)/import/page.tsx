import { PageHeader } from "@/components/shared/page-header";
import { ImportClient } from "./_components/import-client";

export default function ImportPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Import Data"
        description="Import data from Excel files into the system."
      />
      <ImportClient />
    </div>
  );
}
