import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";
import { requireOrg } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage() {
  await requireOrg();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
      <ComingSoon
        phase="Phase 2"
        title="Projects, payments & tasks arrive next"
        description="Track price, advance, milestones, deadlines, team assignments, tasks, and docs per project."
      />
    </div>
  );
}
