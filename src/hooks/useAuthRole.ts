import { useEffect, useState } from "react";
import { getLocalToken } from "@/lib/auth";
import { resolveCurrentUser } from "@/lib/auth-login";

type AdminRole = "super_admin" | "admin";

interface UserInfo {
  id: string;
  email: string;
  full_name: string;
  photo_url?: string;
  role: AdminRole;
  privileges: string[];
}

export function useAuthRole() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function check() {
      try {
        const u = await resolveCurrentUser(getLocalToken());
        if (active) setUser(u as any);
      } catch {
        if (active) setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    check();

    const handleLogout = () => { if (active) setUser(null); };
    window.addEventListener("auth-expired", handleLogout);
    return () => {
      active = false;
      window.removeEventListener("auth-expired", handleLogout);
    };
  }, []);

  return {
    user,
    loading,
    role: user?.role || null,
    isSuperAdmin: user?.role === "super_admin",
    isAdmin: user?.role === "admin" || user?.role === "super_admin", // Super admin has admin rights too
    canEditUsers: user?.role === "super_admin",
  };
}
