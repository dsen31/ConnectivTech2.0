import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { LeadImportWizard } from "@/components/leads/LeadImportWizard";

export default function ImportPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link
          href="/leads"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to leads
        </Link>
        <h1 className="text-2xl font-semibold">Import Leads</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload a CSV file to add contacts to your lead list. Max 500 rows per import.
        </p>
      </div>
      <LeadImportWizard />
    </div>
  );
}
