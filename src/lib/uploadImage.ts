import pLimit from "p-limit";
import { toast } from "sonner";
import { uploadWebp, uploadRaw, type UploadResult } from "./storage";

/**
 * Legacy fallback: Base64 encoding.
 * The primary pipeline now uploads resized WebP images to Firebase Storage
 * (see `src/lib/storage.ts`). This Base64 path is only used as a graceful
 * fallback when Storage is unavailable, so a single failed upload never blocks
 * the admin from saving a record.
 */
export async function imageToBase64(
  file: File,
  maxWidth = 100,
  maxHeight = 100,
  quality = 0.5
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", quality);
          resolve(dataUrl);
        } else {
          reject(new Error("Canvas context is null"));
        }
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Upload an image and return `{ url, path }`.
 * Primary path: resize → WebP → Firebase Storage.
 * Fallback (Storage error): inline Base64 data URL with no `path`.
 */
export async function uploadImageWithMeta(
  file: File,
  folder: string = "uploads",
  ownerId?: string,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  if (onProgress) onProgress(30);
  try {
    const result = await uploadWebp(file, folder, ownerId);
    if (onProgress) onProgress(100);
    return result;
  } catch (err) {
    console.warn("[uploadImage] Storage upload failed, falling back to Base64:", err);
    const isLarge = folder !== "avatars";
    const b64 = await imageToBase64(
      file,
      isLarge ? 600 : 100,
      isLarge ? 600 : 100,
      isLarge ? 0.6 : 0.5
    );
    if (onProgress) onProgress(100);
    return { url: b64, path: "" };
  }
}

/**
 * Backwards-compatible helper returning just the URL string.
 * Existing callers (batch upload, editor blocks) keep working unchanged.
 */
export async function uploadImageWithCompression(
  file: File,
  folder: string = "uploads",
  onProgress?: (progress: number) => void
): Promise<string> {
  const { url } = await uploadImageWithMeta(file, folder, undefined, onProgress);
  return url;
}

/**
 * Raw file upload (no compression). For PDFs, docs, csv, md, video, etc.
 * Uploads verbatim to Firebase Storage and returns the download URL.
 * Falls back to a Base64 data URL if Storage is unavailable.
 */
export async function uploadRawFile(
  file: File,
  folder: string = 'uploads'
): Promise<string> {
  try {
    const { url } = await uploadRaw(file, folder);
    return url;
  } catch (err) {
    console.warn("[uploadImage] Raw Storage upload failed, falling back to Base64:", err);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('FileReader failed to read file'));
      reader.readAsDataURL(file);
    });
  }
}

export async function batchUploadImages(
  files: File[],
  folder: string = "uploads",
  toastId?: string | number
): Promise<string[]> {
  if (!files || files.length === 0) return [];
  const limit = pLimit(3); 
  const total = files.length;
  let completed = 0;

  if (toastId) toast.loading(`Memproses 0 dari ${total} gambar...`, { id: toastId });

  try {
    const uploadPromises = files.map((file, index) => 
      limit(async () => {
        try {
          const url = await uploadImageWithCompression(file, folder);
          completed++;
          if (toastId) {
            toast.loading(`Memproses ${completed} dari ${total} gambar...`, { id: toastId });
          }
          return url;
        } catch (error: any) {
          if (toastId) toast.error(`Gagal convert ${file.name}: ${error.message || 'Unknown error'}`);
          throw error;
        }
      })
    );

    const results = await Promise.all(uploadPromises);
    if (toastId) {
      toast.dismiss(toastId);
      toast.success(`Berhasil memproses ${total} gambar!`);
    }
    return results;
  } catch (error) {
    if (toastId) {
      toast.dismiss(toastId);
      toast.error(`Proses batch gagal.`);
    }
    throw error;
  }
}
