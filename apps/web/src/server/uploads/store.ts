import { mkdir, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import path from "node:path";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/gif"]);
const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4 MB

const EXT_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "image/gif": "gif",
};

export type UploadKind = "org-logo" | "user-avatar" | "project-doc";

export interface SavedUpload {
  url: string;
  kind: UploadKind;
  byteSize: number;
  contentType: string;
}

export async function saveImage(args: {
  file: File;
  kind: UploadKind;
  ownerId: string;
}): Promise<SavedUpload> {
  if (!ALLOWED_IMAGE_TYPES.has(args.file.type)) {
    throw new Error("Only PNG, JPEG, WebP, SVG or GIF are allowed");
  }
  if (args.file.size > MAX_IMAGE_BYTES) {
    throw new Error("File is too large (max 4 MB)");
  }
  const ext = EXT_BY_MIME[args.file.type] ?? "bin";
  const subdir = args.kind;
  const dir = path.join(UPLOAD_ROOT, subdir);
  await mkdir(dir, { recursive: true });
  const id = randomBytes(8).toString("hex");
  const filename = `${args.ownerId}-${id}.${ext}`;
  const abs = path.join(dir, filename);
  const buf = Buffer.from(await args.file.arrayBuffer());
  await writeFile(abs, buf);
  return {
    url: `/uploads/${subdir}/${filename}`,
    kind: args.kind,
    byteSize: args.file.size,
    contentType: args.file.type,
  };
}
