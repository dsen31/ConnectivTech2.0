"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { Trash2, Save } from "lucide-react";
import { updateLead, deleteLead, addTagToLead, removeTagFromLead, updateLeadPipelineStage } from "@/app/actions/leads";
import type { Lead, Tag } from "@/lib/supabase/types";
import { type LeadWithTags, type CampaignEnrollment, extractTags, COMPANY_SIZES, LEAD_STATUSES, STATUS_STYLES } from "@/types";
import { toast } from "sonner";

const PIPELINE_STAGES = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "replied", label: "Replied" },
  { value: "call_booked", label: "Call Booked" },
  { value: "introduced", label: "Introduced to ConnectivTech" },
  { value: "closed_won", label: "Closed Won" },
  { value: "closed_lost", label: "Closed Lost" },
];

interface LeadEditFormProps {
  lead: LeadWithTags;
  allTags: Tag[];
  enrollments: CampaignEnrollment[];
  pipelineStage: string | null;
}

export function LeadEditForm({ lead, allTags, enrollments, pipelineStage }: LeadEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showDelete, setShowDelete] = useState(false);

  const [form, setForm] = useState({
    first_name: lead.first_name,
    last_name: lead.last_name,
    email: lead.email,
    company_name: lead.company_name ?? "",
    job_title: lead.job_title ?? "",
    industry: lead.industry ?? "",
    company_size: lead.company_size ?? "",
    website: lead.website ?? "",
    linkedin_url: lead.linkedin_url ?? "",
    phone: lead.phone ?? "",
    notes: lead.notes ?? "",
    status: lead.status,
  });

  const leadTags = extractTags(lead);
  const unassignedTags = allTags.filter((t) => !leadTags.find((lt) => lt.id === t.id));

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSave() {
    startTransition(async () => {
      try {
        await updateLead(lead.id, {
          ...form,
          company_name: form.company_name || null,
          job_title: form.job_title || null,
          industry: form.industry || null,
          company_size: (form.company_size || null) as Lead["company_size"],
          website: form.website || null,
          linkedin_url: form.linkedin_url || null,
          phone: form.phone || null,
          notes: form.notes || null,
        });
        toast.success("Lead saved");
        router.refresh();
      } catch {
        toast.error("Failed to save lead");
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteLead(lead.id);
        toast.success("Lead deleted");
        router.push("/leads");
      } catch {
        toast.error("Failed to delete lead");
      }
    });
  }

  function handleAddTag(tagId: string) {
    startTransition(async () => {
      try {
        await addTagToLead(lead.id, tagId);
        router.refresh();
      } catch {
        toast.error("Failed to add tag");
      }
    });
  }

  function handleRemoveTag(tagId: string) {
    startTransition(async () => {
      try {
        await removeTagFromLead(lead.id, tagId);
        router.refresh();
      } catch {
        toast.error("Failed to remove tag");
      }
    });
  }

  function handleStageChange(stage: string | null) {
    if (!stage) return;
    startTransition(async () => {
      try {
        await updateLeadPipelineStage(lead.id, stage);
        toast.success("Pipeline stage updated");
        router.refresh();
      } catch {
        toast.error("Failed to update stage");
      }
    });
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: Edit form ── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-lg border p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>First Name</Label>
                <Input value={form.first_name} onChange={(e) => set("first_name", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Last Name</Label>
                <Input value={form.last_name} onChange={(e) => set("last_name", e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="Optional" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Company</Label>
                <Input value={form.company_name} onChange={(e) => set("company_name", e.target.value)} placeholder="Optional" />
              </div>
              <div className="space-y-1.5">
                <Label>Job Title</Label>
                <Input value={form.job_title} onChange={(e) => set("job_title", e.target.value)} placeholder="Optional" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Industry</Label>
                <Input value={form.industry} onChange={(e) => set("industry", e.target.value)} placeholder="e.g. Manufacturing" />
              </div>
              <div className="space-y-1.5">
                <Label>Company Size</Label>
                <Select value={form.company_size || "unset"} onValueChange={(v) => set("company_size", v === "unset" ? "" : (v ?? ""))}>

                  <SelectTrigger>
                    <SelectValue placeholder="Select range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unset">Unknown</SelectItem>
                    {COMPANY_SIZES.map((s) => (
                      <SelectItem key={s} value={s}>{s} employees</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Website</Label>
                <Input value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://" />
              </div>
              <div className="space-y-1.5">
                <Label>LinkedIn URL</Label>
                <Input value={form.linkedin_url} onChange={(e) => set("linkedin_url", e.target.value)} placeholder="https://linkedin.com/in/..." />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Any context about this lead…"
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v ?? "new")}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                className="text-destructive border-destructive/30 hover:bg-destructive/5"
                onClick={() => setShowDelete(true)}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete lead
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isPending}>
                <Save className="h-4 w-4 mr-1" />
                {isPending ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </div>
        </div>

        {/* ── Right: Tags, Pipeline, Campaigns ── */}
        <div className="space-y-4">
          {/* Tags */}
          <div className="rounded-lg border p-4 space-y-3">
            <h3 className="text-sm font-semibold">Tags</h3>
            <div className="flex flex-wrap gap-1.5">
              {leadTags.length === 0 ? (
                <p className="text-xs text-muted-foreground">No tags assigned</p>
              ) : (
                leadTags.map((tag) => (
                  <button
                    key={tag.id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer hover:opacity-80"
                    style={{
                      backgroundColor: tag.color + "20",
                      color: tag.color,
                      border: `1px solid ${tag.color}40`,
                    }}
                    onClick={() => handleRemoveTag(tag.id)}
                    title="Click to remove"
                  >
                    {tag.name}
                    <span className="opacity-60">×</span>
                  </button>
                ))
              )}
            </div>
            {unassignedTags.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Add tag:</p>
                <div className="flex flex-wrap gap-1.5">
                  {unassignedTags.map((tag) => (
                    <button
                      key={tag.id}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border border-dashed hover:opacity-80 transition-opacity"
                      style={{
                        color: tag.color,
                        borderColor: tag.color + "60",
                      }}
                      onClick={() => handleAddTag(tag.id)}
                    >
                      + {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Pipeline stage */}
          <div className="rounded-lg border p-4 space-y-3">
            <h3 className="text-sm font-semibold">Pipeline Stage</h3>
            <Select
              value={pipelineStage ?? "new"}
              onValueChange={handleStageChange}
              disabled={isPending}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PIPELINE_STAGES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Campaign enrollments */}
          {enrollments.length > 0 && (
            <div className="rounded-lg border p-4 space-y-2">
              <h3 className="text-sm font-semibold">Campaigns</h3>
              {enrollments.map((e) => (
                <div key={e.id} className="flex items-center justify-between py-1">
                  <div>
                    <p className="text-sm font-medium">{e.campaigns?.name}</p>
                    <p className="text-xs text-muted-foreground">Step {e.current_step}</p>
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                      STATUS_STYLES[e.status] ?? STATUS_STYLES.new
                    }`}
                  >
                    {e.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this lead?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <strong>{lead.first_name} {lead.last_name}</strong> and remove them
              from all campaigns. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={isPending}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
