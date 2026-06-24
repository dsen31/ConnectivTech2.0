import { getEmailSignature, getDailySendLimit } from "@/app/actions/settings";
import { SignatureForm } from "@/components/settings/SignatureForm";

export default async function SettingsPage() {
  const [signature, dailyLimit] = await Promise.all([
    getEmailSignature(),
    getDailySendLimit(),
  ]);

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure your outbound email defaults
        </p>
      </div>

      <div className="rounded-lg border p-5">
        <SignatureForm initialSignature={signature} initialDailyLimit={dailyLimit} />
      </div>
    </div>
  );
}
