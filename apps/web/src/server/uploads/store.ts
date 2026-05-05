import { randomBytes } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Uploads to Supabase Storage. One bucket "stackzio-uploads" with sub-paths
 * per kind (org-logo / user-avatar / project-doc). The bucket is public so
 * URLs work directly in <img> tags without signed-URL roundtrips.
 *
 * Server-side only. Uses the service role key so it bypasses RLS — auth
 * is enforced upstream in the /api/uploads route handler.
 */

const BUCKET = "stackzio-uploads";

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

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB for project docs
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

let _supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient {
  if (_supabase) return _supabase;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Uploads disabled: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set. " +
        "Get the service role key at https://app.supabase.com → Project Settings → API.",
    );
  }
  _supabase = createClient(url, key, { auth: { persistSession: false } });
  return _supabase;
}

let _bucketReady = false;
async function ensureBucket(): Promise<void> {
  if (_bucketReady) return;
  const sb = getSupabase();
  const { data: buckets, error: listErr } = await sb.storage.listBuckets();
  if (listErr) throw listErr;
  const exists = buckets?.some((b) => b.name === BUCKET);
  if (!exists) {
    const { error: createErr } = await sb.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: MAX_BYTES,
    });
    if (createErr) throw createErr;
  }
  _bucketReady = true;
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
    if (isImageOnly) throw new Error("Only PNG, JPEG, WebP, SVG or GIF are allowed");
    throw new Error(
      "Unsupported file type. Allowed: images, PDF, Word, Excel, PowerPoint, ZIP, MP4 / WebM",
    );
  }
  if (args.file.size > cap) {
    throw new Error(`File is too large (max ${sizeLabel})`);
  }

  await ensureBucket();

  const ext = EXT_BY_MIME[args.file.type] ?? "bin";
  const id = randomBytes(8).toString("hex");
  const objectPath = `${args.kind}/${args.ownerId}-${id}.${ext}`;

  const sb = getSupabase();
  const buffer = Buffer.from(await args.file.arrayBuffer());

  const { error: uploadErr } = await sb.storage
    .from(BUCKET)
    .upload(objectPath, buffer, {
      contentType: args.file.type,
      upsert: false,
      cacheControl: "31536000", // 1 year — files are immutable (random suffix)
    });
  if (uploadErr) throw uploadErr;

  const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(objectPath);
  return {
    url: pub.publicUrl,
    kind: args.kind,
    byteSize: args.file.size,
    contentType: args.file.type,
  };
}
