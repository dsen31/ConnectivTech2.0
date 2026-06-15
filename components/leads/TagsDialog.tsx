"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Trash2, Plus } from "lucide-react";
import { createTag, deleteTag } from "@/app/actions/tags";
import { type Tag, TAG_PALETTE } from "@/types";
import { toast } from "sonner";

interface TagsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tags: Tag[];
  onTagsChange: () => void;
}

export function TagsDialog({ open, onOpenChange, tags, onTagsChange }: TagsDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(TAG_PALETTE[0]);
  const [deleteTarget, setDeleteTarget] = useState<Tag | null>(null);

  function handleCreate() {
    if (!newName.trim()) return;
    startTransition(async () => {
      try {
        await createTag(newName.trim(), newColor);
        setNewName("");
        setNewColor(TAG_PALETTE[0]);
        onTagsChange();
        toast.success(`Tag "${newName.trim()}" created`);
      } catch {
        toast.error("Failed to create tag");
      }
    });
  }

  function handleDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      try {
        await deleteTag(deleteTarget.id);
        onTagsChange();
        toast.success(`Tag "${deleteTarget.name}" deleted`);
      } catch {
        toast.error("Failed to delete tag");
      } finally {
        setDeleteTarget(null);
      }
    });
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Manage Tags</DialogTitle>
          </DialogHeader>

          {/* Existing tags */}
          <div className="space-y-1 max-h-52 overflow-y-auto">
            {tags.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No tags yet. Create one below.
              </p>
            ) : (
              tags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-accent group"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="text-sm">{tag.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteTarget(tag)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))
            )}
          </div>

          <Separator />

          {/* Create new tag */}
          <div className="space-y-3">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              New Tag
            </Label>
            <Input
              placeholder="Tag name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              maxLength={30}
            />
            <div>
              <Label className="text-xs text-muted-foreground">Color</Label>
              <div className="flex gap-2 mt-1.5 flex-wrap">
                {TAG_PALETTE.map((color) => (
                  <button
                    key={color}
                    className="h-6 w-6 rounded-full ring-offset-2 transition-all"
                    style={{
                      backgroundColor: color,
                      outline: newColor === color ? `2px solid ${color}` : "none",
                      outlineOffset: "2px",
                    }}
                    onClick={() => setNewColor(color)}
                  />
                ))}
              </div>
            </div>
            <Button
              className="w-full"
              size="sm"
              disabled={!newName.trim() || isPending}
              onClick={handleCreate}
            >
              <Plus className="h-4 w-4 mr-1" />
              Create Tag
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete tag?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the tag{" "}
              <strong>&ldquo;{deleteTarget?.name}&rdquo;</strong> from all leads.
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
