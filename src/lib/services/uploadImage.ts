import pLimit from "p-limit";
import { toast } from "sonner";

/**
 * Secondary Strategy: Base64 Firestore Storage
 * If a user must upload a custom image, we will store it directly in Firestore
 * as a Base64 string.
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

export async function uploadImageWithCompression(
  file: File,
  folder: string = "uploads",
  onProgress?: (progress: number) => void
): Promise<string> {
  // If it's an avatar, we use a tiny compression (Base64)
  // If it's a blog post cover, we'll still use Base64 but a bit larger, e.g. max 800px width.
  // Warning: Base64 strings can get large, but the user explicitly requested this to avoid Cloud Storage.
  // "Strictly for small logos/icons if needed"
  // Let's assume generic use case allows larger if needed, but we keep it small to avoid Firestore doc limits (1MB).
  const isLarge = folder !== 'avatars';
  
  if (onProgress) onProgress(50);
  const b64 = await imageToBase64(file, isLarge ? 600 : 100, isLarge ? 600 : 100, isLarge ? 0.6 : 0.5);
  if (onProgress) onProgress(100);
  
  return b64;
}

/**
 * Raw file upload (no compression). For PDFs, docs, csv, md, video, etc.
 * Returns a base64 data URL so callers can persist alongside other media.
 * NOTE: Firestore docs are capped at ~1MB — keep raw uploads small or swap to
 * Cloud Storage if your blob exceeds that.
 */
export async function uploadRawFile(
  file: File,
  _folder: string = 'uploads'
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = () => reject(new Error('FileReader failed to read file'));
    reader.readAsDataURL(file);
  });
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
