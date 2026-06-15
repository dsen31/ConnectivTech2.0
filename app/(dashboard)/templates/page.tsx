import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getTemplates } from "@/app/actions/templates";
import { TemplateCard } from "@/components/templates/TemplateCard";

const USE_CASE_ORDER = [
  "telecom",
  "vendor-vetting",
  "fractional-cto",
  "compliance",
  "it-audit",
] as const;

const USE_CASE_LABELS: Record<string, string> = {
  telecom: "Are you overpaying for telecom?",
  "vendor-vetting": "Who's vetting your vendors?",
  "fractional-cto": "Do you have a technology strategy?",
  compliance: "Is your business compliance-ready?",
  "it-audit": "Your IT costs are leaking money",
};

const USE_CASE_SUBTITLE: Record<string, string> = {
  telecom: "Savings angle — free telecom audit pitch",
  "vendor-vetting": "Risk/trust angle — pre-vetted vendor matching",
  "fractional-cto": "Strategy angle — fractional CTO services",
  compliance: "Compliance angle — CMMC, SOC 2, NIST",
  "it-audit": "Audit/savings angle — IT cost review",
};

export default async function TemplatesPage() {
  const templates = await getTemplates();

  // Group by use_case
  const grouped = Object.fromEntries(
    USE_CASE_ORDER.map((uc) => [
      uc,
      templates.filter((t) => t.use_case === uc),
    ])
  );

  const otherTemplates = templates.filter(
    (t) => !(USE_CASE_ORDER as readonly string[]).includes(t.use_case)
  );

  const totalCount = templates.length;

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Templates</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {totalCount} template{totalCount !== 1 ? "s" : ""} · 5 ConnectivTech sequences
          </p>
        </div>
        <Link
          href="/templates/new"
          className={cn(buttonVariants({ size: "sm" }), "no-underline")}
        >
          <Plus className="h-4 w-4 mr-1" />
          New Template
        </Link>
      </div>

      {/* Sequences */}
      {USE_CASE_ORDER.map((useCase) => {
        const group = grouped[useCase] ?? [];
        return (
          <section key={useCase} className="space-y-3">
            <div>
              <h2 className="font-semibold text-base">{USE_CASE_LABELS[useCase]}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {USE_CASE_SUBTITLE[useCase]} · {group.length} email{group.length !== 1 ? "s" : ""}
              </p>
            </div>
            {group.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  No templates for this sequence yet.{" "}
                  <Link href="/templates/new" className="underline">
                    Create one
                  </Link>{" "}
                  or run the seed migration.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.map((template, i) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    stepLabel={`Email ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}

      {/* Custom templates not in a sequence */}
      {otherTemplates.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="font-semibold text-base">Other Templates</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {otherTemplates.length} custom template{otherTemplates.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {otherTemplates.map((template) => (
              <TemplateCard key={template.id} template={template} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
