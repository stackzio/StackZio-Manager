"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition, useRef } from "react";
import {
  Code2,
  Cloud,
  ExternalLink,
  File as FileIcon,
  Figma,
  Film,
  Image as ImageIcon,
  Link2,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  Wand2,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import type { ProjectDocKind } from "@stackzio/db";
import { formatDate } from "@stackzio/lib/date";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import {
  addProjectDocLinkAction,
  deleteProjectDocAction,
} from "@/server/projects/doc-actions";

interface Doc {
  id: string;
  title: string;
  url: string;
  kind: ProjectDocKind;
  description: string | null;
  thumbnailUrl: string | null;
  createdAt: Date;
}

interface Props {
  projectId: string;
  docs: Doc[];
  canEdit: boolean;
}

const LINK_KINDS: Array<{
  value: ProjectDocKind;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  hint: string;
  iconColor: string;
}> = [
  { value: "DRIVE", label: "Drive / Cloud", icon: Cloud, hint: "Google Drive, Dropbox, Notion, OneDrive", iconColor: "text-blue-500" },
  { value: "FIGMA", label: "Figma", icon: Figma, hint: "Design files & prototypes", iconColor: "text-fuchsia-500" },
  { value: "MOCKUP", label: "Mockup / Preview", icon: Wand2, hint: "HTML mockups, Vercel preview, staging URL", iconColor: "text-violet-500" },
  { value: "REPO", label: "Repository", icon: Code2, hint: "GitHub, GitLab, Bitbucket", iconColor: "text-zinc-500" },
  { value: "VIDEO", label: "Video", icon: Film, hint: "Loom, YouTube, Vimeo walkthroughs", iconColor: "text-rose-500" },
  { value: "LINK", label: "Other link", icon: Link2, hint: "Anything else worth linking", iconColor: "text-amber-500" },
];

const ICON_BY_KIND: Record<ProjectDocKind, React.ComponentType<{ className?: string }>> = {
  LINK: Link2,
  FILE: FileIcon,
  IMAGE: ImageIcon,
  DRIVE: Cloud,
  FIGMA: Figma,
  MOCKUP: Wand2,
  REPO: Code2,
  VIDEO: Film,
  OTHER: Sparkles,
};

const TONE_BY_KIND: Record<ProjectDocKind, string> = {
  LINK: "text-amber-500 bg-amber-500/10",
  FILE: "text-zinc-500 bg-zinc-500/10",
  IMAGE: "text-emerald-500 bg-emerald-500/10",
  DRIVE: "text-blue-500 bg-blue-500/10",
  FIGMA: "text-fuchsia-500 bg-fuchsia-500/10",
  MOCKUP: "text-violet-500 bg-violet-500/10",
  REPO: "text-zinc-500 bg-zinc-500/10",
  VIDEO: "text-rose-500 bg-rose-500/10",
  OTHER: "text-amber-500 bg-amber-500/10",
};

const LABEL_BY_KIND: Record<ProjectDocKind, string> = {
  LINK: "Link",
  FILE: "File",
  IMAGE: "Image",
  DRIVE: "Drive",
  FIGMA: "Figma",
  MOCKUP: "Mockup",
  REPO: "Repo",
  VIDEO: "Video",
  OTHER: "Other",
};

export function DocsTab({ projectId, docs, canEdit }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [pickedKind, setPickedKind] = useState<ProjectDocKind | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const links = docs.filter((d) => d.kind !== "FILE" && d.kind !== "IMAGE");
  const images = docs.filter((d) => d.kind === "IMAGE");
  const files = docs.filter((d) => d.kind === "FILE");

  function uploadFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    start(async () => {
      for (const file of Array.from(fileList)) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("kind", "project-doc");
        fd.append("projectId", projectId);
        const res = await fetch("/api/uploads", { method: "POST", body: fd });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          toast.error(json.error ?? `Failed to upload ${file.name}`);
          continue;
        }
        toast.success(`Uploaded ${file.name}`);
      }
      router.refresh();
    });
  }

  function onUploadInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    uploadFiles(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);
    if (!canEdit) return;
    uploadFiles(e.dataTransfer.files);
  }

  function addLink(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!pickedKind) return;
    const form = e.currentTarget;
    const fd = new FormData(form);
    const title = String(fd.get("title") ?? "").trim();
    const url = String(fd.get("url") ?? "").trim();
    const description = String(fd.get("description") ?? "").trim();
    if (!title || !url) return;
    const kind = pickedKind;
    if (kind === "FILE" || kind === "IMAGE") return;
    start(async () => {
      const res = await addProjectDocLinkAction(projectId, {
        title,
        url,
        kind,
        description,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Link added");
      setPickedKind(null);
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
    <div className="space-y-6">
      {canEdit ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="size-4 text-primary" /> Add a link
            </CardTitle>
            <CardDescription>
              Drive folders, Figma files, mockups, repos, walkthroughs — anything the team should be
              able to jump to in one click.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {LINK_KINDS.map((k) => {
                const Icon = k.icon;
                const active = pickedKind === k.value;
                return (
                  <button
                    key={k.value}
                    type="button"
                    onClick={() => setPickedKind(active ? null : k.value)}
                    className={cn(
                      "group relative overflow-hidden rounded-xl border p-3 text-left transition-all",
                      "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md",
                      active && "border-primary bg-primary/5 ring-2 ring-primary/30",
                    )}
                  >
                    <Icon className={cn("mb-2 size-5", k.iconColor)} />
                    <p className="text-sm font-medium">{k.label}</p>
                    <p className="line-clamp-2 text-[11px] text-muted-foreground">{k.hint}</p>
                  </button>
                );
              })}
            </div>

            {pickedKind ? (
              <motion.form
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                onSubmit={addLink}
                className="mt-4 grid gap-3 rounded-xl border bg-muted/20 p-4 sm:grid-cols-[1fr_2fr]"
              >
                <div className="space-y-1.5">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    name="title"
                    required
                    maxLength={120}
                    placeholder={
                      pickedKind === "FIGMA"
                        ? "Design v3"
                        : pickedKind === "DRIVE"
                          ? "Brand assets"
                          : pickedKind === "MOCKUP"
                            ? "Staging preview"
                            : "Title"
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="url">URL</Label>
                  <Input
                    id="url"
                    name="url"
                    type="url"
                    required
                    placeholder={
                      pickedKind === "FIGMA"
                        ? "https://figma.com/file/…"
                        : pickedKind === "DRIVE"
                          ? "https://drive.google.com/…"
                          : "https://"
                    }
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    name="description"
                    maxLength={500}
                    placeholder="What's in here? Any context the team should know."
                    className="min-h-[64px]"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 sm:col-span-2">
                  <Button type="button" variant="outline" onClick={() => setPickedKind(null)} disabled={pending}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="gradient" disabled={pending}>
                    {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                    Add link
                  </Button>
                </div>
              </motion.form>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {canEdit ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="size-4 text-primary" /> Upload files
            </CardTitle>
            <CardDescription>
              Drop or pick images, PDFs, Word/Excel/PowerPoint, ZIPs, or short videos. Up to 25 MB
              each.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                if (canEdit) setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={onDrop}
              className={cn(
                "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-all",
                dragActive
                  ? "scale-[1.01] border-primary bg-primary/5"
                  : "hover:border-primary/40 hover:bg-accent/20",
              )}
            >
              <div className="rounded-full bg-brand-gradient p-3 text-white shadow-lg">
                <Upload className="size-5" />
              </div>
              <p className="text-sm font-medium">
                {pending ? "Uploading…" : "Drag files here or click to choose"}
              </p>
              <p className="text-xs text-muted-foreground">
                Images become a gallery automatically · all other files appear in the Files list.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={pending}
              >
                {pending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                Choose files
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={onUploadInputChange}
              />
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="size-4 text-primary" /> Links ({links.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {links.length === 0 ? (
            <p className="text-sm text-muted-foreground">No links yet.</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {links.map((d) => {
                const Icon = ICON_BY_KIND[d.kind] ?? Link2;
                const tone = TONE_BY_KIND[d.kind];
                return (
                  <li key={d.id} className="group">
                    <a
                      href={d.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block h-full rounded-xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                    >
                      <div className="flex items-start gap-3">
                        <span className={cn("rounded-lg p-2", tone)}>
                          <Icon className="size-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-medium">{d.title}</p>
                            <Badge variant="outline" className="text-[10px]">
                              {LABEL_BY_KIND[d.kind]}
                            </Badge>
                          </div>
                          {d.description ? (
                            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{d.description}</p>
                          ) : null}
                          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                            {cleanHostname(d.url)} · {formatDate(d.createdAt)}
                          </p>
                        </div>
                        <ExternalLink className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                        {canEdit ? (
                          <button
                            type="button"
                            aria-label="Delete link"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              deleteDoc(d.id);
                            }}
                            className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        ) : null}
                      </div>
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="size-4 text-primary" /> Images ({images.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {images.length === 0 ? (
            <p className="text-sm text-muted-foreground">No images yet.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {images.map((img) => (
                <a
                  key={img.id}
                  href={img.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative aspect-square overflow-hidden rounded-xl border bg-muted"
                >
                  <Image
                    src={img.url}
                    alt={img.title}
                    fill
                    sizes="(max-width: 768px) 33vw, 25vw"
                    className="object-cover transition-transform group-hover:scale-105"
                    unoptimized
                  />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/70 to-transparent p-2 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                    <span className="truncate font-medium">{img.title}</span>
                  </div>
                  {canEdit ? (
                    <button
                      type="button"
                      aria-label="Delete image"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        deleteDoc(img.id);
                      }}
                      className="absolute right-1 top-1 rounded bg-black/60 p-1 text-white opacity-0 transition-opacity hover:bg-destructive group-hover:opacity-100"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  ) : null}
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileIcon className="size-4 text-primary" /> Files ({files.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {files.length === 0 ? (
            <p className="text-sm text-muted-foreground">No files yet.</p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {files.map((d) => (
                <li key={d.id} className="flex items-center gap-3 p-3 text-sm">
                  <span className={cn("rounded-md p-2", TONE_BY_KIND[d.kind])}>
                    <FileIcon className="size-4" />
                  </span>
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
                    <button
                      type="button"
                      aria-label="Delete file"
                      onClick={() => deleteDoc(d.id)}
                      className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function cleanHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
