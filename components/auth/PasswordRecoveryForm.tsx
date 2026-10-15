"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export function PasswordRecoveryForm() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const { error } = await createClient().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/recovery`,
      });
      if (error) {
        setError("We couldn't send a reset link. Please wait a moment and try again.");
      } else {
        setSent(true);
      }
    } catch {
      setError("We couldn't connect. Please check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      {sent ? (
        <p role="status" className="text-sm">If an account exists for that email, you’ll receive a reset link. Check your inbox and spam folder, and open the link in this browser.</p>
      ) : (
        <form onSubmit={requestReset} className="space-y-4">
          <label className="block text-sm font-medium">Email
            <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2" />
          </label>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <button type="submit" disabled={pending} className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">{pending ? "Sending…" : "Send reset link"}</button>
        </form>
      )}
      <Link href="/login" className="block text-sm text-primary underline underline-offset-4">Back to sign in</Link>
    </div>
  );
}
