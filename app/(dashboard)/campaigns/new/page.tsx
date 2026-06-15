"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { createCampaign } from "@/app/actions/campaigns";
import { USE_CASE_LABELS } from "@/types";

const USE_CASE_OPTIONS = [
  { value: "telecom", label: "Telecom Savings" },
  { value: "vendor-vetting", label: "Vendor Vetting" },
  { value: "fractional-cto", label: "Fractional CTO" },
  { value: "compliance", label: "Compliance" },
  { value: "it-audit", label: "IT Audit" },
];

export default function NewCampaignPage() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [useCase, setUseCase] = useState("");
  const [description, setDescription] = useState("");
  const [fromName, setFromName] = useState("");
  const [fromEmail, setFromEmail] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !useCase) {
      toast.error("Name and use case are required");
      return;
    }

    startTransition(async () => {
      try {
        const campaign = await createCampaign({
          name: name.trim(),
          use_case: useCase,
          description: description.trim() || null,
          from_name: fromName.trim() || null,
          from_email: fromEmail.trim() || null,
          status: "draft",
        });
        toast.success("Campaign created");
        router.push(`/campaigns/${campaign.id}`);
      } catch {
        toast.error("Failed to create campaign");
      }
    });
  }

  return (
    <div className="max-w-xl">
      <Link
        href="/campaigns"
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "no-underline -ml-2 text-muted-foreground mb-5 inline-flex"
        )}
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Campaigns
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold">New Campaign</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Set up your outbound sequence details
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="name">
            Campaign name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Q1 Fractional CTO Outreach"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="use-case">
            Use case <span className="text-destructive">*</span>
          </Label>
          <Select value={useCase} onValueChange={(v) => setUseCase(v ?? useCase)}>
            <SelectTrigger id="use-case">
              <SelectValue placeholder="Select a use case…" />
            </SelectTrigger>
            <SelectContent>
              {USE_CASE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Determines which email templates are suggested when building your sequence.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional notes about this campaign's goal or target audience"
            rows={3}
            className="resize-none"
          />
        </div>

        <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
          <div>
            <p className="text-sm font-medium">Sender details</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Used when Phase 2 email sending is enabled.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="from-name" className="text-xs">
                From name
              </Label>
              <Input
                id="from-name"
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                placeholder="Dustin Señor"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="from-email" className="text-xs">
                From email
              </Label>
              <Input
                id="from-email"
                type="email"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                placeholder="dustin@example.com"
                className="h-8 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={!name.trim() || !useCase || pending}>
            Create Campaign
          </Button>
          <Link
            href="/campaigns"
            className={cn(buttonVariants({ variant: "ghost" }), "no-underline")}
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
