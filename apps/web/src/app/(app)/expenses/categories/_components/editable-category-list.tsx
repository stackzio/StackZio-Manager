"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { CategoryChip } from "@/components/finance/category-chip";
import { Button } from "@/components/ui/button";
import { CategoryForm, type CategoryFormInitial } from "./category-form";

interface Props {
  categories: CategoryFormInitial[];
}

export function EditableCategoryList({ categories }: Props) {
  const [editing, setEditing] = useState<CategoryFormInitial | null>(null);

  if (categories.length === 0) {
    return (
      <p className="rounded-lg border border-dashed bg-card p-4 text-center text-sm text-muted-foreground">
        No custom categories yet — add one above and it appears here.
      </p>
    );
  }

  return (
    <>
      <ul className="flex flex-wrap items-center gap-2">
        {categories.map((c) => (
          <li key={c.id} className="flex items-center gap-1">
            <CategoryChip name={c.name} color={c.color} icon={c.icon} />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-6"
              onClick={() => setEditing(c)}
              aria-label={`Edit ${c.name}`}
            >
              <Pencil className="size-3" />
            </Button>
          </li>
        ))}
      </ul>

      {editing ? (
        <div className="mt-4">
          <CategoryForm initial={editing} onClose={() => setEditing(null)} />
        </div>
      ) : null}
    </>
  );
}
