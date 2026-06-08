/**
 * Google Drive shareable-link helpers.
 *
 * Extracts the file id from common Google Drive URL shapes and converts it
 * into a direct image-rendering URL that can be used as the `src` of an
 * `<img>` tag.
 *
 * Supported input shapes:
 *   - https://drive.google.com/file/d/<ID>/view?usp=sharing
 *   - https://drive.google.com/file/d/<ID>/preview
 *   - https://drive.google.com/open?id=<ID>
 *   - https://drive.google.com/uc?id=<ID>
 *   - https://docs.google.com/uc?id=<ID>
 *   - https://drive.google.com/thumbnail?id=<ID>
 *   - https://lh3.googleusercontent.com/d/<ID>
 *   - raw 25–60 char Drive file ids
 */

const FILE_ID_REGEX = /^[a-zA-Z0-9_-]{20,}$/;

const PATTERNS: RegExp[] = [
  /\/file\/d\/([a-zA-Z0-9_-]{20,})/,
  /[?&]id=([a-zA-Z0-9_-]{20,})/,
  /\/d\/([a-zA-Z0-9_-]{20,})/,
  /\/thumbnail\?id=([a-zA-Z0-9_-]{20,})/,
];

/** Returns the Drive file id, or `null` if the input is not a Drive URL. */
export function parseGDriveUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  if (FILE_ID_REGEX.test(trimmed) && !trimmed.includes("/")) return trimmed;

  for (const pattern of PATTERNS) {
    const match = trimmed.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

/** True if the URL looks like a Google Drive / Docs / GUserContent link. */
export function isGDriveUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  return /(?:drive\.google\.com|docs\.google\.com|googleusercontent\.com)/i.test(url);
}

/**
 * Convert a raw Drive shareable URL into a direct image URL.
 * Returns the original URL unchanged when it isn't a Drive link.
 */
export function resolveImageUrl(url: string | null | undefined): string {
  if (!url) return "";
  const id = parseGDriveUrl(url);
  if (!id) return url;
  // Modern, reliable for public images:
  return `https://lh3.googleusercontent.com/d/${id}=w1000`;
}

/** Classic fallback URL — useful as a second attempt if the primary 404s. */
export function gdriveFallbackUrl(url: string | null | undefined): string | null {
  const id = parseGDriveUrl(url);
  if (!id) return null;
  return `https://drive.google.com/uc?export=view&id=${id}`;
}
