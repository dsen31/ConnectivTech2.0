"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { updateLeadPipelineStage } from "@/app/actions/leads";
import type { PipelineEntryWithLead, PipelineStage } from "@/types";
import {
  PIPELINE_STAGES,
  PIPELINE_STAGE_LABELS,
  PIPELINE_STAGE_COLORS,
  STATUS_STYLES,
} from "@/types";

type ColumnMap = Record<PipelineStage, PipelineEntryWithLead[]>;

interface KanbanBoardProps {
  initialColumns: ColumnMap;
}

const COLUMN_DOT_COLORS: Record<PipelineStage, string> = {
  new: "bg-zinc-400",
  contacted: "bg-blue-500",
  replied: "bg-indigo-500",
  call_booked: "bg-violet-500",
  introduced: "bg-purple-500",
  closed_won: "bg-green-500",
  closed_lost: "bg-red-500",
};

const COLUMN_DROP_HIGHLIGHT: Record<PipelineStage, string> = {
  new: "border-zinc-400 bg-zinc-50",
  contacted: "border-blue-400 bg-blue-50/50",
  replied: "border-indigo-400 bg-indigo-50/50",
  call_booked: "border-violet-400 bg-violet-50/50",
  introduced: "border-purple-400 bg-purple-50/50",
  closed_won: "border-green-400 bg-green-50/50",
  closed_lost: "border-red-400 bg-red-50/50",
};

// ── Card ──────────────────────────────────────────────────────────────────────

interface KanbanCardProps {
  entry: PipelineEntryWithLead;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent, entryId: string, leadId: string, stage: PipelineStage) => void;
  onDragEnd: () => void;
}

function KanbanCard({ entry, isDragging, onDragStart, onDragEnd }: KanbanCardProps) {
  const lead = entry.leads;
  if (!lead) return null;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, entry.id, entry.lead_id, entry.stage as PipelineStage)}
      onDragEnd={onDragEnd}
      className={cn(
        "rounded-lg border bg-card p-3 cursor-grab active:cursor-grabbing select-none",
        "transition-all duration-150 hover:shadow-sm hover:border-primary/30",
        isDragging && "opacity-40 ring-2 ring-primary/20"
      )}
    >
      <Link
        href={`/leads/${lead.id}`}
        className="block no-underline"
        onClick={(e) => {
          // Prevent navigation when dragging
          if (isDragging) e.preventDefault();
        }}
        draggable={false}
      >
        <p className="text-sm font-medium text-foreground leading-snug">
          {lead.first_name} {lead.last_name}
        </p>
        {lead.company_name && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{lead.company_name}</p>
        )}
        {lead.job_title && (
          <p className="text-xs text-muted-foreground truncate">{lead.job_title}</p>
        )}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {lead.industry && (
            <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
              {lead.industry}
            </span>
          )}
          <span
            className={cn(
              "text-xs border px-1.5 py-0.5 rounded capitalize",
              STATUS_STYLES[lead.status] ?? "bg-muted text-muted-foreground border-border"
            )}
          >
            {lead.status}
          </span>
        </div>
      </Link>
    </div>
  );
}

// ── Column ────────────────────────────────────────────────────────────────────

interface KanbanColumnProps {
  stage: PipelineStage;
  cards: PipelineEntryWithLead[];
  draggingEntryId: string | null;
  isOver: boolean;
  onDragStart: KanbanCardProps["onDragStart"];
  onDragEnd: () => void;
  onDragEnter: (stage: PipelineStage) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, stage: PipelineStage) => void;
}

function KanbanColumn({
  stage,
  cards,
  draggingEntryId,
  isOver,
  onDragStart,
  onDragEnd,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
}: KanbanColumnProps) {
  return (
    <div className="flex flex-col w-64 shrink-0">
      {/* Column header */}
      <div className="flex items-center gap-2 px-1 mb-2">
        <span className={cn("h-2 w-2 rounded-full shrink-0", COLUMN_DOT_COLORS[stage])} />
        <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
          {PIPELINE_STAGE_LABELS[stage]}
        </span>
        <span className="ml-auto text-xs text-muted-foreground font-medium tabular-nums">
          {cards.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        onDragEnter={() => onDragEnter(stage)}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={(e) => onDrop(e, stage)}
        className={cn(
          "flex-1 min-h-[200px] rounded-lg border-2 border-dashed p-2 space-y-2 transition-colors duration-150",
          isOver
            ? COLUMN_DROP_HIGHLIGHT[stage]
            : "border-border/50 bg-muted/20"
        )}
      >
        {cards.map((entry) => (
          <KanbanCard
            key={entry.id}
            entry={entry}
            isDragging={draggingEntryId === entry.id}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
        ))}
        {cards.length === 0 && (
          <div className="h-full flex items-center justify-center">
            <p className="text-xs text-muted-foreground/50 select-none">Drop here</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Board ─────────────────────────────────────────────────────────────────────

export function KanbanBoard({ initialColumns }: KanbanBoardProps) {
  const [columns, setColumns] = useState<ColumnMap>(initialColumns);
  const [dragging, setDragging] = useState<{
    entryId: string;
    leadId: string;
    fromStage: PipelineStage;
  } | null>(null);
  const [dragOver, setDragOver] = useState<PipelineStage | null>(null);
  const [, startTransition] = useTransition();

  // Sync when server revalidates
  useEffect(() => {
    setColumns(initialColumns);
  }, [initialColumns]);

  const handleDragStart = useCallback(
    (e: React.DragEvent, entryId: string, leadId: string, stage: PipelineStage) => {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData(
        "application/json",
        JSON.stringify({ entryId, leadId, fromStage: stage })
      );
      setDragging({ entryId, leadId, fromStage: stage });
    },
    []
  );

  const handleDragEnd = useCallback(() => {
    setDragging(null);
    setDragOver(null);
  }, []);

  const handleDragEnter = useCallback((stage: PipelineStage) => {
    setDragOver(stage);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOver(null);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, toStage: PipelineStage) => {
      e.preventDefault();
      setDragOver(null);
      setDragging(null);

      let payload: { entryId: string; leadId: string; fromStage: PipelineStage };
      try {
        payload = JSON.parse(e.dataTransfer.getData("application/json"));
      } catch {
        return;
      }

      const { entryId, leadId, fromStage } = payload;
      if (fromStage === toStage) return;

      // Optimistic update
      setColumns((prev) => {
        const entry = prev[fromStage]?.find((c) => c.id === entryId);
        if (!entry) return prev;
        return {
          ...prev,
          [fromStage]: prev[fromStage].filter((c) => c.id !== entryId),
          [toStage]: [
            { ...entry, stage: toStage },
            ...(prev[toStage] ?? []),
          ],
        };
      });

      // Server action
      startTransition(async () => {
        try {
          await updateLeadPipelineStage(leadId, toStage);
        } catch {
          // Revert
          setColumns(initialColumns);
          toast.error("Failed to move card — please try again");
        }
      });
    },
    [initialColumns, startTransition]
  );

  const totalCards = PIPELINE_STAGES.reduce((sum, s) => sum + (columns[s]?.length ?? 0), 0);

  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">
        {totalCards} lead{totalCards !== 1 ? "s" : ""} in pipeline
      </p>
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-3" style={{ minWidth: `${PIPELINE_STAGES.length * 256 + (PIPELINE_STAGES.length - 1) * 12}px` }}>
          {PIPELINE_STAGES.map((stage) => (
            <KanbanColumn
              key={stage}
              stage={stage}
              cards={columns[stage] ?? []}
              draggingEntryId={dragging?.entryId ?? null}
              isOver={dragOver === stage}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
