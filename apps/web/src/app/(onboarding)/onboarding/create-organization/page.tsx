import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@stackzio/db";
import { requireUser } from "@/server/auth/guards";
import { CreateOrgForm } from "./create-org-form";

export const metadata: Metadata = { title: "Create your organization" };

export default async function CreateOrganizationPage() {
  const user = await requireUser();
  // If user already has at least one org, send them to dashboard.
  const existing = await prisma.organizationMember.findFirst({
    where: { userId: user.id },
    select: { id: true },
  });
  if (existing) redirect("/dashboard");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Create your first organization</h1>
        <p className="mt-2 text-muted-foreground">
          Each organization is its own private workspace — clients, projects, payments, and team
          are scoped to it. You can create more later.
        </p>
      </div>
      <CreateOrgForm />
    </div>
  );
}
