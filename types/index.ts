import type { Lead, Tag, Campaign, CampaignStep, CampaignLead, EmailTemplate, PipelineEntry } from "@/lib/supabase/types";

export type { Lead, Tag, Campaign, CampaignStep, CampaignLead, EmailTemplate, PipelineEntry };

export type CampaignStepWithTemplate = CampaignStep & {
  email_templates: Pick<EmailTemplate, "id" | "name" | "subject" | "use_case"> | null;
};

export type CampaignWithSteps = Campaign & {
  campaign_steps: CampaignStepWithTemplate[];
};

export type EnrollmentWithLead = CampaignLead & {
  leads: Pick<Lead, "id" | "first_name" | "last_name" | "email" | "company_name"> | null;
};

export const CAMPAIGN_STATUS_STYLES: Record<string, string> = {
  draft: "bg-zinc-100 text-zinc-600 border-zinc-200",
  active: "bg-green-50 text-green-700 border-green-200",
  paused: "bg-yellow-50 text-yellow-700 border-yellow-200",
  completed: "bg-blue-50 text-blue-700 border-blue-200",
};

export const ENROLLMENT_STATUS_STYLES: Record<string, string> = {
  active: "bg-green-50 text-green-700 border-green-200",
  replied: "bg-blue-50 text-blue-700 border-blue-200",
  completed: "bg-zinc-100 text-zinc-600 border-zinc-200",
  paused: "bg-yellow-50 text-yellow-700 border-yellow-200",
  unsubscribed: "bg-red-50 text-red-700 border-red-200",
};

export const SEND_CONDITION_LABELS: Record<string, string> = {
  always: "Always send",
  not_replied: "If not replied",
  not_opened: "If not opened",
  opened: "If opened",
};

// ── Pipeline ──────────────────────────────────────────────────────────────────

export type PipelineStage =
  | "new"
  | "contacted"
  | "replied"
  | "call_booked"
  | "introduced"
  | "closed_won"
  | "closed_lost";

export type PipelineEntryWithLead = PipelineEntry & {
  leads: Pick<
    Lead,
    "id" | "first_name" | "last_name" | "email" | "company_name" | "industry" | "job_title" | "status"
  > | null;
};

export const PIPELINE_STAGES: PipelineStage[] = [
  "new",
  "contacted",
  "replied",
  "call_booked",
  "introduced",
  "closed_won",
  "closed_lost",
];

export const PIPELINE_STAGE_LABELS: Record<PipelineStage, string> = {
  new: "New",
  contacted: "Contacted",
  replied: "Replied",
  call_booked: "Call Booked",
  introduced: "Introduced",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
};

export const PIPELINE_STAGE_COLORS: Record<PipelineStage, string> = {
  new: "bg-zinc-100 text-zinc-700 border-zinc-200",
  contacted: "bg-blue-50 text-blue-700 border-blue-200",
  replied: "bg-indigo-50 text-indigo-700 border-indigo-200",
  call_booked: "bg-violet-50 text-violet-700 border-violet-200",
  introduced: "bg-purple-50 text-purple-700 border-purple-200",
  closed_won: "bg-green-50 text-green-700 border-green-200",
  closed_lost: "bg-red-50 text-red-700 border-red-200",
};

// ── A/B testing ───────────────────────────────────────────────────────────────

export type AbVariantStats = {
  sends: number;
  opens: number;
  replies: number;
};

export type StepAbStats = {
  a: AbVariantStats;
  b: AbVariantStats;
};

export type CampaignAbStats = Record<string, StepAbStats>;

export type LeadWithTags = Lead & {
  lead_tags: Array<{ tags: Tag | null }>;
  campaign_leads?: Array<{ id: string }>;
};

export type CampaignEnrollment = {
  id: string;
  campaign_id: string;
  lead_id: string;
  current_step: number;
  status: "active" | "completed" | "paused" | "replied" | "unsubscribed";
  enrolled_at: string;
  next_send_at: string | null;
  campaigns: Pick<Campaign, "id" | "name" | "use_case"> | null;
};

export function extractTags(lead: LeadWithTags): Tag[] {
  return lead.lead_tags
    .map((lt) => lt.tags)
    .filter((t): t is Tag => t !== null);
}

export const COMPANY_SIZES = [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "500+",
] as const;

export const LEAD_STATUSES = [
  { value: "new", label: "New" },
  { value: "active", label: "Active" },
  { value: "unsubscribed", label: "Unsubscribed" },
  { value: "bounced", label: "Bounced" },
] as const;

export const STATUS_STYLES: Record<string, string> = {
  new: "bg-zinc-100 text-zinc-700 border-zinc-200",
  active: "bg-green-50 text-green-700 border-green-200",
  unsubscribed: "bg-orange-50 text-orange-700 border-orange-200",
  bounced: "bg-red-50 text-red-700 border-red-200",
};

export const TAG_PALETTE = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#3b82f6",
  "#6b7280",
];

export const USE_CASE_LABELS: Record<string, string> = {
  telecom: "Telecom Savings",
  "vendor-vetting": "Vendor Vetting",
  "fractional-cto": "Fractional CTO",
  compliance: "Compliance",
  "it-audit": "IT Audit",
};

export const LEAD_FIELDS: Array<{ value: string; label: string; required?: boolean }> = [
  { value: "ignore", label: "— Ignore column —" },
  { value: "first_name", label: "First Name", required: true },
  { value: "last_name", label: "Last Name", required: true },
  { value: "email", label: "Email", required: true },
  { value: "company_name", label: "Company Name" },
  { value: "job_title", label: "Job Title" },
  { value: "industry", label: "Industry" },
  { value: "company_size", label: "Company Size" },
  { value: "website", label: "Website" },
  { value: "linkedin_url", label: "LinkedIn URL" },
  { value: "phone", label: "Phone" },
  { value: "notes", label: "Notes" },
];
