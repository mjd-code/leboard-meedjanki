import "@/index.css"; 
import React from 'react';
import type { Metadata, Viewport } from "next";
import { ClientLayout } from "@/components/layout/ClientLayout";
import { ReactQueryClientProvider } from "@/components/providers/ReactQueryClientProvider";
import { Toaster } from "sonner";
import { Tracker } from "@/components/Tracker";

export const metadata: Metadata = {
  title: "Leaderboard Siswa",
  description: "Aplikasi pencapaian poin siswa",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Leaderboard Siswa",
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
            <Toaster richColors position="top-right" />
          </ClientLayout>
        </ReactQueryClientProvider>
      </body>
    </html>
  );
}
