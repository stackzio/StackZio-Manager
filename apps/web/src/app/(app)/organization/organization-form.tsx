"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUpload } from "@/components/upload/image-upload";
import { updateOrganizationAction } from "@/server/organization/actions";

interface Props {
  organization: {
    id: string;
    name: string;
    description: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    website: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    postalCode: string | null;
    defaultCurrency: string;
    logoUrl: string | null;
  };
}

export function OrganizationForm({ organization }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>(organization.logoUrl ?? "");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    const fd = new FormData(e.currentTarget);
    const input = {
      name: String(fd.get("name") ?? "").trim(),
      description: String(fd.get("description") ?? "").trim(),
      contactEmail: String(fd.get("contactEmail") ?? "").trim(),
      contactPhone: String(fd.get("contactPhone") ?? "").trim(),
      website: String(fd.get("website") ?? "").trim(),
      addressLine1: String(fd.get("addressLine1") ?? "").trim(),
      addressLine2: String(fd.get("addressLine2") ?? "").trim(),
      city: String(fd.get("city") ?? "").trim(),
      state: String(fd.get("state") ?? "").trim(),
      country: String(fd.get("country") ?? "").trim(),
      postalCode: String(fd.get("postalCode") ?? "").trim(),
      defaultCurrency: String(fd.get("defaultCurrency") ?? "").trim().toUpperCase(),
      logoUrl: logoUrl,
    };
    setPending(true);
    try {
      const res = await updateOrganizationAction(input);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Organization updated");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Brand</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <ImageUpload
            kind="org-logo"
            currentUrl={organization.logoUrl}
            fallbackText={organization.name.slice(0, 2).toUpperCase()}
            onUploaded={setLogoUrl}
            rounded="xl"
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Name" id="name" required>
              <Input id="name" name="name" required defaultValue={organization.name} maxLength={80} />
            </Field>
            <Field label="Default currency" id="defaultCurrency">
              <Input
                id="defaultCurrency"
                name="defaultCurrency"
                defaultValue={organization.defaultCurrency}
                maxLength={3}
                className="uppercase"
              />
            </Field>
          </div>
          <Field label="Description" id="description">
            <Textarea
              id="description"
              name="description"
              maxLength={280}
              defaultValue={organization.description ?? ""}
              placeholder="A short tagline for this brand."
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <Field label="Email" id="contactEmail">
            <Input
              id="contactEmail"
              name="contactEmail"
              type="email"
              defaultValue={organization.contactEmail ?? ""}
            />
          </Field>
          <Field label="Phone" id="contactPhone">
            <Input
              id="contactPhone"
              name="contactPhone"
              defaultValue={organization.contactPhone ?? ""}
            />
          </Field>
          <Field label="Website" id="website" className="sm:col-span-2">
            <Input
              id="website"
              name="website"
              type="url"
              defaultValue={organization.website ?? ""}
              placeholder="https://"
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Address</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <Field label="Address line 1" id="addressLine1" className="sm:col-span-2">
            <Input id="addressLine1" name="addressLine1" defaultValue={organization.addressLine1 ?? ""} />
          </Field>
          <Field label="Address line 2" id="addressLine2" className="sm:col-span-2">
            <Input id="addressLine2" name="addressLine2" defaultValue={organization.addressLine2 ?? ""} />
          </Field>
          <Field label="City" id="city">
            <Input id="city" name="city" defaultValue={organization.city ?? ""} />
          </Field>
          <Field label="State" id="state">
            <Input id="state" name="state" defaultValue={organization.state ?? ""} />
          </Field>
          <Field label="Country" id="country">
            <Input id="country" name="country" defaultValue={organization.country ?? ""} />
          </Field>
          <Field label="Postal code" id="postalCode">
            <Input id="postalCode" name="postalCode" defaultValue={organization.postalCode ?? ""} />
          </Field>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" variant="gradient" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  id,
  required,
  className,
  children,
}: {
  label: string;
  id: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={"space-y-1.5 " + (className ?? "")}>
      <Label htmlFor={id}>
        {label}
        {required ? <span className="ml-0.5 text-destructive">*</span> : null}
      </Label>
      {children}
    </div>
  );
}
