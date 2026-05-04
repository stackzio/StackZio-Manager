import type { Metadata } from "next";
import { CreateOrgForm } from "@/app/(onboarding)/onboarding/create-organization/create-org-form";

export const metadata: Metadata = { title: "New organization" };

export default function NewOrganizationPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Create another organization</h2>
        <p className="text-sm text-muted-foreground">
          Each organization is a fully isolated workspace.
        </p>
      </div>
      <CreateOrgForm />
    </div>
  );
}
