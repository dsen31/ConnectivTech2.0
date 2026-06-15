import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EmailTemplate } from "@/lib/supabase/types";

const USE_CASE_COLORS: Record<string, string> = {
  telecom: "bg-blue-50 text-blue-700 border-blue-200",
  "vendor-vetting": "bg-violet-50 text-violet-700 border-violet-200",
  "fractional-cto": "bg-indigo-50 text-indigo-700 border-indigo-200",
  compliance: "bg-red-50 text-red-700 border-red-200",
  "it-audit": "bg-orange-50 text-orange-700 border-orange-200",
};

const USE_CASE_LABELS: Record<string, string> = {
  telecom: "Telecom",
  "vendor-vetting": "Vendor Vetting",
  "fractional-cto": "Fractional CTO",
  compliance: "Compliance",
  "it-audit": "IT Audit",
};

interface TemplateCardProps {
  template: EmailTemplate;
  stepLabel?: string;
}

export function TemplateCard({ template, stepLabel }: TemplateCardProps) {
  const bodyPreview = template.body_text
    .replace(/\{\{[a-z_]+\}\}/g, "…")
    .slice(0, 120)
    .trim();

  return (
    <Link href={`/templates/${template.id}`} className="block group">
      <Card className="h-full transition-colors hover:border-primary/50 cursor-pointer">
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              {stepLabel && (
                <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {stepLabel}
                </span>
              )}
              <span
                className={cn(
                  "text-xs font-medium border px-2 py-0.5 rounded-full",
                  USE_CASE_COLORS[template.use_case] ?? "bg-muted text-muted-foreground border-border"
                )}
              >
                {USE_CASE_LABELS[template.use_case] ?? template.use_case}
              </span>
              {template.is_seed && (
                <span className="text-xs text-muted-foreground">(seed)</span>
              )}
            </div>
            <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </div>
          <p className="font-semibold text-sm mt-2 leading-snug">{template.name}</p>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-2">
          <p className="text-xs text-muted-foreground font-medium">
            Subject:{" "}
            <span className="text-foreground">
              {template.subject.replace(/\{\{[a-z_]+\}\}/g, "…")}
            </span>
          </p>
          <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
            {bodyPreview}
            {template.body_text.length > 120 ? "…" : ""}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
