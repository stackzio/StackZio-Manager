import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ClientForm } from "../_components/client-form";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "New client" };

export default function NewClientPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="New client"
        description="Add a client and capture the people you actually deal with."
        breadcrumbs={
          <Link href="/clients" className="inline-flex items-center gap-1 hover:text-foreground">
            <ChevronLeft className="size-3" /> Clients
          </Link>
        }
      />
      <ClientForm mode="create" />
    </div>
  );
}
