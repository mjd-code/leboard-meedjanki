/**
 * Firebase Storage wrapper for the optimized image pipeline (Task 2).
 *
 * Responsibilities:
 *  - Convert an arbitrary image File into a resized WebP Blob (canvas pipeline).
 *  - Upload Blobs/Files to Firebase Storage with long-lived immutable caching.
 *  - Return both the public download `url` and the Storage object `path`
 *    (the path is persisted so we can clean up the old object on replace).
 *  - Delete an object by path (best-effort; swallows "not found").
 *
 * Everything is browser-only. Callers in SSR contexts must guard with a
 * `typeof window` check (these helpers are only ever invoked from event
 * handlers, so that is already the case).
 */
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  type UploadMetadata,
} from "firebase/storage";
import { app } from "@/lib/firebase/config";

export interface UploadResult {
  /** Public https download URL. */
  url: string;
  /** Storage object path, e.g. `avatars/abc123/1733600000-uuid.webp`. */
  path: string;
}

const storage = getStorage(app);

const IMMUTABLE_CACHE = "public,max-age=31536000,immutable";

function makeId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
  } catch {
    /* ignore */
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Resize + re-encode an image File to a WebP Blob.
 * `maxEdge` constrains the longest edge; aspect ratio is preserved.
 */
export async function fileToWebp(
  file: File | Blob,
  maxEdge = 800,
  quality = 0.82,
): Promise<Blob> {
  const dataUrl: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = () => reject(new Error("FileReader failed"));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image decode failed"));
    image.src = dataUrl;
  });

  let { width, height } = img;
  if (width > height) {
    if (width > maxEdge) {
      height = Math.round((height * maxEdge) / width);
      width = maxEdge;
    }
  } else if (height > maxEdge) {
    width = Math.round((width * maxEdge) / height);
    height = maxEdge;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context is null");
  ctx.drawImage(img, 0, 0, width, height);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("canvas.toBlob failed"))),
      "image/webp",
      quality,
    );
  });
}

/**
 * Upload an already-prepared Blob/File to Storage and return `{ url, path }`.
 * The `contentType` is honoured; defaults to the blob's own type.
 */
export async function uploadBlob(
  blob: Blob,
  folder = "uploads",
  ownerId?: string,
  ext = "webp",
  contentType = "image/webp",
): Promise<UploadResult> {
  const owner = (ownerId ?? "misc").replace(/[^a-zA-Z0-9_-]/g, "") || "misc";
  const path = `${folder}/${owner}/${Date.now()}-${makeId()}.${ext}`;
  const objectRef = ref(storage, path);
  const metadata: UploadMetadata = {
    contentType,
    cacheControl: IMMUTABLE_CACHE,
  };

  await new Promise<void>((resolve, reject) => {
    const task = uploadBytesResumable(objectRef, blob, metadata);
    task.on("state_changed", undefined, reject, () => resolve());
  });

  const url = await getDownloadURL(objectRef);
  return { url, path };
}

/**
 * High-level: take an image File, resize to WebP, upload, return `{ url, path }`.
 * Avatars use a smaller long edge; everything else uses 1200px.
 */
export async function uploadWebp(
  file: File,
  folder = "uploads",
  ownerId?: string,
): Promise<UploadResult> {
  const isAvatar = folder === "avatars";
  const maxEdge = isAvatar ? 400 : 1200;
  const quality = isAvatar ? 0.82 : 0.8;
  const webp = await fileToWebp(file, maxEdge, quality);
  return uploadBlob(webp, folder, ownerId, "webp", "image/webp");
}

/**
 * Upload a raw (non-image) file verbatim. Returns `{ url, path }`.
 */
export async function uploadRaw(
  file: File,
  folder = "uploads",
  ownerId?: string,
): Promise<UploadResult> {
  const ext = (file.name.split(".").pop() || "bin").toLowerCase();
  const contentType = file.type || "application/octet-stream";
  return uploadBlob(file, folder, ownerId, ext, contentType);
}

/**
 * Best-effort delete by Storage path. Swallows "object-not-found" and any
 * non-Storage paths (e.g. legacy base64 / external URLs that have no path).
 */
export async function deleteByPath(path?: string | null): Promise<void> {
  if (!path || /^https?:|^data:/i.test(path)) return;
  try {
    await deleteObject(ref(storage, path));
  } catch (err: any) {
    if (err?.code !== "storage/object-not-found") {
      console.warn(`[storage] deleteByPath failed for ${path}:`, err);
    }
  }
}

export { storage };