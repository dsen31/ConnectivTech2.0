import { PasswordRecoveryForm } from "@/components/auth/PasswordRecoveryForm";

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <section className="w-full max-w-sm rounded-lg border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Reset your password</h1>
        <p className="mt-1 text-sm text-muted-foreground">Enter your account email to request a reset link.</p>
        <div className="mt-6"><PasswordRecoveryForm /></div>
      </section>
    </main>
  );
}
