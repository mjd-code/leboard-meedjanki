import { firebaseApiFetch } from './firebaseApi';
import type { Category, MasterGoal, Student, Group } from './types';

export const getLocalToken = () => {
  try {
    return localStorage.getItem('admin_token');
  } catch (e) {
    console.warn("localStorage is disabled or not accessible:", e);
    return window.__inMemoryToken || null;
  }
};

export const setLocalToken = (token: string) => {
  try {
    localStorage.setItem('admin_token', token);
    document.cookie = `admin_token=${token}; path=/; max-age=86400; SameSite=None; Secure`;
  } catch (e) {
    console.warn("localStorage is disabled, storing token in memory:", e);
    window.__inMemoryToken = token;
  }
};

export const removeLocalToken = () => {
  try {
    localStorage.removeItem('admin_token');
    document.cookie = 'admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=None; Secure';
  } catch (e) {
    window.__inMemoryToken = null;
  }
};

declare global {
  interface Window {
    __inMemoryToken?: string | null;
  }
}

export const apiFetch = async (url: string, options: RequestInit = {}) => {
  console.log(`[SSR DEBUG] apiFetch called for ${url}`);
  
  if (typeof window === 'undefined') {
    console.log(`[SSR DEBUG] Skipping apiFetch on server for ${url} to prevent Firebase hanging building process`);
    return new Response(JSON.stringify({}), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  const token = getLocalToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const isWrite = (options.method || 'GET').toUpperCase() !== 'GET';
  const TIMEOUT_MS = isWrite ? 10000 : 5000;
  const userSignal = (options as any).signal as AbortSignal | undefined;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(new DOMException('timeout', 'AbortError')), TIMEOUT_MS);
  if (userSignal) {
    if (userSignal.aborted) ctl.abort();
    else userSignal.addEventListener('abort', () => ctl.abort(), { once: true });
  }

  const doFetch = () => {
    console.log(`[apiFetch] Calling ${url}`);
    return url.startsWith('/api/')
      ? firebaseApiFetch(url, { ...options, headers, signal: ctl.signal })
      : fetch(url, { ...options, headers, credentials: 'same-origin', cache: 'no-store', signal: ctl.signal });
  };

  try {
    let res: Response;
    try {
      res = await doFetch();
    } catch (err: any) {
      console.warn(`[apiFetch] First attempt for ${url} failed:`, err);
      if (!isWrite && err?.name !== 'AbortError') {
        await new Promise((r) => setTimeout(r, 300));
        res = await doFetch();
      } else {
        throw err;
      }
    }
    if (res.status === 401) {
      removeLocalToken();
      if (token) {
        window.dispatchEvent(new Event('auth-expired'));
      }
    }
    console.log(`[apiFetch] Finished ${url} with status ${res.status}`);
    return res;
  } finally {
    clearTimeout(timer);
  }
};

export const fetchAppData = async () => {
  console.log("[fetchAppData] Starting fetches...");
  const [catsRes, goalsRes, studentsRes, settingsRes, groupsRes] = await Promise.all([
    apiFetch('/api/categories').catch(e => { console.error("CATS ERR", e); return { ok: false }; }),
    apiFetch('/api/masterGoals').catch(e => { console.error("GOALS ERR", e); return { ok: false }; }),
    apiFetch('/api/students').catch(e => { console.error("STUDENTS ERR", e); return { ok: false }; }),
    apiFetch('/api/settings').catch(e => { console.error("SETTINGS ERR", e); return { ok: false }; }),
    apiFetch('/api/groups').catch(e => { console.warn("GROUPS ERR (optional)", e); return { ok: false }; }),
  ]);
  
  console.log("[fetchAppData] Fetches completed.");

  const cats = catsRes.ok ? await (catsRes as Response).json() : [];
  const goals = goalsRes.ok ? await (goalsRes as Response).json() : [];
  const stus = studentsRes.ok ? await (studentsRes as Response).json() : [];
  let sets = settingsRes.ok ? await (settingsRes as Response).json() : {};
  const grps = groupsRes && (groupsRes as any).ok ? await (groupsRes as Response).json() : [];

  if (!sets || Object.keys(sets).length === 0 || !sets.primaryColor) {
    sets = {
      ...sets,
      primaryColor: { h: 144, s: 29, l: 20 },
      accentColor: { h: 34, s: 62, l: 57 },
      bgColor: { h: 79, s: 29, l: 92 },
      textColor: { h: 144, s: 18, l: 15 },
      appName: sets.appName || 'Tiny Tree',
      badgeTitle: sets.badgeTitle || 'Bonsai Collection',
      heroTitle: sets.heroTitle || 'Bonsai',
      heroSubtitle: sets.heroSubtitle || 'The fascinating and amazing world of Bonsai.'
    };
  }

  if (sets.appName) document.title = sets.appName;
  
  return {
    categories: (Array.isArray(cats) ? cats : []) as Category[],
    masterGoals: (Array.isArray(goals) ? goals : []) as MasterGoal[],
    students: (Array.isArray(stus) ? stus : []) as Student[],
    groups: (Array.isArray(grps) ? grps : []) as Group[],
    appSettings: sets
  };
};
