import { randomBytes } from "node:crypto";
import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";

/**
 * Uploads to Cloudinary. We route by MIME:
 *   - image/*  → resource_type: "image", returned URL adds f_auto,q_auto
 *                so the browser gets WebP/AVIF at the right quality.
 *   - video/*  → resource_type: "video"
 *   - else     → resource_type: "raw" (PDF, Word, Excel, ZIP, etc.)
 *
 * Server-side only. Cloudinary credentials never reach the client.
 */

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

// Expense receipts: images + PDFs only. Smaller cap because receipts are
// almost always a single page / photo.
const EXPENSE_RECEIPT_TYPES = new Set<string>([
  ...IMAGE_TYPES,
  "application/pdf",
]);

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB for project docs
const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4 MB for logos/avatars
const MAX_RECEIPT_BYTES = 10 * 1024 * 1024; // 10 MB for expense receipts

export type UploadKind =
  | "org-logo"
  | "user-avatar"
  | "project-doc"
  | "expense-receipt";

export interface SavedUpload {
  url: string;
  kind: UploadKind;
  byteSize: number;
  contentType: string;
}

let _configured = false;
function configureCloudinary(): void {
  if (_configured) return;
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
  const api_key = process.env.CLOUDINARY_API_KEY;
  const api_secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud_name || !api_key || !api_secret) {
    throw new Error(
      "Uploads disabled: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and " +
        "CLOUDINARY_API_SECRET must be set. Get them at https://console.cloudinary.com → Dashboard.",
    );
  }
  cloudinary.config({ cloud_name, api_key, api_secret, secure: true });
  _configured = true;
}

function resourceTypeFor(mime: string): "image" | "video" | "raw" {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  return "raw";
}

export async function saveImage(args: {
  file: File;
  kind: UploadKind;
  ownerId: string;
}): Promise<SavedUpload> {
  const isImageOnly = args.kind === "org-logo" || args.kind === "user-avatar";
  const isReceipt = args.kind === "expense-receipt";

  let allowed: Set<string>;
  let cap: number;
  let sizeLabel: string;
  if (isImageOnly) {
    allowed = IMAGE_TYPES;
    cap = MAX_IMAGE_BYTES;
    sizeLabel = "4 MB";
  } else if (isReceipt) {
    allowed = EXPENSE_RECEIPT_TYPES;
    cap = MAX_RECEIPT_BYTES;
    sizeLabel = "10 MB";
  } else {
    allowed = PROJECT_DOC_TYPES;
    cap = MAX_BYTES;
    sizeLabel = "25 MB";
  }

  if (!allowed.has(args.file.type)) {
    if (isImageOnly) throw new Error("Only PNG, JPEG, WebP, SVG or GIF are allowed");
    if (isReceipt)
      throw new Error("Receipts must be an image (PNG, JPEG, WebP, GIF) or PDF");
    throw new Error(
      "Unsupported file type. Allowed: images, PDF, Word, Excel, PowerPoint, ZIP, MP4 / WebM",
    );
  }
  if (args.file.size > cap) {
    throw new Error(`File is too large (max ${sizeLabel})`);
  }

  configureCloudinary();

  const buffer = Buffer.from(await args.file.arrayBuffer());
  const id = `${args.ownerId}-${randomBytes(8).toString("hex")}`;
  // Receipts go under their own per-org folder so they're easy to audit /
  // backfill if we ever export to S3. Other kinds keep their existing path.
  const folder = isReceipt
    ? `stackzio/expense-receipts/${args.ownerId}`
    : `stackzio/${args.kind}`;
  const resource_type = resourceTypeFor(args.file.type);

  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: id,
        resource_type,
        // For raw / videos we keep the original filename so downloads make sense.
        use_filename: resource_type !== "image",
        unique_filename: false,
        overwrite: false,
      },
      (error, uploadResult) => {
        if (error || !uploadResult) {
          reject(error ?? new Error("Cloudinary returned no result"));
          return;
        }
        resolve(uploadResult);
      },
    );
    stream.end(buffer);
  });

  // For images, return an auto-format / auto-quality URL so the browser gets
  // WebP/AVIF at appropriate quality with no extra config on our side.
  let url = result.secure_url;
  if (resource_type === "image") {
    url = cloudinary.url(result.public_id, {
      resource_type: "image",
      secure: true,
      fetch_format: "auto",
      quality: "auto",
      version: result.version,
    });
  }

  return {
    url,
    kind: args.kind,
    byteSize: args.file.size,
    contentType: args.file.type,
  };
}
