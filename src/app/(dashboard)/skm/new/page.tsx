import { PageHeader } from "@/components/shared/page-header"
import { SkmForm } from "../_components/skm-form"

export default function NewSkmPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="New Material Request"
        description="Create a new Surat Kebutuhan Material"
      />
      <SkmForm />
    </div>
  )
}
