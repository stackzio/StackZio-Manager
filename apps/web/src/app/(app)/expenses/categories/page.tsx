import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePageOrgFinance } from "@/server/auth/guards";
import { listCategories } from "@/server/finance/queries";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { CategoryChip } from "@/components/finance/category-chip";
import { CategoryForm } from "./_components/category-form";
import { EditableCategoryList } from "./_components/editable-category-list";

export const metadata: Metadata = { title: "Expense categories" };

export default async function CategoriesPage() {
  await requirePageOrgFinance();
  const cats = await listCategories();
  const system = cats.filter((c) => c.isSystem);
  const custom = cats
    .filter((c) => !c.isSystem)
    .map((c) => ({
      id: c.id,
      name: c.name,
      color: c.color,
      icon: c.icon,
      isSystem: c.isSystem,
    }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expense categories"
        description="Built-in categories cover the basics. Add your own for anything else."
        breadcrumbs={
          <Link href="/expenses" className="inline-flex items-center gap-1 hover:text-foreground">
            <ArrowLeft className="size-3" /> Back to expenses
          </Link>
        }
        actions={
          <Button asChild variant="outline">
            <Link href="/expenses">All expenses</Link>
          </Button>
        }
      />

      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Built-in
        </h2>
        <ul className="flex flex-wrap gap-2 rounded-xl border bg-card p-4">
          {system.map((c) => (
            <li key={c.id}>
              <CategoryChip name={c.name} color={c.color} icon={c.icon} />
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Custom
        </h2>
        <CategoryForm initial={null} />
        <EditableCategoryList categories={custom} />
      </section>
    </div>
  );
}
