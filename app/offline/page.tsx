import React from "react";

export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6">
      <div className="text-5xl mb-4">📡</div>
      <h1 className="text-2xl font-bold mb-2">Anda sedang offline</h1>
      <p className="text-muted-foreground max-w-md">
        Halaman ini belum tersedia di cache. Sambungkan kembali ke internet,
        lalu coba lagi. Data yang sudah Anda buka tetap dapat diakses.
      </p>
    </div>
  );
}