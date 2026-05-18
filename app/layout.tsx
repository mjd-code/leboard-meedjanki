import "@/index.css";
import React from "react";
import type { Metadata, Viewport } from "next";
import { ClientLayout } from "@/components/layout/ClientLayout";
import { ReactQueryClientProvider } from "@/components/providers/ReactQueryClientProvider";
import { Toaster } from "sonner";
import { Tracker } from "@/components/Tracker";
import { OfflineIndicator } from "@/components/pwa/OfflineIndicator";
import { ServiceWorkerRegistrar } from "@/components/pwa/ServiceWorkerRegistrar";

export const metadata: Metadata = {
  title: "Leaderboard Santri",
  description: "Aplikasi pencapaian poin Santri",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Leaderboard Santri",
  },
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body>
        <ReactQueryClientProvider>
          <ClientLayout>
            {children}
            <Tracker />
            <OfflineIndicator />
            <ServiceWorkerRegistrar />
            <Toaster richColors position="top-right" />
          </ClientLayout>
        </ReactQueryClientProvider>
      </body>
    </html>
  );
}
