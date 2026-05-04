import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { ClientForm } from "../../_components/client-form";
import { PageHeader } from "@/components/page-header";
import { getClient } from "@/server/clients/queries";

export const metadata: Metadata = { title: "Edit client" };

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await getClient(id);
  if (!client) notFound();

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Edit ${client.name}`}
        breadcrumbs={
          <Link href={`/clients/${client.id}`} className="inline-flex items-center gap-1 hover:text-foreground">
            <ChevronLeft className="size-3" /> Back to client
          </Link>
        }
      />
      <ClientForm
        mode="edit"
        clientId={client.id}
        initial={{
          name: client.name,
          company: client.company ?? undefined,
          email: client.email ?? undefined,
          phone: client.phone ?? undefined,
          website: client.website ?? undefined,
          addressLine1: client.addressLine1 ?? undefined,
          addressLine2: client.addressLine2 ?? undefined,
          city: client.city ?? undefined,
          state: client.state ?? undefined,
          country: client.country ?? undefined,
          postalCode: client.postalCode ?? undefined,
          notes: client.notes ?? undefined,
          contacts: client.contacts.map((c) => ({
            id: c.id,
            name: c.name,
            role: c.role ?? undefined,
            email: c.email ?? undefined,
            phone: c.phone ?? undefined,
          })),
        }}
      />
    </div>
  );
}
