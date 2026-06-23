"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
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
import { Badge } from "@/components/ui/badge";
import {
  MoreHorizontal,
  Search,
  Upload,
  Tag as TagIcon,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  Copy,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { deleteLead, clearAllLeads } from "@/app/actions/leads";
import { TagsDialog } from "@/components/leads/TagsDialog";
import { NewLeadDialog } from "@/components/leads/NewLeadDialog";
import {
  type LeadWithTags,
  type Tag,
  extractTags,
  STATUS_STYLES,
  LEAD_STATUSES,
} from "@/types";
import { toast } from "sonner";

const PAGE_SIZE = 25;

interface LeadTableProps {
  leads: LeadWithTags[];
  tags: Tag[];
}

export function LeadTable({ leads, tags }: LeadTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [industryFilter, setIndustryFilter] = useState<string>("all");
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<LeadWithTags | null>(null);
  const [clearAllOpen, setClearAllOpen] = useState(false);
  const [tagsDialogOpen, setTagsDialogOpen] = useState(false);

  const industries = useMemo(
    () =>
      [...new Set(leads.map((l) => l.industry).filter(Boolean) as string[])].sort(),
    [leads]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return leads.filter((lead) => {
      if (q) {
        const matches =
          lead.first_name.toLowerCase().includes(q) ||
          lead.last_name.toLowerCase().includes(q) ||
          lead.email.toLowerCase().includes(q) ||
          (lead.company_name?.toLowerCase().includes(q) ?? false);
        if (!matches) return false;
      }
      if (statusFilter !== "all" && lead.status !== statusFilter) return false;
      if (industryFilter !== "all" && lead.industry !== industryFilter) return false;
      if (selectedTagIds.size > 0) {
        const leadTagIds = extractTags(lead).map((t) => t.id);
        if (!leadTagIds.some((id) => selectedTagIds.has(id))) return false;
      }
      return true;
    });
  }, [leads, search, statusFilter, industryFilter, selectedTagIds]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageLeads = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function resetPage() {
    setPage(0);
  }

  function toggleTag(tagId: string) {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) next.delete(tagId);
      else next.add(tagId);
      return next;
    });
    resetPage();
  }

  function handleDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      try {
        await deleteLead(deleteTarget.id);
        toast.success(`${deleteTarget.first_name} ${deleteTarget.last_name} deleted`);
        router.refresh();
      } catch {
        toast.error("Failed to delete lead");
      } finally {
        setDeleteTarget(null);
      }
    });
  }

  function handleClearAll() {
    startTransition(async () => {
      try {
        await clearAllLeads();
        toast.success("All leads deleted");
        router.refresh();
      } catch {
        toast.error("Failed to clear leads");
      } finally {
        setClearAllOpen(false);
      }
    });
  }

  // Trigger base class — matches Button outline sm
  const triggerCls = cn(
    buttonVariants({ variant: "outline", size: "sm" }),
    "cursor-default"
  );

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-48 max-w-xs">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search leads…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); resetPage(); }}
              className="pl-8"
            />
          </div>

          {/* Status filter */}
          <DropdownMenu>
            <DropdownMenuTrigger className={triggerCls}>
              {statusFilter === "all"
                ? "All statuses"
                : LEAD_STATUSES.find((s) => s.value === statusFilter)?.label}
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuCheckboxItem
                checked={statusFilter === "all"}
                onCheckedChange={() => { setStatusFilter("all"); resetPage(); }}
              >
                All statuses
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              {LEAD_STATUSES.map((s) => (
                <DropdownMenuCheckboxItem
                  key={s.value}
                  checked={statusFilter === s.value}
                  onCheckedChange={() => { setStatusFilter(s.value); resetPage(); }}
                >
                  {s.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Industry filter */}
          {industries.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger className={triggerCls}>
                {industryFilter === "all" ? "All industries" : industryFilter}
              </DropdownMenuTrigger>
              <DropdownMenuContent className="max-h-64 overflow-y-auto">
                <DropdownMenuCheckboxItem
                  checked={industryFilter === "all"}
                  onCheckedChange={() => { setIndustryFilter("all"); resetPage(); }}
                >
                  All industries
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                {industries.map((ind) => (
                  <DropdownMenuCheckboxItem
                    key={ind}
                    checked={industryFilter === ind}
                    onCheckedChange={() => { setIndustryFilter(ind); resetPage(); }}
                  >
                    {ind}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Tags filter */}
          {tags.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger className={triggerCls}>
                <TagIcon className="h-3.5 w-3.5 mr-1" />
                Tags
                {selectedTagIds.size > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                    {selectedTagIds.size}
                  </Badge>
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Filter by tag</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {tags.map((tag) => (
                  <DropdownMenuCheckboxItem
                    key={tag.id}
                    checked={selectedTagIds.has(tag.id)}
                    onCheckedChange={() => toggleTag(tag.id)}
                  >
                    <span
                      className="mr-2 inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    {tag.name}
                  </DropdownMenuCheckboxItem>
                ))}
                {selectedTagIds.size > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => setSelectedTagIds(new Set())}>
                      Clear tag filter
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setTagsDialogOpen(true)}>
            <TagIcon className="h-4 w-4 mr-1" />
            Manage Tags
          </Button>
          <NewLeadDialog />
          <Link
            href="/leads/import"
            className={cn(buttonVariants({ size: "sm" }), "no-underline")}
          >
            <Upload className="h-4 w-4 mr-1" />
            Import CSV
          </Link>
          {leads.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setClearAllOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Clear All
            </Button>
          )}
        </div>
      </div>

      {/* Count */}
      <p className="text-xs text-muted-foreground">
        {filtered.length === leads.length
          ? `${leads.length} leads`
          : `${filtered.length} of ${leads.length} leads`}
      </p>

      {/* Table */}
      {pageLeads.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-sm text-muted-foreground">
            {leads.length === 0
              ? "No leads yet. Import a CSV to get started."
              : "No leads match your filters."}
          </p>
          {leads.length === 0 && (
            <Link
              href="/leads/import"
              className={cn(buttonVariants({ size: "sm" }), "mt-4 inline-flex no-underline")}
            >
              Import CSV
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageLeads.map((lead) => {
                const leadTags = extractTags(lead);
                return (
                  <TableRow
                    key={lead.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/leads/${lead.id}`)}
                  >
                    <TableCell className="font-medium">
                      <span className="flex items-center gap-1.5">
                        {lead.first_name} {lead.last_name}
                        {(lead.campaign_leads?.length ?? 0) > 0 && (
                          <span
                            title={`Enrolled in ${lead.campaign_leads!.length} campaign${lead.campaign_leads!.length !== 1 ? "s" : ""}`}
                            className="inline-flex shrink-0"
                          >
                            <Mail className="h-3 w-3 text-blue-500" />
                          </span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {lead.email}
                    </TableCell>
                    <TableCell className="text-sm">
                      {lead.company_name ?? <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-sm">
                      {lead.industry ?? <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[lead.status]}`}
                      >
                        {lead.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 flex-wrap">
                        {leadTags.slice(0, 2).map((tag) => (
                          <span
                            key={tag.id}
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: tag.color + "20",
                              color: tag.color,
                              border: `1px solid ${tag.color}40`,
                            }}
                          >
                            {tag.name}
                          </span>
                        ))}
                        {leadTags.length > 2 && (
                          <span className="text-xs text-muted-foreground">
                            +{leadTags.length - 2}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell
                      className="text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className={cn(
                            buttonVariants({ variant: "ghost", size: "sm" }),
                            "h-7 w-7 p-0"
                          )}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onSelect={() => router.push(`/leads/${lead.id}`)}
                          >
                            <Pencil className="h-3.5 w-3.5 mr-2" />
                            View / Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => {
                              navigator.clipboard.writeText(lead.email);
                              toast.success("Email copied");
                            }}
                          >
                            <Copy className="h-3.5 w-3.5 mr-2" />
                            Copy email
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onSelect={() => setDeleteTarget(lead)}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Clear all confirmation */}
      <AlertDialog open={clearAllOpen} onOpenChange={setClearAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all leads?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all{" "}
              <strong>{leads.length} lead{leads.length !== 1 ? "s" : ""}</strong> and remove them
              from all campaigns and the pipeline. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleClearAll}
              disabled={isPending}
            >
              {isPending ? "Deleting…" : "Delete all leads"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete lead?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <strong>
                {deleteTarget?.first_name} {deleteTarget?.last_name}
              </strong>{" "}
              and remove them from all campaigns. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Tags management dialog */}
      <TagsDialog
        open={tagsDialogOpen}
        onOpenChange={setTagsDialogOpen}
        tags={tags}
        onTagsChange={() => router.refresh()}
      />
    </>
  );
}
