"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { updateEmailSignature, updateDailySendLimit } from "@/app/actions/settings";
import { toast } from "sonner";

interface SignatureFormProps {
  initialSignature: string;
  initialDailyLimit: number;
}

export function SignatureForm({ initialSignature, initialDailyLimit }: SignatureFormProps) {
  const [signature, setSignature] = useState(initialSignature);
  const [dailyLimit, setDailyLimit] = useState(String(initialDailyLimit));
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    const parsed = parseInt(dailyLimit, 10);
    if (isNaN(parsed) || parsed < 1) {
      toast.error("Daily send limit must be a positive number");
      return;
    }
    startTransition(async () => {
      try {
        await Promise.all([
          updateEmailSignature(signature),
          updateDailySendLimit(parsed),
        ]);
        toast.success("Settings saved");
      } catch {
        toast.error("Failed to save settings");
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label>Daily Send Limit</Label>
          <p className="text-xs text-muted-foreground">
            Maximum number of emails sent per day across all campaigns.
          </p>
        </div>
        <Input
          type="number"
          min={1}
          max={1000}
          value={dailyLimit}
          onChange={(e) => setDailyLimit(e.target.value)}
          className="w-32"
        />
      </div>

      <Separator />

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label>Email Signature</Label>
          <p className="text-xs text-muted-foreground">
            Appended to the bottom of every outgoing email.
          </p>
        </div>
        <Textarea
          value={signature}
          onChange={(e) => setSignature(e.target.value)}
          rows={6}
          className="font-mono text-sm resize-y"
          placeholder="Your name&#10;Company&#10;email@example.com"
        />
      </div>

      <div className="flex justify-end">
        <Button size="sm" onClick={handleSave} disabled={isPending}>
          {isPending ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
