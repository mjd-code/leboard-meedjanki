import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

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
        const res = await apiFetch("/api/me");
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user && active) {
            setUser(data.user);
          } else if (active) {
            setUser(null);
          }
        } else if (active) {
          setUser(null);
        }
      } catch (err) {
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
