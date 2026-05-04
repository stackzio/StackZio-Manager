import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ComingSoon } from "@/components/coming-soon";
import { requireOrg } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Team" };

export default async function TeamPage() {
  const { role } = await requireOrg();
  if (role !== "OWNER" && role !== "ADMIN") redirect("/dashboard");
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
      <ComingSoon
        phase="Phase 3"
        title="Invite teammates and assign projects"
        description="Manage roles (Owner / Admin / Member), invite by email, and control what each member can see and edit."
      />
    </div>
  );
}
