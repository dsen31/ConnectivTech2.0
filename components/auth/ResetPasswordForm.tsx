"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export function ResetPasswordForm({ validSession }: { validSession: boolean }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (password !== confirmation) {
      setError("Passwords don't match.");
      return;
    }
    setPending(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError(error.code === "weak_password" ? "Please choose a stronger password." : "We couldn't update your password. Try again or request a new reset link.");
        return;
      }
      // Clear the recovery session before returning to the normal sign-in flow.
      await supabase.auth.signOut({ scope: "local" });
      setDone(true);
    } catch {
      setError("We couldn't connect. Please check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  if (!validSession) return (
    <div className="space-y-4">
      <p role="alert" className="text-sm">This reset link is invalid or has expired. Request a new link and open it in the same browser where you requested it.</p>
      <Link href="/forgot-password" className="block text-sm text-primary underline underline-offset-4">Request a new reset link</Link>
    </div>
  );

  if (done) return (
    <div className="space-y-4">
      <p role="status" className="text-sm">Your password has been updated.</p>
      <Link href="/login" className="block text-sm text-primary underline underline-offset-4">Sign in</Link>
    </div>
  );

  return (
    <form onSubmit={resetPassword} className="space-y-4">
      <label className="block text-sm font-medium">New password
        <input required minLength={8} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2" />
      </label>
      <p className="text-xs text-muted-foreground">Use at least 8 characters.</p>
      <label className="block text-sm font-medium">Confirm new password
        <input required minLength={8} type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2" />
      </label>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <button type="submit" disabled={pending} className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">{pending ? "Updating…" : "Update password"}</button>
      <Link href="/forgot-password" className="block text-sm text-primary underline underline-offset-4">Request a new reset link</Link>
    </form>
  );
}
