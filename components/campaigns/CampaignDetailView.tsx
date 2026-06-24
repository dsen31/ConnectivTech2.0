"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { updateCampaign, deleteCampaign, unenrollLead, bulkUnenrollLeads } from "@/app/actions/campaigns";
import { sendCampaignStep } from "@/app/actions/email";
import { Checkbox } from "@/components/ui/checkbox";
import { Send } from "lucide-react";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtShort(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
import { SequenceBuilder } from "@/components/campaigns/SequenceBuilder";
import { EnrollmentDialog } from "@/components/campaigns/EnrollmentDialog";
import type {
  CampaignWithSteps,
  EnrollmentWithLead,
  LeadWithTags,
  Tag,
  EmailTemplate,
} from "@/types";
import {
  USE_CASE_LABELS,
  CAMPAIGN_STATUS_STYLES,
  ENROLLMENT_STATUS_STYLES,
} from "@/types";

const USE_CASE_COLORS: Record<string, string> = {
  telecom: "bg-blue-50 text-blue-700 border-blue-200",
  "vendor-vetting": "bg-violet-50 text-violet-700 border-violet-200",
  "fractional-cto": "bg-indigo-50 text-indigo-700 border-indigo-200",
  compliance: "bg-red-50 text-red-700 border-red-200",
  "it-audit": "bg-orange-50 text-orange-700 border-orange-200",
};

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "completed", label: "Completed" },
] as const;

interface CampaignDetailViewProps {
  campaign: CampaignWithSteps;
  enrollments: EnrollmentWithLead[];
  availableLeads: LeadWithTags[];
  allTags: Tag[];
  templates: EmailTemplate[];
}

function EnrollmentStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border capitalize",
        ENROLLMENT_STATUS_STYLES[status] ?? "bg-muted text-muted-foreground border-border"
      )}
    >
      {status}
    </span>
  );
}

export function CampaignDetailView({
  campaign,
  enrollments,
  availableLeads,
  allTags,
  templates,
}: CampaignDetailViewProps) {
  const router = useRouter();
  const [statusPending, startStatus] = useTransition();
  const [deletePending, startDelete] = useTransition();
  const [unenrollPending, startUnenroll] = useTransition();
  const [sendPending, startSend] = useTransition();
  const [bulkPending, startBulk] = useTransition();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const activeCount = enrollments.filter((e) => e.status === "active").length;
  const visibleEnrollments = statusFilter
    ? enrollments.filter((e) => e.status === statusFilter)
    : enrollments;
  const allSelected = selectedIds.size === visibleEnrollments.length && visibleEnrollments.length > 0;
  const someSelected = selectedIds.size > 0 && !allSelected;

  // Enrollment stats
  const stats = enrollments.reduce(
    (acc, e) => {
      acc[e.status] = (acc[e.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  function handleStatusChange(newStatus: string | null) {
    if (!newStatus) return;
    startStatus(async () => {
      try {
        await updateCampaign(campaign.id, {
          status: newStatus as CampaignWithSteps["status"],
        });
        toast.success("Status updated");
      } catch {
        toast.error("Failed to update status");
      }
    });
  }

  function handleDelete() {
    startDelete(async () => {
      try {
        await deleteCampaign(campaign.id);
        toast.success("Campaign deleted");
        router.push("/campaigns");
      } catch {
        toast.error("Failed to delete campaign");
      }
    });
  }

  function handleSend() {
    startSend(async () => {
      try {
        const result = await sendCampaignStep(campaign.id);
        if (result.errors > 0) {
          toast.error(`${result.sent} sent, ${result.errors} failed`);
        } else {
          toast.success(`${result.sent} email${result.sent !== 1 ? "s" : ""} sent${result.skipped > 0 ? `, ${result.skipped} skipped` : ""}`);
        }
      } catch {
        toast.error("Failed to send emails");
      }
    });
  }

  function handleStatClick(key: string) {
    setStatusFilter((prev) => (prev === key ? null : key));
    setSelectedIds(new Set());
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === visibleEnrollments.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visibleEnrollments.map((e) => e.id)));
    }
  }

  function handleBulkUnenroll() {
    startBulk(async () => {
      try {
        const count = selectedIds.size;
        await bulkUnenrollLeads(campaign.id, Array.from(selectedIds));
        setSelectedIds(new Set());
        setBulkConfirmOpen(false);
        toast.success(`${count} lead${count !== 1 ? "s" : ""} unenrolled`);
      } catch {
        toast.error("Failed to unenroll leads");
      }
    });
  }

  function handleUnenroll(enrollmentId: string, leadName: string) {
    startUnenroll(async () => {
      try {
        await unenrollLead(enrollmentId);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(enrollmentId);
          return next;
        });
        toast.success(`${leadName} unenrolled`);
      } catch {
        toast.error("Failed to unenroll lead");
      }
    });
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back link */}
      <Link
        href="/campaigns"
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "no-underline -ml-2 text-muted-foreground"
        )}
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Campaigns
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                "text-xs font-medium border px-2 py-0.5 rounded-full",
                USE_CASE_COLORS[campaign.use_case] ??
                  "bg-muted text-muted-foreground border-border"
              )}
            >
              {USE_CASE_LABELS[campaign.use_case] ?? campaign.use_case}
            </span>
          </div>
          <h1 className="text-2xl font-semibold leading-tight">{campaign.name}</h1>
          {campaign.description && (
            <p className="text-sm text-muted-foreground">{campaign.description}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Created {fmtDate(campaign.created_at)}
          </p>
        </div>

        {/* Status + actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Select
            value={campaign.status}
            onValueChange={handleStatusChange}
            disabled={statusPending}
          >
            <SelectTrigger
              className={cn(
                "h-8 text-xs font-medium border rounded-full px-3 w-auto gap-1",
                CAMPAIGN_STATUS_STYLES[campaign.status]
              )}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              }
            />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete campaign?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete &ldquo;{campaign.name}&rdquo; and all its steps and
                  enrollments. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={deletePending}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="sequence">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="sequence">
              Sequence
              <span className="ml-1.5 text-xs text-muted-foreground">
                ({campaign.campaign_steps.length})
              </span>
            </TabsTrigger>
            <TabsTrigger value="enrolled">
              Enrolled Leads
              <span className="ml-1.5 text-xs text-muted-foreground">
                ({enrollments.length})
              </span>
            </TabsTrigger>
          </TabsList>

          {/* Enroll button lives outside tabs so it's always visible */}
          <EnrollmentDialog
            campaignId={campaign.id}
            availableLeads={availableLeads}
            allTags={allTags}
          />
        </div>

        {/* Sequence tab */}
        <TabsContent value="sequence">
          <SequenceBuilder
            campaignId={campaign.id}
            steps={campaign.campaign_steps}
            templates={templates}
            campaignUseCase={campaign.use_case}
          />
        </TabsContent>

        {/* Enrolled leads tab */}
        <TabsContent value="enrolled">
          {/* Stats row */}
          {enrollments.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
              {[
                { label: "Active", key: "active", color: "text-green-600" },
                { label: "Replied", key: "replied", color: "text-blue-600" },
                { label: "Completed", key: "completed", color: "text-muted-foreground" },
                { label: "Paused", key: "paused", color: "text-yellow-600" },
                { label: "Unsubscribed", key: "unsubscribed", color: "text-red-600" },
              ].map(({ label, key, color }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleStatClick(key)}
                  className={cn(
                    "rounded-lg border bg-card p-3 text-center w-full transition-colors hover:bg-muted/50",
                    statusFilter === key && "ring-2 ring-primary border-primary bg-primary/5"
                  )}
                >
                  <p className={cn("text-xl font-bold", color)}>
                    {stats[key] ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                </button>
              ))}
            </div>
          )}

          {enrollments.length > 0 && (
            <div className="flex items-center gap-2 justify-end mb-3">
              {selectedIds.size > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setBulkConfirmOpen(true)}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Remove Selected ({selectedIds.size})
                </Button>
              )}
              <Button
                size="sm"
                disabled={activeCount === 0 || sendPending || campaign.status !== "active"}
                onClick={handleSend}
              >
                <Send className="h-3.5 w-3.5 mr-1.5" />
                {sendPending ? "Sending…" : `Send Next Step${activeCount > 0 ? ` (${activeCount})` : ""}`}
              </Button>
            </div>
          )}

          {statusFilter && (
            <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
              <span>
                Showing {visibleEnrollments.length} {statusFilter} lead{visibleEnrollments.length !== 1 ? "s" : ""}
              </span>
              <button
                type="button"
                onClick={() => { setStatusFilter(null); setSelectedIds(new Set()); }}
                className="text-primary hover:underline"
              >
                Clear filter
              </button>
            </div>
          )}

          {enrollments.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center">
              <p className="text-sm text-muted-foreground">No leads enrolled yet.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Use the &ldquo;Enroll Leads&rdquo; button above to add leads to this campaign.
              </p>
            </div>
          ) : visibleEnrollments.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center">
              <p className="text-sm text-muted-foreground capitalize">No {statusFilter} leads.</p>
              <button
                type="button"
                onClick={() => setStatusFilter(null)}
                className="text-xs text-primary hover:underline mt-1 block mx-auto"
              >
                Show all leads
              </button>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="w-10 px-4 py-2.5">
                      <Checkbox
                        checked={allSelected}
                        indeterminate={someSelected}
                        onCheckedChange={toggleSelectAll}
                      />
                    </th>
                    <th className="text-left px-4 py-2.5 font-medium text-xs text-muted-foreground">
                      Lead
                    </th>
                    <th className="text-left px-4 py-2.5 font-medium text-xs text-muted-foreground hidden sm:table-cell">
                      Company
                    </th>
                    <th className="text-left px-4 py-2.5 font-medium text-xs text-muted-foreground">
                      Step
                    </th>
                    <th className="text-left px-4 py-2.5 font-medium text-xs text-muted-foreground">
                      Status
                    </th>
                    <th className="text-left px-4 py-2.5 font-medium text-xs text-muted-foreground hidden md:table-cell">
                      Enrolled
                    </th>
                    <th className="w-10 px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody
                  className={cn(
                    (unenrollPending || bulkPending) && "opacity-60 pointer-events-none"
                  )}
                >
                  {visibleEnrollments.map((enrollment) => {
                    const lead = enrollment.leads;
                    const name = lead
                      ? `${lead.first_name} ${lead.last_name}`
                      : "Unknown";
                    return (
                      <tr
                        key={enrollment.id}
                        className="border-b last:border-b-0 hover:bg-muted/30"
                      >
                        <td className="px-4 py-3">
                          <Checkbox
                            checked={selectedIds.has(enrollment.id)}
                            onCheckedChange={() => toggleSelect(enrollment.id)}
                          />
                        </td>
                        <td className="px-4 py-3">
                          {lead ? (
                            <Link
                              href={`/leads/${lead.id}`}
                              className="font-medium hover:underline"
                            >
                              {name}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">{name}</span>
                          )}
                          <div className="text-xs text-muted-foreground">{lead?.email}</div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                          {lead?.company_name ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          Step {enrollment.current_step}
                        </td>
                        <td className="px-4 py-3">
                          <EnrollmentStatusBadge status={enrollment.status} />
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">
                          {fmtShort(enrollment.enrolled_at)}
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            title="Unenroll"
                            onClick={() => handleUnenroll(enrollment.id, name)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AlertDialog open={bulkConfirmOpen} onOpenChange={setBulkConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove {selectedIds.size} lead{selectedIds.size !== 1 ? "s" : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will unenroll {selectedIds.size} lead{selectedIds.size !== 1 ? "s" : ""} from
              this campaign. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkUnenroll}
              disabled={bulkPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkPending ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
