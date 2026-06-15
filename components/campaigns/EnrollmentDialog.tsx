"use client";

import { useState, useTransition, useMemo } from "react";
import { UserPlus, Search, X, Check, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { bulkEnrollLeads } from "@/app/actions/campaigns";
import type { LeadWithTags, Tag } from "@/types";
import { extractTags } from "@/types";

interface EnrollmentDialogProps {
  campaignId: string;
  availableLeads: LeadWithTags[];
  allTags: Tag[];
}

export function EnrollmentDialog({
  campaignId,
  availableLeads,
  allTags,
}: EnrollmentDialogProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [enrolling, startEnroll] = useTransition();

  const filtered = useMemo(() => {
    let leads = availableLeads;

    if (tagFilter !== "all") {
      leads = leads.filter((l) =>
        extractTags(l).some((t) => t.id === tagFilter)
      );
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      leads = leads.filter(
        (l) =>
          l.first_name.toLowerCase().includes(q) ||
          l.last_name.toLowerCase().includes(q) ||
          l.email.toLowerCase().includes(q) ||
          (l.company_name?.toLowerCase().includes(q) ?? false)
      );
    }

    return leads;
  }, [availableLeads, search, tagFilter]);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((l) => selected.has(l.id));

  function toggleAll() {
    if (allFilteredSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((l) => next.delete(l.id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((l) => next.add(l.id));
        return next;
      });
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleEnroll() {
    const ids = Array.from(selected);
    startEnroll(async () => {
      try {
        const result = await bulkEnrollLeads(campaignId, ids);
        toast.success(
          `Enrolled ${result.enrolled} lead${result.enrolled !== 1 ? "s" : ""}` +
            (result.skipped > 0 ? ` · ${result.skipped} already enrolled` : "")
        );
        setOpen(false);
        setSelected(new Set());
        setSearch("");
        setTagFilter("all");
      } catch {
        toast.error("Failed to enroll leads");
      }
    });
  }

  function handleOpenChange(val: boolean) {
    if (!val) {
      setSelected(new Set());
      setSearch("");
      setTagFilter("all");
    }
    setOpen(val);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button size="sm">
            <UserPlus className="h-4 w-4 mr-1.5" />
            Enroll Leads
          </Button>
        }
      />
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-4 border-b shrink-0">
          <DialogTitle>Enroll Leads</DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {availableLeads.length} lead{availableLeads.length !== 1 ? "s" : ""} available to enroll
          </p>
        </DialogHeader>

        {/* Filters */}
        <div className="px-5 py-3 border-b space-y-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search leads…"
              className="pl-8 h-8 text-sm"
            />
          </div>
          {allTags.length > 0 && (
            <Select
              value={tagFilter}
              onValueChange={(v) => setTagFilter(v ?? "all")}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Filter by tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tags</SelectItem>
                {allTags.map((tag) => (
                  <SelectItem key={tag.id} value={tag.id}>
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: tag.color }}
                      />
                      {tag.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Select all row */}
        {filtered.length > 0 && (
          <button
            onClick={toggleAll}
            className="flex items-center gap-3 px-5 py-2.5 border-b text-sm hover:bg-muted/50 text-left shrink-0"
          >
            <span
              className={cn(
                "h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                allFilteredSelected
                  ? "bg-primary border-primary"
                  : "border-muted-foreground/30 bg-background"
              )}
            >
              {allFilteredSelected && <Check className="h-3 w-3 text-primary-foreground" />}
            </span>
            <span className="font-medium">
              Select all ({filtered.length})
            </span>
          </button>
        )}

        {/* Lead list */}
        <div className="overflow-y-auto flex-1">
          {filtered.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-muted-foreground">No leads match your filters.</p>
            </div>
          ) : (
            filtered.map((lead) => {
              const isSelected = selected.has(lead.id);
              return (
                <button
                  key={lead.id}
                  onClick={() => toggle(lead.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-muted/50 border-b last:border-b-0",
                    isSelected && "bg-primary/5"
                  )}
                >
                  <span
                    className={cn(
                      "h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                      isSelected
                        ? "bg-primary border-primary"
                        : "border-muted-foreground/30 bg-background"
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium truncate">
                      {lead.first_name} {lead.last_name}
                    </span>
                    <span className="block text-xs text-muted-foreground truncate">
                      {lead.email}
                      {lead.company_name && ` · ${lead.company_name}`}
                    </span>
                    {(lead.campaign_leads?.length ?? 0) > 0 && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground/70 mt-0.5">
                        <Mail className="h-3 w-3 shrink-0" />
                        {lead.campaign_leads!.length === 1
                          ? "In 1 other campaign"
                          : `In ${lead.campaign_leads!.length} other campaigns`}
                      </span>
                    )}
                  </span>
                  {extractTags(lead).length > 0 && (
                    <span className="flex gap-1 shrink-0">
                      {extractTags(lead)
                        .slice(0, 2)
                        .map((tag) => (
                          <span
                            key={tag.id}
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: tag.color }}
                            title={tag.name}
                          />
                        ))}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t flex items-center justify-between shrink-0 bg-background">
          <p className="text-sm text-muted-foreground">
            {selected.size > 0 ? (
              <>
                <span className="font-medium text-foreground">{selected.size}</span>{" "}
                lead{selected.size !== 1 ? "s" : ""} selected
              </>
            ) : (
              "No leads selected"
            )}
          </p>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOpenChange(false)}
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={selected.size === 0 || enrolling}
              onClick={handleEnroll}
            >
              <UserPlus className="h-3.5 w-3.5 mr-1" />
              Enroll {selected.size > 0 ? selected.size : ""}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
