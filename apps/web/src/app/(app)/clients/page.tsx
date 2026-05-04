import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";
import { requireOrg } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Clients" };

export default async function ClientsPage() {
  await requireOrg();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
      <ComingSoon
        phase="Phase 2"
        title="Client management arrives next"
        description="A searchable, filterable directory with contacts, business details, and linked projects."
      />
    </div>
  );
}
