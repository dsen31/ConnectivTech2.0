import { Sidebar } from "@/components/shared/Sidebar";
import { requireOwner } from "@/lib/auth/owner";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireOwner();
  return (
    <div className="flex h-full">
      <Sidebar />
      <main className="flex-1 min-h-0 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
