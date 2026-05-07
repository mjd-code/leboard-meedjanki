// Lightweight client-side auth token storage. Replaces the legacy
// `getLocalToken`/`setLocalToken`/`removeLocalToken` helpers from
// `src/lib/api.ts`.

declare global {
  interface Window {
    __inMemoryToken?: string | null;
  }
}

export const TOKEN_KEY = "admin_token";

export function getLocalToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return window.__inMemoryToken || null;
  }
}

export function setLocalToken(token: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TOKEN_KEY, token);
    document.cookie = `${TOKEN_KEY}=${token}; path=/; max-age=86400; SameSite=None; Secure`;
  } catch {
    window.__inMemoryToken = token;
  }
}

export function removeLocalToken(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(TOKEN_KEY);
    document.cookie = `${TOKEN_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=None; Secure`;
  } catch {
    window.__inMemoryToken = null;
  }
}