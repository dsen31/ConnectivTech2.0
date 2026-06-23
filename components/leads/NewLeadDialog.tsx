"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createLead } from "@/app/actions/leads";
import { toast } from "sonner";

const EMPTY_FORM = {
  first_name: "",
  last_name: "",
  email: "",
  company_name: "",
  job_title: "",
  industry: "",
  phone: "",
  linkedin_url: "",
};

export function NewLeadDialog() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleOpenChange(next: boolean) {
    if (!next) setForm(EMPTY_FORM);
    setOpen(next);
  }

  function handleSubmit() {
    if (!form.first_name.trim()) { toast.error("First name is required"); return; }
    if (!form.last_name.trim()) { toast.error("Last name is required"); return; }
    if (!form.email.trim()) { toast.error("Email is required"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      toast.error("Invalid email address");
      return;
    }

    startTransition(async () => {
      try {
        await createLead({
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          email: form.email.trim(),
          company_name: form.company_name.trim() || null,
          job_title: form.job_title.trim() || null,
          industry: form.industry.trim() || null,
          phone: form.phone.trim() || null,
          linkedin_url: form.linkedin_url.trim() || null,
        });
        toast.success(`${form.first_name} ${form.last_name} added`);
        setOpen(false);
        setForm(EMPTY_FORM);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to add lead");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-1" />
        New Lead
      </Button>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Lead</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>
              First Name <span className="text-destructive">*</span>
            </Label>
            <Input
              value={form.first_name}
              onChange={(e) => set("first_name", e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>
              Last Name <span className="text-destructive">*</span>
            </Label>
            <Input
              value={form.last_name}
              onChange={(e) => set("last_name", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="Optional"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Company</Label>
            <Input
              value={form.company_name}
              onChange={(e) => set("company_name", e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Job Title</Label>
            <Input
              value={form.job_title}
              onChange={(e) => set("job_title", e.target.value)}
              placeholder="Optional"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Industry</Label>
            <Input
              value={form.industry}
              onChange={(e) => set("industry", e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="space-y-1.5">
            <Label>LinkedIn URL</Label>
            <Input
              value={form.linkedin_url}
              onChange={(e) => set("linkedin_url", e.target.value)}
              placeholder="https://linkedin.com/in/…"
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={isPending} />}>
            Cancel
          </DialogClose>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Saving…" : "Add Lead"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
