import { getLeads, getUnsubscribedLeads } from "@/app/actions/leads";
import { getTags } from "@/app/actions/tags";
import { LeadTable } from "@/components/leads/LeadTable";

export default async function LeadsPage() {
  const [leads, tags, unsubscribedLeads] = await Promise.all([
    getLeads(),
    getTags(),
    getUnsubscribedLeads(),
  ]);

  return (
    <div className="space-y-4 max-w-7xl">
      <div>
        <h1 className="text-2xl font-semibold">Leads</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage and segment your contacts
        </p>
      </div>
      <LeadTable leads={leads} tags={tags} unsubscribedLeads={unsubscribedLeads} />
    </div>
  );
}
