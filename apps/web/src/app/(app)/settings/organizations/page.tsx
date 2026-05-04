import type { Metadata } from "next";
import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import { listMyOrganizations } from "@/server/organization/actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Organizations" };

export default async function OrganizationsPage() {
  const orgs = await listMyOrganizations();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <div>
            <CardTitle>Your organizations</CardTitle>
            <CardDescription>Switch between them from the topbar.</CardDescription>
          </div>
          <Button asChild variant="gradient">
            <Link href="/settings/organizations/new">
              <Plus className="size-4" /> New organization
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <ul className="divide-y rounded-lg border">
            {orgs.length === 0 ? (
              <li className="p-6 text-sm text-muted-foreground">
                You don&apos;t belong to any organization yet.
              </li>
            ) : null}
            {orgs.map((o) => (
              <li key={o.id} className="flex items-center gap-4 p-4">
                <Avatar className="size-10 rounded-lg">
                  {o.logoUrl ? <AvatarImage src={o.logoUrl} alt={o.name} /> : null}
                  <AvatarFallback className="rounded-lg">
                    {o.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{o.name}</p>
                  <p className="truncate text-xs text-muted-foreground">/{o.slug}</p>
                </div>
                <Badge variant={o.role === "OWNER" ? "default" : "secondary"}>{o.role}</Badge>
                <Button asChild size="sm" variant="ghost">
                  <Link href={`/organization`}>
                    <Building2 className="size-4" /> Open
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
