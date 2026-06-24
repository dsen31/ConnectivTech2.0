"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { updateEmailSignature } from "@/app/actions/settings";
import { toast } from "sonner";

interface SignatureFormProps {
  initialValue: string;
}

export function SignatureForm({ initialValue }: SignatureFormProps) {
  const [value, setValue] = useState(initialValue);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      try {
        await updateEmailSignature(value);
        toast.success("Signature saved");
      } catch {
        toast.error("Failed to save signature");
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Email Signature</Label>
        <p className="text-xs text-muted-foreground">
          Appended to the bottom of every outgoing email.
        </p>
      </div>
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={6}
        className="font-mono text-sm resize-y"
        placeholder="Your name&#10;Company&#10;email@example.com"
      />
      <div className="flex justify-end">
        <Button size="sm" onClick={handleSave} disabled={isPending}>
          {isPending ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
