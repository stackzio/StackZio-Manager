import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";
import { requireOrg } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Payments" };

export default async function PaymentsPage() {
  await requireOrg();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
      <ComingSoon
        phase="Phase 2"
        title="A unified payments ledger"
        description="Record advances, milestones and final payments per project, with method, reference and notes."
      />
    </div>
  );
}
