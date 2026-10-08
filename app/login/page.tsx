import { LoginForm } from "@/components/auth/LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <section className="w-full max-w-sm rounded-lg border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold">ConnectivTech Sales</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sign in to access the sales workspace.</p>
        {error === "unauthorized" && <p className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">This account is not authorized to access the workspace.</p>}
        <div className="mt-6"><LoginForm /></div>
      </section>
    </main>
  );
}
