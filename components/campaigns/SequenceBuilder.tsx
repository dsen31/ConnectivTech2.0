"use client";

import { useState, useTransition } from "react";
import { ChevronUp, ChevronDown, Trash2, Plus, Check, X, Pencil } from "lucide-react";
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
import type { CampaignStepWithTemplate, EmailTemplate } from "@/types";
import { SEND_CONDITION_LABELS } from "@/types";

const USE_CASE_LABELS: Record<string, string> = {
  telecom: "Telecom",
  "vendor-vetting": "Vendor Vetting",
  "fractional-cto": "Fractional CTO",
  compliance: "Compliance",
  "it-audit": "IT Audit",
};

interface SequenceBuilderProps {
  campaignId: string;
  steps: CampaignStepWithTemplate[];
  templates: EmailTemplate[];
  campaignUseCase: string;
}

interface StepFormState {
  templateId: string;
  delayDays: number;
  sendCondition: "always" | "not_replied" | "not_opened" | "opened";
}

const DEFAULT_FORM: StepFormState = {
  templateId: "",
  delayDays: 3,
  sendCondition: "always",
};

function StepRow({
  step,
  index,
  total,
  templates,
  onMove,
  onDelete,
}: {
  step: CampaignStepWithTemplate;
  index: number;
  total: number;
  templates: EmailTemplate[];
  onMove: (dir: "up" | "down") => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<StepFormState>({
    templateId: step.template_id,
    delayDays: step.delay_days,
    sendCondition: step.send_condition,
  });
  const [saving, startSave] = useTransition();

  function handleSave() {
    startSave(async () => {
      try {
        await updateCampaignStep(step.id, {
          template_id: form.templateId,
          delay_days: form.delayDays,
          send_condition: form.sendCondition,
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
    });
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
          <p className="text-sm font-medium truncate">
            {step.email_templates?.name ?? "Unknown template"}
          </p>
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
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={index === 0}
            onClick={() => onMove("up")}
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={index === total - 1}
            onClick={() => onMove("down")}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setEditing(!editing)}
          >
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
}: SequenceBuilderProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [pending, startTransition] = useTransition();

  // Filter templates to campaign use_case first, then all
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
