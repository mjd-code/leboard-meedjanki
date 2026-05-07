import { getDocs } from "firebase/firestore";
import { adminUsersCol } from "./firebase/collections";

const ADMIN_PASSWORD = "janki_app";
const SUPER_TOKEN = "client-admin-token";

export interface LoginResult {
  ok: boolean;
  token?: string;
  role?: string;
  id?: string;
  error?: string;
}

/** Direct Firestore login. Mirrors the legacy /api/login route. */
export async function loginAdmin(email: string, password: string): Promise<LoginResult> {
  const cleanEmail = (email || "").toLowerCase();
  if (!cleanEmail && password === ADMIN_PASSWORD) {
    return { ok: true, token: SUPER_TOKEN, role: "super_admin" };
  }
  if (cleanEmail) {
    try {
      const snap = await getDocs(adminUsersCol);
      const users = snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as any) }));
      const found = users.find(
        (u: any) => (u.email || "").toLowerCase() === cleanEmail && u.password === password,
      );
      if (found) {
        return { ok: true, token: `usr_${found.id}`, role: found.role, id: found.id };
      }
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  }
  return { ok: false, error: "Incorrect credentials" };
}

export interface CurrentUser {
  id: string;
  role: string;
  email: string;
  full_name: string;
  privileges: string[];
}

/** Resolve the current user from a token (legacy /api/me). */
export async function resolveCurrentUser(token: string | null): Promise<CurrentUser | null> {
  if (!token) return null;
  if (token === SUPER_TOKEN) {
    return {
      id: "legacy",
      role: "super_admin",
      email: "admin@system",
      full_name: "System Admin",
      privileges: [],
    };
  }
  if (token.startsWith("usr_")) {
    const id = token.slice(4);
    try {
      const snap = await getDocs(adminUsersCol);
      const user = snap.docs.find((d: any) => d.id === id);
      if (user) {
        const { password: _p, ...safe } = user.data() as any;
        return { id, ...(safe as any) } as CurrentUser;
      }
    } catch (e) {
      console.warn("[auth] resolveCurrentUser failed", e);
    }
  }
  return null;
}