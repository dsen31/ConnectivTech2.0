import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getLead, getLeadEnrollments } from "@/app/actions/leads";
import { getTags } from "@/app/actions/tags";
import { createClient } from "@/lib/supabase/server";
import { LeadEditForm } from "@/components/leads/LeadEditForm";
import { STATUS_STYLES } from "@/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LeadDetailPage({ params }: PageProps) {
  const { id } = await params;

  const [lead, allTags, enrollments] = await Promise.all([
    getLead(id).catch(() => null),
    getTags(),
    getLeadEnrollments(id),
  ]);

  if (!lead) notFound();

  // Fetch pipeline stage for this lead
  const supabase = await createClient();
  const { data: pipelineRaw } = await supabase
    .from("pipeline_entries")
    .select("stage")
    .eq("lead_id", id)
    .maybeSingle();
  const pipelineEntry = pipelineRaw as { stage: string } | null;

  return (
    <div className="max-w-5xl space-y-5">
      {/* Header */}
      <div>
        <Link
          href="/leads"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to leads
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">
            {lead.first_name} {lead.last_name}
          </h1>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[lead.status]}`}
          >
            {lead.status}
          </span>
        </div>
        {lead.company_name && (
          <p className="text-sm text-muted-foreground mt-0.5">
            {lead.job_title ? `${lead.job_title} · ` : ""}{lead.company_name}
          </p>
        )}
      </div>

      <LeadEditForm
        lead={lead}
        allTags={allTags}
        enrollments={enrollments}
        pipelineStage={pipelineEntry?.stage ?? null}
      />
    </div>
  );
}
