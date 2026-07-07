"use client";

import { useState, useTransition } from "react";
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
import { sendTestEmail } from "@/app/actions/email";
import { toast } from "sonner";

export function SendTestEmailDialog() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("dustin@actoradvisory.com");
  const [isPending, startTransition] = useTransition();

  function handleSend() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error("Invalid email address");
      return;
    }
    startTransition(async () => {
      try {
        await sendTestEmail(email.trim());
        toast.success(`Test email sent to ${email.trim()}`);
        setOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to send test email");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Send Test Email
      </Button>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Test Email</DialogTitle>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label>Email Address</Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
          />
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={isPending} />}>
            Cancel
          </DialogClose>
          <Button onClick={handleSend} disabled={isPending}>
            {isPending ? "Sending…" : "Send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
