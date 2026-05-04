"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClientAction, updateClientAction } from "@/server/clients/actions";
import type { UpsertClientInput } from "@/server/clients/schemas";

interface Contact {
  id?: string;
  name: string;
  role?: string;
  email?: string;
  phone?: string;
}

interface Props {
  mode: "create" | "edit";
  clientId?: string;
  initial?: Partial<UpsertClientInput> & { contacts?: Contact[] };
}

export function ClientForm({ mode, clientId, initial }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [contacts, setContacts] = useState<Contact[]>(initial?.contacts ?? []);

  function addContact() {
    setContacts((prev) => [...prev, { name: "" }]);
  }
  function setContact(i: number, patch: Partial<Contact>) {
    setContacts((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }
  function removeContact(i: number) {
    setContacts((prev) => prev.filter((_, idx) => idx !== i));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const input: UpsertClientInput = {
      name: String(fd.get("name") ?? "").trim(),
      company: String(fd.get("company") ?? "").trim(),
      email: String(fd.get("email") ?? "").trim(),
      phone: String(fd.get("phone") ?? "").trim(),
      website: String(fd.get("website") ?? "").trim(),
      addressLine1: String(fd.get("addressLine1") ?? "").trim(),
      addressLine2: String(fd.get("addressLine2") ?? "").trim(),
      city: String(fd.get("city") ?? "").trim(),
      state: String(fd.get("state") ?? "").trim(),
      country: String(fd.get("country") ?? "").trim(),
      postalCode: String(fd.get("postalCode") ?? "").trim(),
      notes: String(fd.get("notes") ?? "").trim(),
      contacts: contacts
        .filter((c) => c.name.trim())
        .map((c) => ({
          id: c.id,
          name: c.name.trim(),
          role: c.role?.trim() ?? "",
          email: c.email?.trim() ?? "",
          phone: c.phone?.trim() ?? "",
        })),
    };
    start(async () => {
      const res =
        mode === "create"
          ? await createClientAction(input)
          : await updateClientAction(clientId!, input);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(mode === "create" ? "Client created" : "Client updated");
      router.push(`/clients/${res.clientId}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Basics</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <Field label="Client name" id="name" required>
            <Input id="name" name="name" required defaultValue={initial?.name ?? ""} maxLength={120} />
          </Field>
          <Field label="Company" id="company">
            <Input id="company" name="company" defaultValue={initial?.company ?? ""} maxLength={120} />
          </Field>
          <Field label="Email" id="email">
            <Input id="email" name="email" type="email" defaultValue={initial?.email ?? ""} />
          </Field>
          <Field label="Phone" id="phone">
            <Input id="phone" name="phone" defaultValue={initial?.phone ?? ""} />
          </Field>
          <Field label="Website" id="website" className="sm:col-span-2">
            <Input id="website" name="website" type="url" defaultValue={initial?.website ?? ""} placeholder="https://" />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Address</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <Field label="Address line 1" id="addressLine1" className="sm:col-span-2">
            <Input id="addressLine1" name="addressLine1" defaultValue={initial?.addressLine1 ?? ""} />
          </Field>
          <Field label="Address line 2" id="addressLine2" className="sm:col-span-2">
            <Input id="addressLine2" name="addressLine2" defaultValue={initial?.addressLine2 ?? ""} />
          </Field>
          <Field label="City" id="city">
            <Input id="city" name="city" defaultValue={initial?.city ?? ""} />
          </Field>
          <Field label="State" id="state">
            <Input id="state" name="state" defaultValue={initial?.state ?? ""} />
          </Field>
          <Field label="Country" id="country">
            <Input id="country" name="country" defaultValue={initial?.country ?? ""} />
          </Field>
          <Field label="Postal code" id="postalCode">
            <Input id="postalCode" name="postalCode" defaultValue={initial?.postalCode ?? ""} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Contacts</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addContact}>
            <Plus className="size-4" /> Add contact
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No contacts yet — add the people you actually deal with.</p>
          ) : null}
          {contacts.map((c, i) => (
            <div key={c.id ?? i} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]">
              <Input
                value={c.name}
                onChange={(e) => setContact(i, { name: e.target.value })}
                placeholder="Name"
              />
              <Input
                value={c.role ?? ""}
                onChange={(e) => setContact(i, { role: e.target.value })}
                placeholder="Role"
              />
              <Input
                type="email"
                value={c.email ?? ""}
                onChange={(e) => setContact(i, { email: e.target.value })}
                placeholder="Email"
              />
              <Input
                value={c.phone ?? ""}
                onChange={(e) => setContact(i, { phone: e.target.value })}
                placeholder="Phone"
              />
              <Button type="button" variant="ghost" size="icon" onClick={() => removeContact(i)} aria-label="Remove contact">
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            name="notes"
            defaultValue={initial?.notes ?? ""}
            placeholder="Anything worth remembering — preferences, history, gotchas."
            maxLength={2000}
            className="min-h-[120px]"
          />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" variant="gradient" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {pending ? "Saving…" : mode === "create" ? "Create client" : "Save changes"}
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
