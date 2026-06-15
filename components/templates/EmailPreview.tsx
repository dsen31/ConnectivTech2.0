"use client";

import { PREVIEW_LEAD, resolveTokens, extractTokens } from "@/lib/tokens";
import { cn } from "@/lib/utils";

interface EmailPreviewProps {
  subject: string;
  body: string;
  className?: string;
}

export function EmailPreview({ subject, body, className }: EmailPreviewProps) {
  const resolved = {
    subject: resolveTokens(subject, PREVIEW_LEAD, {
      sender_name: "Your Name",
      calendar_link: "https://cal.com/yourname/15min",
    }),
    body: resolveTokens(body, PREVIEW_LEAD, {
      sender_name: "Your Name",
      calendar_link: "https://cal.com/yourname/15min",
    }),
  };

  const usedTokens = [
    ...new Set([...extractTokens(subject), ...extractTokens(body)]),
  ];

  return (
    <div className={cn("space-y-3", className)}>
      <div className="rounded-lg border bg-card overflow-hidden shadow-sm">
        {/* Mock email header */}
        <div className="border-b px-4 py-3 bg-muted/30 space-y-1">
          <div className="text-xs text-muted-foreground">
            <span className="font-medium">To: </span>alex.johnson@acmecorp.com
          </div>
          <div className="text-xs text-muted-foreground">
            <span className="font-medium">From: </span>Your Name
          </div>
          <div className="text-xs">
            <span className="font-medium text-muted-foreground">Subject: </span>
            <span className="font-semibold">
              {resolved.subject || (
                <span className="text-muted-foreground italic font-normal">
                  (no subject)
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Email body */}
        <div className="px-4 py-4 text-sm whitespace-pre-wrap leading-relaxed min-h-40 font-sans">
          {resolved.body || (
            <span className="text-muted-foreground italic">
              Start typing to see the preview…
            </span>
          )}
        </div>
      </div>

      {/* Token list + sample data notice */}
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">
          Preview using:{" "}
          <span className="font-medium text-foreground">
            Alex Johnson · Acme Corp · Manufacturing · Operations Manager
          </span>
        </p>
        {usedTokens.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {usedTokens.map((t) => (
              <span
                key={t}
                className="inline-flex items-center px-1.5 py-0.5 rounded bg-primary/10 text-primary text-xs font-mono"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
