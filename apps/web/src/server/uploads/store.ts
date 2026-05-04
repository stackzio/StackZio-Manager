import { mkdir, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import path from "node:path";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

const IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
  "image/gif",
]);

const PROJECT_DOC_TYPES = new Set<string>([
  ...IMAGE_TYPES,
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "text/markdown",
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB for doc uploads
const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4 MB for logos/avatars

const EXT_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "image/gif": "gif",
  "application/pdf": "pdf",
  "application/zip": "zip",
  "application/x-zip-compressed": "zip",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "text/plain": "txt",
  "text/csv": "csv",
  "text/markdown": "md",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
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
  const isImageOnly = args.kind === "org-logo" || args.kind === "user-avatar";
  const allowed = isImageOnly ? IMAGE_TYPES : PROJECT_DOC_TYPES;
  const cap = isImageOnly ? MAX_IMAGE_BYTES : MAX_BYTES;
  const sizeLabel = isImageOnly ? "4 MB" : "25 MB";

  if (!allowed.has(args.file.type)) {
    if (isImageOnly) {
      throw new Error("Only PNG, JPEG, WebP, SVG or GIF are allowed");
    }
    throw new Error(
      "Unsupported file type. Allowed: images, PDF, Word, Excel, PowerPoint, ZIP, MP4 / WebM",
    );
  }
  if (args.file.size > cap) {
    throw new Error(`File is too large (max ${sizeLabel})`);
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
