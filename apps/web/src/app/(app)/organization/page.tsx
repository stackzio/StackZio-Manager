import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireOrg } from "@/server/auth/guards";
import { OrganizationForm } from "./organization-form";

export const metadata: Metadata = { title: "Organization" };

export default async function OrganizationPage() {
  const { org, role } = await requireOrg();
  if (role !== "OWNER" && role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Organization profile</h1>
        <p className="text-sm text-muted-foreground">
          This is what your team sees in the org switcher and on every report.
        </p>
      </div>
      <OrganizationForm
        organization={{
          id: org.id,
          name: org.name,
          description: org.description,
          contactEmail: org.contactEmail,
          contactPhone: org.contactPhone,
          website: org.website,
          addressLine1: org.addressLine1,
          addressLine2: org.addressLine2,
          city: org.city,
          state: org.state,
          country: org.country,
          postalCode: org.postalCode,
          defaultCurrency: org.defaultCurrency,
          logoUrl: org.logoUrl,
        }}
      />
    </div>
  );
}
