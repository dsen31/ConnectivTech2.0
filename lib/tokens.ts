import type { Lead } from "@/lib/supabase/types";

export const AVAILABLE_TOKENS = [
  { token: "{{first_name}}", label: "First Name" },
  { token: "{{last_name}}", label: "Last Name" },
  { token: "{{company_name}}", label: "Company" },
  { token: "{{industry}}", label: "Industry" },
  { token: "{{job_title}}", label: "Job Title" },
  { token: "{{company_size}}", label: "Company Size" },
  { token: "{{sender_name}}", label: "Sender Name" },
  { token: "{{calendar_link}}", label: "Calendar Link" },
] as const;

export const PREVIEW_LEAD: Partial<Lead> = {
  first_name: "Alex",
  last_name: "Johnson",
  company_name: "Acme Corp",
  industry: "Manufacturing",
  job_title: "Operations Manager",
  company_size: "51-200",
};

export function resolveTokens(
  text: string,
  lead: Partial<Lead>,
  extras: Record<string, string> = {}
): string {
  const map: Record<string, string> = {
    "{{first_name}}": lead.first_name ?? "",
    "{{last_name}}": lead.last_name ?? "",
    "{{company_name}}": lead.company_name ?? "",
    "{{industry}}": lead.industry ?? "",
    "{{job_title}}": lead.job_title ?? "",
    "{{company_size}}": lead.company_size ?? "",
    "{{sender_name}}": extras.sender_name ?? "",
    "{{calendar_link}}": extras.calendar_link ?? "[calendar link]",
  };
  return text.replace(/\{\{[a-z_]+\}\}/g, (match) => map[match] ?? match);
}

// Highlight {{tokens}} in a text string — returns HTML string
export function highlightTokens(text: string): string {
  return text.replace(
    /\{\{[a-z_]+\}\}/g,
    (match) =>
      `<mark class="bg-primary/10 text-primary rounded px-0.5 font-mono text-xs">${match}</mark>`
  );
}

// Extract all {{tokens}} present in a string
export function extractTokens(text: string): string[] {
  const matches = text.match(/\{\{[a-z_]+\}\}/g) ?? [];
  return [...new Set(matches)];
}
