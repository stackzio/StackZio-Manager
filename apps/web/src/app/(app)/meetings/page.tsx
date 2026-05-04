import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";
import { requireOrg } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Meetings" };

export default async function MeetingsPage() {
  await requireOrg();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Meetings</h1>
      <ComingSoon
        phase="Phase 3"
        title="Schedule and track meetings"
        description="Calendar + list views, link meetings to clients/projects, capture agenda, location, and remarks."
      />
    </div>
  );
}
