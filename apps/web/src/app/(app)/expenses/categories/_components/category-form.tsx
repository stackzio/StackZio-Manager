"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/cn";
import { CategoryChip } from "@/components/finance/category-chip";
import { IconPicker } from "@/components/finance/icon-picker";
import {
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
} from "@/server/finance/category-actions";

const DEFAULT_SWATCH = "#ec4899";
const BRAND_SWATCHES: readonly string[] = [
  DEFAULT_SWATCH, // pink
  "#a855f7", // purple
  "#6366f1", // indigo
  "#06b6d4", // cyan
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#71717a", // zinc
];

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export interface CategoryFormInitial {
  id: string;
  name: string;
  color: string;
  icon: string;
  isSystem: boolean;
}

interface Props {
  initial: CategoryFormInitial | null;
  onClose?: () => void;
}

export function CategoryForm({ initial, onClose }: Props) {
  const router = useRouter();
  const isEdit = !!initial;
  const isSystem = initial?.isSystem ?? false;

  const [name, setName] = useState(initial?.name ?? "");
  const [color, setColor] = useState(initial?.color ?? DEFAULT_SWATCH);
  const [icon, setIcon] = useState(initial?.icon ?? "Tag");
  const [pending, setPending] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const valid = HEX_RE.test(color) && name.trim().length > 0 && icon.length > 0;
  const previewName = name.trim() || "Preview";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending || !valid) {
      if (!HEX_RE.test(color)) toast.error("Color must be a 6-digit hex (e.g. #ff0080)");
      return;
    }
    setPending(true);
    try {
      const input = { name: name.trim(), color, icon };
      const res = isEdit
        ? await updateCategoryAction(initial!.id, input)
        : await createCategoryAction(input);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(isEdit ? "Category updated" : "Category created");
      router.refresh();
      if (!isEdit) {
        setName("");
        setColor(DEFAULT_SWATCH);
        setIcon("Tag");
      }
      onClose?.();
    } finally {
      setPending(false);
    }
  }

  async function onDelete() {
    if (!initial || deleting) return;
    const ok = window.confirm(`Delete the “${initial.name}” category?`);
    if (!ok) return;
    setDeleting(true);
    try {
      const res = await deleteCategoryAction(initial.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Category deleted");
      router.refresh();
      onClose?.();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-xl border bg-card p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">
            {isEdit ? "Edit category" : "New category"}
          </h3>
          <p className="text-xs text-muted-foreground">
            Pick a name, color and icon. The chip preview below is what
            you&apos;ll see on every expense.
          </p>
        </div>
        <CategoryChip name={previewName} color={color} icon={icon} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="cat-name">Name</Label>
          <Input
            id="cat-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isSystem}
            placeholder="e.g. Subscriptions"
            maxLength={40}
            required
          />
          {isSystem ? (
            <p className="text-[11px] text-muted-foreground">
              Built-in name is fixed — you can change color and icon.
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cat-color">Color</Label>
          <div className="flex flex-wrap items-center gap-2">
            {BRAND_SWATCHES.map((swatch) => (
              <button
                type="button"
                key={swatch}
                onClick={() => setColor(swatch)}
                className={cn(
                  "size-7 rounded-full border-2 transition-transform hover:scale-110",
                  color.toLowerCase() === swatch.toLowerCase()
                    ? "border-foreground"
                    : "border-transparent",
                )}
                style={{ backgroundColor: swatch }}
                aria-label={swatch}
                aria-pressed={color.toLowerCase() === swatch.toLowerCase()}
              />
            ))}
            <Input
              id="cat-color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-7 w-24 font-mono text-xs"
              maxLength={7}
              spellCheck={false}
              aria-label="Custom hex color"
            />
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Icon</Label>
        <IconPicker value={icon} onChange={setIcon} />
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        {isEdit && !isSystem ? (
          <Button
            type="button"
            variant="ghost"
            onClick={onDelete}
            disabled={pending || deleting}
            className="mr-auto text-destructive hover:text-destructive"
          >
            {deleting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
            Delete
          </Button>
        ) : null}
        {onClose ? (
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={pending || deleting}
          >
            <X className="size-4" /> Cancel
          </Button>
        ) : null}
        <Button
          type="submit"
          variant="gradient"
          disabled={pending || deleting || !valid}
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : isEdit ? (
            <Save className="size-4" />
          ) : (
            <Plus className="size-4" />
          )}
          {pending
            ? "Saving…"
            : isEdit
              ? "Save changes"
              : "Add category"}
        </Button>
      </div>
    </form>
  );
}
