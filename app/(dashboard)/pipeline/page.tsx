import { getPipelineLeads } from "@/app/actions/pipeline";
import { KanbanBoard } from "@/components/pipeline/KanbanBoard";
import { PIPELINE_STAGES } from "@/types";
import type { PipelineStage, PipelineEntryWithLead } from "@/types";

export default async function PipelinePage() {
  const entries = await getPipelineLeads();

  // Group entries by stage
  const columns = PIPELINE_STAGES.reduce(
    (acc, stage) => {
      acc[stage] = entries.filter((e) => e.stage === stage);
      return acc;
    },
    {} as Record<PipelineStage, PipelineEntryWithLead[]>
  );

  const totalInPipeline = entries.length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Pipeline</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {totalInPipeline > 0
            ? `${totalInPipeline} lead${totalInPipeline !== 1 ? "s" : ""} across 7 stages · Drag to move`
            : "Enroll leads in a campaign to add them to the pipeline"}
        </p>
      </div>

      <KanbanBoard initialColumns={columns} />
    </div>
  );
}
