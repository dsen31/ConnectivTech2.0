"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { ChevronLeft, Save, Trash2 } from "lucide-react";
import {
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from "@/app/actions/templates";
import { EmailPreview } from "@/components/templates/EmailPreview";
import { AVAILABLE_TOKENS, extractTokens } from "@/lib/tokens";
import type { EmailTemplate } from "@/lib/supabase/types";
import { USE_CASE_LABELS } from "@/types";
import { toast } from "sonner";

interface TemplateEditorProps {
  template?: EmailTemplate;
}

export function TemplateEditor({ template }: TemplateEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showDelete, setShowDelete] = useState(false);

  const [name, setName] = useState(template?.name ?? "");
  const [useCase, setUseCase] = useState<string>(
    template?.use_case ?? "telecom"
  );
  const [subject, setSubject] = useState(template?.subject ?? "");
  const [body, setBody] = useState(template?.body_text ?? "");

  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [activeField, setActiveField] = useState<"subject" | "body">("body");

  function insertToken(token: string) {
    if (activeField === "subject") {
      const el = subjectRef.current;
      if (!el) return;
      const s = el.selectionStart ?? subject.length;
      const e = el.selectionEnd ?? subject.length;
      const next = subject.slice(0, s) + token + subject.slice(e);
      setSubject(next);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(s + token.length, s + token.length);
      });
    } else {
      const el = bodyRef.current;
      if (!el) return;
      const s = el.selectionStart ?? body.length;
      const e = el.selectionEnd ?? body.length;
      const next = body.slice(0, s) + token + body.slice(e);
      setBody(next);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(s + token.length, s + token.length);
      });
    }
  }

  function handleSave() {
    if (!name.trim() || !subject.trim() || !body.trim()) {
      toast.error("Name, subject, and body are all required");
      return;
    }
    const tokens = extractTokens(`${subject} ${body}`);
    startTransition(async () => {
      try {
        if (template?.id) {
          await updateTemplate(template.id, {
            name: name.trim(),
            use_case: useCase as EmailTemplate["use_case"],
            subject: subject.trim(),
            body_text: body.trim(),
            tokens_used: tokens,
          });
          toast.success("Template saved");
          router.refresh();
        } else {
          const created = await createTemplate({
            name: name.trim(),
            use_case: useCase as EmailTemplate["use_case"],
            subject: subject.trim(),
            body_text: body.trim(),
            tokens_used: tokens,
          });
          toast.success("Template created");
          router.push(`/templates/${created.id}`);
        }
      } catch {
        toast.error("Failed to save template");
      }
    });
  }

  function handleDelete() {
    if (!template?.id) return;
    startTransition(async () => {
      try {
        await deleteTemplate(template.id);
        toast.success("Template deleted");
        router.push("/templates");
      } catch {
        toast.error("Failed to delete template");
      }
    });
  }

  const editorPanel = (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="subject">Subject Line</Label>
        <Input
          id="subject"
          ref={subjectRef}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          onFocus={() => setActiveField("subject")}
          placeholder="e.g. Quick question about {{company_name}}'s tech costs"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="body">Email Body</Label>
        <Textarea
          id="body"
          ref={bodyRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onFocus={() => setActiveField("body")}
          rows={22}
          placeholder="Write your email copy here. Use {{tokens}} for personalization."
          className="font-mono text-sm resize-none leading-relaxed"
        />
      </div>
    </div>
  );

  return (
    <>
      <div className="space-y-5 max-w-6xl">
        {/* Back link */}
        <Link
          href="/templates"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to templates
        </Link>

        {/* Name + use case row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="name">Template Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Telecom — Step 1: Quick question"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Use Case</Label>
            <Select
              value={useCase}
              onValueChange={(v) => setUseCase(v ?? useCase)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(USE_CASE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Token insertion bar */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            Insert token — click into subject or body first, then click a token:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {AVAILABLE_TOKENS.map(({ token, label }) => (
              <button
                key={token}
                type="button"
                title={label}
                onClick={() => insertToken(token)}
                className="inline-flex items-center px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-mono hover:bg-primary/20 transition-colors border border-primary/20"
              >
                {token}
              </button>
            ))}
          </div>
        </div>

        {/* Desktop: side-by-side editor + preview */}
        <div className="hidden lg:grid lg:grid-cols-[1fr_420px] gap-6 items-start">
          {editorPanel}
          <div className="space-y-2 sticky top-6">
            <Label>Live Preview</Label>
            <EmailPreview subject={subject} body={body} />
          </div>
        </div>

        {/* Mobile: tabbed */}
        <div className="lg:hidden">
          <Tabs defaultValue="edit">
            <TabsList className="w-full">
              <TabsTrigger value="edit" className="flex-1">
                Edit
              </TabsTrigger>
              <TabsTrigger value="preview" className="flex-1">
                Preview
              </TabsTrigger>
            </TabsList>
            <TabsContent value="edit" className="mt-4">
              {editorPanel}
            </TabsContent>
            <TabsContent value="preview" className="mt-4">
              <EmailPreview subject={subject} body={body} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer actions */}
        <Separator />
        <div className="flex items-center justify-between pb-6">
          {template?.id ? (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive border-destructive/30 hover:bg-destructive/5"
              onClick={() => setShowDelete(true)}
              disabled={isPending}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          ) : (
            <div />
          )}
          <Button onClick={handleSave} disabled={isPending}>
            <Save className="h-4 w-4 mr-1" />
            {isPending
              ? "Saving…"
              : template?.id
              ? "Save changes"
              : "Create template"}
          </Button>
        </div>
      </div>

      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this template?</AlertDialogTitle>
            <AlertDialogDescription>
              Deleting <strong>&ldquo;{template?.name}&rdquo;</strong> will
              remove it from any campaign steps that use it. This cannot be
              undone.
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
