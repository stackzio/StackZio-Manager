"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Building2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { createOrganizationAction } from "@/server/organization/actions";

export function CreateOrgForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

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
      defaultCurrency: String(fd.get("defaultCurrency") ?? "INR").trim().toUpperCase(),
    };
    setPending(true);
    try {
      const res = await createOrganizationAction(input);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`${input.name} is ready to go`);
      router.push("/dashboard");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-6">
        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          <div className="flex items-center gap-3 rounded-lg bg-muted/40 p-3 text-sm">
            <Building2 className="size-5 text-primary" />
            <p className="text-muted-foreground">
              Tip: you become the <span className="font-medium text-foreground">Owner</span> of this organization.
              Invite teammates after setup.
            </p>
          </div>
          <Field label="Organization name" id="name" required>
            <Input id="name" name="name" required placeholder="StackZio" maxLength={80} />
          </Field>
          <Field label="Short description" id="description" hint="Shown to your team. 280 chars max.">
            <Textarea id="description" name="description" placeholder="What does this organization do?" maxLength={280} />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Contact email" id="contactEmail">
              <Input id="contactEmail" name="contactEmail" type="email" placeholder="hello@stackzio.app" />
            </Field>
            <Field label="Contact phone" id="contactPhone">
              <Input id="contactPhone" name="contactPhone" placeholder="+91 …" />
            </Field>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Website" id="website">
              <Input id="website" name="website" type="url" placeholder="https://stackzio.app" />
            </Field>
            <Field label="Default currency" id="defaultCurrency" hint="3-letter code, e.g. INR, USD, EUR">
              <Input
                id="defaultCurrency"
                name="defaultCurrency"
                defaultValue="INR"
                maxLength={3}
                className="uppercase"
              />
            </Field>
          </div>
          <Button type="submit" variant="gradient" size="lg" className="w-full" disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            {pending ? "Creating organization…" : "Create organization"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  id,
  hint,
  required,
  children,
}: {
  label: string;
  id: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {required ? <span className="ml-0.5 text-destructive">*</span> : null}
      </Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
