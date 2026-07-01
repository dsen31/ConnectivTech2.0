export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// ── Row types (what the DB returns) ──────────────────────────────────────────

type LeadRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  company_name: string | null;
  job_title: string | null;
  industry: string | null;
  company_size: "1-10" | "11-50" | "51-200" | "201-500" | "500+" | null;
  website: string | null;
  linkedin_url: string | null;
  phone: string | null;
  pain_points: string[] | null;
  status: "new" | "active" | "unsubscribed" | "bounced";
  source: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};
type LeadInsert = {
  id?: string;
  first_name: string;
  last_name: string;
  email: string;
  company_name?: string | null;
  job_title?: string | null;
  industry?: string | null;
  company_size?: "1-10" | "11-50" | "51-200" | "201-500" | "500+" | null;
  website?: string | null;
  linkedin_url?: string | null;
  phone?: string | null;
  pain_points?: string[] | null;
  status?: "new" | "active" | "unsubscribed" | "bounced";
  source?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
};
type LeadUpdate = {
  id?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  company_name?: string | null;
  job_title?: string | null;
  industry?: string | null;
  company_size?: "1-10" | "11-50" | "51-200" | "201-500" | "500+" | null;
  website?: string | null;
  linkedin_url?: string | null;
  phone?: string | null;
  pain_points?: string[] | null;
  status?: "new" | "active" | "unsubscribed" | "bounced";
  source?: string | null;
  notes?: string | null;
};

type TagRow = { id: string; name: string; color: string; created_at: string };
type TagInsert = { id?: string; name: string; color?: string; created_at?: string };
type TagUpdate = { id?: string; name?: string; color?: string };

type LeadTagRow = { lead_id: string; tag_id: string };

type EmailTemplateRow = {
  id: string;
  name: string;
  use_case: "telecom" | "vendor-vetting" | "fractional-cto" | "compliance" | "it-audit";
  subject: string;
  body_text: string;
  body_html: string | null;
  tokens_used: string[] | null;
  is_seed: boolean;
  created_at: string;
  updated_at: string;
};
type EmailTemplateInsert = {
  id?: string;
  name: string;
  use_case: "telecom" | "vendor-vetting" | "fractional-cto" | "compliance" | "it-audit";
  subject: string;
  body_text: string;
  body_html?: string | null;
  tokens_used?: string[] | null;
  is_seed?: boolean;
  created_at?: string;
  updated_at?: string;
};
type EmailTemplateUpdate = Partial<EmailTemplateInsert>;

type CampaignRow = {
  id: string;
  name: string;
  use_case: string;
  description: string | null;
  status: "draft" | "active" | "paused" | "completed";
  from_name: string | null;
  from_email: string | null;
  created_at: string;
  updated_at: string;
};
type CampaignInsert = {
  id?: string;
  name: string;
  use_case: string;
  description?: string | null;
  status?: "draft" | "active" | "paused" | "completed";
  from_name?: string | null;
  from_email?: string | null;
  created_at?: string;
  updated_at?: string;
};
type CampaignUpdate = Partial<CampaignInsert>;

type CampaignStepRow = {
  id: string;
  campaign_id: string;
  step_number: number;
  template_id: string;
  delay_days: number;
  send_condition: "always" | "not_replied" | "not_opened" | "opened";
  subject_b: string | null;
  created_at: string;
};
type CampaignStepInsert = {
  id?: string;
  campaign_id: string;
  step_number: number;
  template_id: string;
  delay_days?: number;
  send_condition?: "always" | "not_replied" | "not_opened" | "opened";
  subject_b?: string | null;
  created_at?: string;
};
type CampaignStepUpdate = Partial<CampaignStepInsert>;

type CampaignLeadRow = {
  id: string;
  campaign_id: string;
  lead_id: string;
  current_step: number;
  status: "active" | "completed" | "paused" | "replied" | "unsubscribed";
  enrolled_at: string;
  next_send_at: string | null;
};
type CampaignLeadInsert = {
  id?: string;
  campaign_id: string;
  lead_id: string;
  current_step?: number;
  status?: "active" | "completed" | "paused" | "replied" | "unsubscribed";
  enrolled_at?: string;
  next_send_at?: string | null;
};
type CampaignLeadUpdate = Partial<CampaignLeadInsert>;

type EmailEventRow = {
  id: string;
  campaign_lead_id: string;
  lead_id: string;
  step_id: string;
  event_type: "sent" | "opened" | "clicked" | "replied" | "bounced" | "unsubscribed";
  metadata: Json | null;
  created_at: string;
};
type EmailEventInsert = {
  id?: string;
  campaign_lead_id: string;
  lead_id: string;
  step_id: string;
  event_type: "sent" | "opened" | "clicked" | "replied" | "bounced" | "unsubscribed";
  metadata?: Json | null;
  created_at?: string;
};
type EmailEventUpdate = Partial<EmailEventInsert>;

type PipelineEntryRow = {
  id: string;
  lead_id: string;
  stage: "new" | "contacted" | "replied" | "call_booked" | "introduced" | "closed_won" | "closed_lost";
  notes: string | null;
  created_at: string;
  updated_at: string;
};
type PipelineEntryInsert = {
  id?: string;
  lead_id: string;
  stage?: "new" | "contacted" | "replied" | "call_booked" | "introduced" | "closed_won" | "closed_lost";
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
};
type PipelineEntryUpdate = Partial<PipelineEntryInsert>;

type AbTestRow = {
  id: string;
  step_id: string;
  variant_a_template_id: string;
  variant_b_template_id: string;
  split_pct: number;
  winner_template_id: string | null;
  status: "running" | "concluded";
  created_at: string;
};
type AbTestInsert = {
  id?: string;
  step_id: string;
  variant_a_template_id: string;
  variant_b_template_id: string;
  split_pct?: number;
  winner_template_id?: string | null;
  status?: "running" | "concluded";
  created_at?: string;
};
type AbTestUpdate = Partial<AbTestInsert>;

type Rel = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

type SettingRow = { key: string; value: string; updated_at: string };
type SettingInsert = { key: string; value: string; updated_at?: string };
type SettingUpdate = { value?: string; updated_at?: string };

type Tbl<R, I, U> = { Row: R; Insert: I; Update: U; Relationships: Rel[] };

// ── Database shape ────────────────────────────────────────────────────────────

export type Database = {
  public: {
    Tables: {
      leads: Tbl<LeadRow, LeadInsert, LeadUpdate>;
      tags: Tbl<TagRow, TagInsert, TagUpdate>;
      lead_tags: Tbl<LeadTagRow, LeadTagRow, Partial<LeadTagRow>>;
      email_templates: Tbl<EmailTemplateRow, EmailTemplateInsert, EmailTemplateUpdate>;
      campaigns: Tbl<CampaignRow, CampaignInsert, CampaignUpdate>;
      campaign_steps: Tbl<CampaignStepRow, CampaignStepInsert, CampaignStepUpdate>;
      campaign_leads: Tbl<CampaignLeadRow, CampaignLeadInsert, CampaignLeadUpdate>;
      email_events: Tbl<EmailEventRow, EmailEventInsert, EmailEventUpdate>;
      pipeline_entries: Tbl<PipelineEntryRow, PipelineEntryInsert, PipelineEntryUpdate>;
      ab_tests: Tbl<AbTestRow, AbTestInsert, AbTestUpdate>;
      settings: Tbl<SettingRow, SettingInsert, SettingUpdate>;
    };
    Views: Record<string, { Row: Record<string, unknown>; Relationships: Rel[] }>;
    Functions: Record<string, { Args: Record<string, unknown>; Returns: unknown }>;
    Enums: Record<string, string[]>;
    CompositeTypes: Record<string, Record<string, unknown>>;
  };
};

// ── Convenience row types ─────────────────────────────────────────────────────

export type Lead = LeadRow;
export type Tag = TagRow;
export type EmailTemplate = EmailTemplateRow;
export type Campaign = CampaignRow;
export type CampaignStep = CampaignStepRow;
export type CampaignLead = CampaignLeadRow;
export type EmailEvent = EmailEventRow;
export type PipelineEntry = PipelineEntryRow;
export type AbTest = AbTestRow;
