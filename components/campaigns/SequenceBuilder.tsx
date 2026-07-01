"use client";

import { useState, useTransition } from "react";
import { ChevronUp, ChevronDown, Trash2, Plus, Check, X, Pencil, FlaskConical, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  addCampaignStep,
  updateCampaignStep,
  deleteCampaignStep,
  moveCampaignStep,
} from "@/app/actions/campaigns";
import type { CampaignStepWithTemplate, EmailTemplate, StepAbStats, CampaignAbStats } from "@/types";
import { SEND_CONDITION_LABELS } from "@/types";

const USE_CASE_LABELS: Record<string, string> = {
  telecom: "Telecom",
  "vendor-vetting": "Vendor Vetting",
  "fractional-cto": "Fractional CTO",
  compliance: "Compliance",
  "it-audit": "IT Audit",
};

function computeWinner(stats: StepAbStats): "A" | "B" | null {
  if (stats.a.sends < 20 || stats.b.sends < 20) return null;
  const aRate = stats.a.opens / stats.a.sends;
  const bRate = stats.b.opens / stats.b.sends;
  if (Math.abs(aRate - bRate) >= 0.10) return aRate > bRate ? "A" : "B";
  return null;
}

function pct(n: number, d: number) {
  return d > 0 ? Math.round((n / d) * 100) : 0;
}

interface SequenceBuilderProps {
  campaignId: string;
  steps: CampaignStepWithTemplate[];
  templates: EmailTemplate[];
  campaignUseCase: string;
  abStats: CampaignAbStats;
}

interface StepFormState {
  templateId: string;
  delayDays: number;
  sendCondition: "always" | "not_replied" | "not_opened" | "opened";
  subjectB: string;
}

const DEFAULT_FORM: StepFormState = {
  templateId: "",
  delayDays: 3,
  sendCondition: "always",
  subjectB: "",
};

function StepRow({
  step,
  index,
  total,
  templates,
  stats,
  onMove,
  onDelete,
}: {
  step: CampaignStepWithTemplate;
  index: number;
  total: number;
  templates: EmailTemplate[];
  stats?: StepAbStats;
  onMove: (dir: "up" | "down") => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<StepFormState>({
    templateId: step.template_id,
    delayDays: step.delay_days,
    sendCondition: step.send_condition,
    subjectB: step.subject_b ?? "",
  });
  const [abEnabled, setAbEnabled] = useState(!!step.subject_b);
  const [saving, startSave] = useTransition();

  const winner = stats ? computeWinner(stats) : null;

  function handleSave() {
    startSave(async () => {
      try {
        await updateCampaignStep(step.id, {
          template_id: form.templateId,
          delay_days: form.delayDays,
          send_condition: form.sendCondition,
          subject_b: abEnabled && form.subjectB.trim() ? form.subjectB.trim() : null,
        });
        toast.success("Step updated");
        setEditing(false);
      } catch {
        toast.error("Failed to update step");
      }
    });
  }

  function handleCancel() {
    setForm({
      templateId: step.template_id,
      delayDays: step.delay_days,
      sendCondition: step.send_condition,
      subjectB: step.subject_b ?? "",
    });
    setAbEnabled(!!step.subject_b);
    setEditing(false);
  }

  return (
    <div className="rounded-lg border bg-card">
      {/* Step header */}
      <div className="flex items-center gap-3 p-4">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
          {step.step_number}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate">
              {step.email_templates?.name ?? "Unknown template"}
            </p>
            {step.subject_b && (
              <span className="shrink-0 inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200 font-medium">
                <FlaskConical className="h-3 w-3" />
                A/B
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
            <span>
              {step.delay_days === 0
                ? "Send immediately"
                : `Day ${step.delay_days}`}
            </span>
            <span className="text-border">·</span>
            <span>{SEND_CONDITION_LABELS[step.send_condition]}</span>
            {step.email_templates?.use_case && (
              <>
                <span className="text-border">·</span>
                <span>{USE_CASE_LABELS[step.email_templates.use_case] ?? step.email_templates.use_case}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={index === 0} onClick={() => onMove("up")}>
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={index === total - 1} onClick={() => onMove("down")}>
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(!editing)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* A/B stats panel — shown when subject_b is set and we're not editing */}
      {step.subject_b && !editing && stats && (
        <div className="border-t px-4 pb-4 pt-3 bg-muted/20 space-y-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Subject A/B Test</span>
            {winner && (
              <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 font-medium">
                <Trophy className="h-3 w-3" />
                Winner: {winner}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(["A", "B"] as const).map((v) => {
              const variantStats = v === "A" ? stats.a : stats.b;
              const subjectText = v === "A" ? (step.email_templates?.subject ?? "") : step.subject_b!;
              const openRate = pct(variantStats.opens, variantStats.sends);
              const replyRate = pct(variantStats.replies, variantStats.sends);
              const isWinner = winner === v;
              return (
                <div
                  key={v}
                  className={cn(
                    "rounded-md border p-2.5 text-xs space-y-1.5",
                    isWinner ? "border-green-300 bg-green-50" : "bg-card"
                  )}
                >
                  <div className="flex items-center gap-1 font-medium">
                    <span>Variant {v}</span>
                    {isWinner && <Trophy className="h-3 w-3 text-green-600" />}
                  </div>
                  <p className="text-muted-foreground truncate italic">&ldquo;{subjectText}&rdquo;</p>
                  <div className="space-y-0.5 text-muted-foreground">
                    <div><span className="font-medium text-foreground">{variantStats.sends}</span> sends</div>
                    <div><span className="font-medium text-foreground">{openRate}%</span> open rate</div>
                    <div><span className="font-medium text-foreground">{replyRate}%</span> reply rate</div>
                  </div>
                </div>
              );
            })}
          </div>

          {!winner && (
            <p className="text-xs text-muted-foreground">
              {stats.a.sends < 20 || stats.b.sends < 20
                ? `Need ${Math.max(20 - stats.a.sends, 0)} more A sends and ${Math.max(20 - stats.b.sends, 0)} more B sends to declare a winner.`
                : "No clear winner yet — open rates within 10pp of each other."}
            </p>
          )}
          {winner && (
            <p className="text-xs text-green-700 font-medium">
              Winner declared. Remaining leads will automatically receive Variant {winner}.
            </p>
          )}
        </div>
      )}

      {/* Empty state when subject_b set but no sends yet */}
      {step.subject_b && !editing && !stats && (
        <div className="border-t px-4 py-2.5 bg-muted/20">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <FlaskConical className="h-3 w-3" />
            A/B subject test active — results will appear once emails are sent.
          </p>
        </div>
      )}

      {/* Inline edit form */}
      {editing && (
        <div className="border-t px-4 pb-4 pt-3 space-y-3 bg-muted/30">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-3">
              <Label className="text-xs mb-1 block">Template</Label>
              <Select
                value={form.templateId}
                onValueChange={(v) => setForm((p) => ({ ...p, templateId: v ?? p.templateId }))}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Delay (days)</Label>
              <Input
                type="number"
                min={0}
                value={form.delayDays}
                onChange={(e) =>
                  setForm((p) => ({ ...p, delayDays: Math.max(0, parseInt(e.target.value) || 0) }))
                }
                className="h-8 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs mb-1 block">Send condition</Label>
              <Select
                value={form.sendCondition}
                onValueChange={(v) =>
                  setForm((p) => ({
                    ...p,
                    sendCondition: (v as StepFormState["sendCondition"]) ?? p.sendCondition,
                  }))
                }
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SEND_CONDITION_LABELS).map(([val, label]) => (
                    <SelectItem key={val} value={val}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* A/B test toggle */}
          <div className="border rounded-md p-3 space-y-2.5 bg-card">
            <button
              type="button"
              className="flex items-center gap-2 w-full text-left"
              onClick={() => setAbEnabled((p) => !p)}
            >
              <div
                className={cn(
                  "flex h-4 w-7 shrink-0 items-center rounded-full border transition-colors",
                  abEnabled ? "bg-primary border-primary" : "bg-muted border-border"
                )}
              >
                <div
                  className={cn(
                    "h-3 w-3 rounded-full bg-white shadow transition-transform mx-0.5",
                    abEnabled ? "translate-x-3" : "translate-x-0"
                  )}
                />
              </div>
              <span className="text-xs font-medium flex items-center gap-1">
                <FlaskConical className="h-3.5 w-3.5 text-violet-600" />
                Test subject line (A/B)
              </span>
            </button>

            {abEnabled && (
              <div className="space-y-2 pt-0.5">
                <div>
                  <Label className="text-xs mb-1 block text-muted-foreground">
                    Variant A — from template (existing)
                  </Label>
                  <div className="h-8 px-3 flex items-center rounded-md border bg-muted text-xs text-muted-foreground truncate">
                    {step.email_templates?.subject || templates.find(t => t.id === form.templateId)?.subject || "—"}
                  </div>
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Variant B — test subject line</Label>
                  <Input
                    value={form.subjectB}
                    onChange={(e) => setForm((p) => ({ ...p, subjectB: e.target.value }))}
                    placeholder="Enter alternative subject line…"
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              <X className="h-3.5 w-3.5 mr-1" />
              Cancel
            </Button>
            <Button size="sm" disabled={!form.templateId || saving} onClick={handleSave}>
              <Check className="h-3.5 w-3.5 mr-1" />
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function AddStepForm({
  campaignId,
  templates,
  nextStepNumber,
  onDone,
}: {
  campaignId: string;
  templates: EmailTemplate[];
  nextStepNumber: number;
  onDone: () => void;
}) {
  const [form, setForm] = useState<StepFormState>({
    ...DEFAULT_FORM,
    delayDays: nextStepNumber === 1 ? 0 : 3,
  });
  const [saving, startSave] = useTransition();

  function handleAdd() {
    if (!form.templateId) return;
    startSave(async () => {
      try {
        await addCampaignStep(campaignId, form.templateId, form.delayDays, form.sendCondition);
        toast.success("Step added");
        onDone();
      } catch {
        toast.error("Failed to add step");
      }
    });
  }

  return (
    <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
      <p className="text-sm font-medium">Add Step {nextStepNumber}</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-3">
          <Label className="text-xs mb-1 block">Template</Label>
          <Select
            value={form.templateId}
            onValueChange={(v) => setForm((p) => ({ ...p, templateId: v ?? p.templateId }))}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Select a template…" />
            </SelectTrigger>
            <SelectContent>
              {templates.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs mb-1 block">Delay (days)</Label>
          <Input
            type="number"
            min={0}
            value={form.delayDays}
            onChange={(e) =>
              setForm((p) => ({ ...p, delayDays: Math.max(0, parseInt(e.target.value) || 0) }))
            }
            className="h-8 text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <Label className="text-xs mb-1 block">Send condition</Label>
          <Select
            value={form.sendCondition}
            onValueChange={(v) =>
              setForm((p) => ({
                ...p,
                sendCondition: (v as StepFormState["sendCondition"]) ?? p.sendCondition,
              }))
            }
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(SEND_CONDITION_LABELS).map(([val, label]) => (
                <SelectItem key={val} value={val}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onDone}>
          <X className="h-3.5 w-3.5 mr-1" />
          Cancel
        </Button>
        <Button size="sm" disabled={!form.templateId || saving} onClick={handleAdd}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Step
        </Button>
      </div>
    </div>
  );
}

export function SequenceBuilder({
  campaignId,
  steps,
  templates,
  campaignUseCase,
  abStats,
}: SequenceBuilderProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [pending, startTransition] = useTransition();

  const preferredTemplates = templates.filter((t) => t.use_case === campaignUseCase);
  const otherTemplates = templates.filter((t) => t.use_case !== campaignUseCase);
  const sortedTemplates = [...preferredTemplates, ...otherTemplates];

  function handleMove(stepId: string, dir: "up" | "down") {
    startTransition(async () => {
      try {
        await moveCampaignStep(stepId, dir);
      } catch {
        toast.error("Failed to reorder step");
      }
    });
  }

  function handleDelete(stepId: string) {
    startTransition(async () => {
      try {
        await deleteCampaignStep(stepId);
        toast.success("Step removed");
      } catch {
        toast.error("Failed to remove step");
      }
    });
  }

  return (
    <div className={cn("space-y-3", pending && "opacity-60 pointer-events-none")}>
      {steps.length === 0 && !showAddForm && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">No steps yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Add email steps to build your sequence.</p>
        </div>
      )}

      {steps.map((step, i) => (
        <StepRow
          key={step.id}
          step={step}
          index={i}
          total={steps.length}
          templates={sortedTemplates}
          stats={abStats[step.id]}
          onMove={(dir) => handleMove(step.id, dir)}
          onDelete={() => handleDelete(step.id)}
        />
      ))}

      {showAddForm ? (
        <AddStepForm
          campaignId={campaignId}
          templates={sortedTemplates}
          nextStepNumber={steps.length + 1}
          onDone={() => setShowAddForm(false)}
        />
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setShowAddForm(true)}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Step
        </Button>
      )}
    </div>
  );
}
