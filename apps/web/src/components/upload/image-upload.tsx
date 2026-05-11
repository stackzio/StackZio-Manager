"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { ImagePlus, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { UploadKind } from "@/server/uploads/store";

interface Props {
  kind: UploadKind;
  currentUrl: string | null;
  fallbackText: string;
  onUploaded: (url: string) => void;
  /** Extra form fields to send (e.g. projectId for project-doc). */
  extra?: Record<string, string>;
  rounded?: "full" | "lg" | "xl";
  size?: "md" | "lg";
}

const ROUND = { full: "rounded-full", lg: "rounded-lg", xl: "rounded-xl" } as const;
const SIZE = { md: "size-14", lg: "size-20" } as const;

// Different kinds accept different files. The store enforces the same limits
// server-side, this just keeps the OS file picker tidy.
const ACCEPT: Record<UploadKind, string> = {
  "org-logo": "image/png,image/jpeg,image/webp,image/svg+xml,image/gif",
  "user-avatar": "image/png,image/jpeg,image/webp,image/svg+xml,image/gif",
  "project-doc":
    "image/*,application/pdf,application/zip,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,text/csv,text/markdown,video/mp4,video/webm,video/quicktime",
  "expense-receipt": "image/png,image/jpeg,image/webp,image/gif,application/pdf",
};

const HELP: Record<UploadKind, string> = {
  "org-logo": "PNG, JPEG, WebP, SVG, GIF · up to 4 MB.",
  "user-avatar": "PNG, JPEG, WebP, SVG, GIF · up to 4 MB.",
  "project-doc": "Images, PDFs, Office docs, ZIP, MP4 · up to 25 MB.",
  "expense-receipt": "Image or PDF · up to 10 MB.",
};

export function ImageUpload({
  kind,
  currentUrl,
  fallbackText,
  onUploaded,
  extra,
  rounded = "lg",
  size = "lg",
}: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const inputRef = useRef<HTMLInputElement>(null);

  function pick() {
    inputRef.current?.click();
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("kind", kind);
    if (extra) for (const [k, v] of Object.entries(extra)) fd.append(k, v);

    start(async () => {
      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        toast.error(json.error ?? "Upload failed");
        return;
      }
      setPreview(json.url);
      onUploaded(json.url);
      toast.success("Uploaded");
      // Refresh the route's server components so the topbar (avatar/org logo)
      // re-reads the now-updated session and org data.
      router.refresh();
    });
    e.currentTarget.value = "";
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar className={`${SIZE[size]} ${ROUND[rounded]}`}>
        {preview ? <AvatarImage src={preview} alt="" /> : null}
        <AvatarFallback className={ROUND[rounded]}>{fallbackText}</AvatarFallback>
      </Avatar>
      <div className="space-y-2">
        <Button type="button" variant="outline" size="sm" onClick={pick} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          {preview ? "Replace" : "Upload"}
        </Button>
        <p className="text-xs text-muted-foreground">{HELP[kind]}</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT[kind]}
        className="hidden"
        onChange={onChange}
      />
      <ImagePlus className="hidden" />
    </div>
  );
}
