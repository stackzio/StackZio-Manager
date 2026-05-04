"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ExternalLink, FileText, Link2, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@stackzio/lib/date";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addProjectDocLinkAction, deleteProjectDocAction } from "@/server/projects/doc-actions";

interface Doc {
  id: string;
  title: string;
  url: string;
  kind: "LINK" | "FILE";
  createdAt: Date;
}

interface Props {
  projectId: string;
  docs: Doc[];
  canEdit: boolean;
}

export function DocsTab({ projectId, docs, canEdit }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [showLink, setShowLink] = useState(false);

  function uploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("kind", "project-doc");
    fd.append("projectId", projectId);
    start(async () => {
      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Upload failed");
        return;
      }
      toast.success("File uploaded");
      router.refresh();
    });
    e.currentTarget.value = "";
  }

  function addLink(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const title = String(fd.get("title") ?? "").trim();
    const url = String(fd.get("url") ?? "").trim();
    if (!title || !url) return;
    start(async () => {
      const res = await addProjectDocLinkAction(projectId, { title, url });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Link added");
      setShowLink(false);
      form.reset();
      router.refresh();
    });
  }

  function deleteDoc(id: string) {
    start(async () => {
      const res = await deleteProjectDocAction(id);
      if (!res.ok) {
        toast.error(res.error ?? "Could not delete");
        return;
      }
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Docs & links</CardTitle>
          <CardDescription>Briefs, contracts, mockups, references.</CardDescription>
        </div>
        {canEdit ? (
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowLink((v) => !v)}>
              <Link2 className="size-4" /> Add link
            </Button>
            <label className="inline-flex">
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={uploadFile}
                className="hidden"
                disabled={pending}
              />
              <Button asChild type="button" variant="gradient" size="sm">
                <span>
                  {pending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                  Upload
                </span>
              </Button>
            </label>
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {showLink && canEdit ? (
          <form onSubmit={addLink} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_2fr_auto]">
            <div className="space-y-1.5">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" required maxLength={120} placeholder="Brief, Figma, …" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="url">URL</Label>
              <Input id="url" name="url" type="url" required placeholder="https://" />
            </div>
            <div className="flex items-end">
              <Button type="submit" variant="gradient" disabled={pending}>
                {pending && <Loader2 className="size-4 animate-spin" />}
                <Plus className="size-4" /> Add
              </Button>
            </div>
          </form>
        ) : null}

        {docs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No docs or links yet.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {docs.map((d) => (
              <li key={d.id} className="flex items-center gap-3 p-3 text-sm">
                {d.kind === "FILE" ? (
                  <FileText className="size-4 text-primary" />
                ) : (
                  <Link2 className="size-4 text-primary" />
                )}
                <a
                  href={d.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 flex-1 truncate font-medium hover:text-primary"
                >
                  {d.title}
                </a>
                <span className="text-xs text-muted-foreground">{formatDate(d.createdAt)}</span>
                <a
                  href={d.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded p-1 text-muted-foreground hover:text-foreground"
                  aria-label="Open"
                >
                  <ExternalLink className="size-4" />
                </a>
                {canEdit ? (
                  <Button variant="ghost" size="icon" aria-label="Delete doc" onClick={() => deleteDoc(d.id)}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
