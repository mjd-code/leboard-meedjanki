"use client";
import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6">
      <h1 className="text-6xl font-black mb-4">404</h1>
      <p className="text-muted-foreground mb-8 text-lg">Halaman tidak ditemukan</p>
      <Link href="/" className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold hover:bg-primary-700 transition-colors">
        Kembali ke Beranda
      </Link>
    </div>
  );
}
