"use client";

import { useAppDataQuery } from "@/hooks/useAppQueries";
import { LoginPage as LoginComponent } from "@/components/pages/LoginPage";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { trackEvent } from "@/lib/analytics";

export default function LoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: appData } = useAppDataQuery();
  const appSettings = appData?.appSettings || {};

  return (
    <LoginComponent 
      onLogin={() => {
        queryClient.invalidateQueries({ queryKey: ["auth"] });
        trackEvent("admin_login", { isAdmin: true });
        router.push("/admin");
      }} 
      appSettings={appSettings} 
    />
  );
}
