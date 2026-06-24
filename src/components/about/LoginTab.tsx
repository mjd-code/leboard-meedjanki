"use client";

import React, { useState } from "react";
import { Loader2, ShieldCheck, Mail, Lock } from "lucide-react";
import { apiFetch, setLocalToken } from "../../lib/api";

export default function LoginTab({
  onLogin,
  appSettings,
}: {
  onLogin: () => void;
  appSettings?: any;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await apiFetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      // Ambil data JSON baik response ok maupun error untuk detail pesan dari backend
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        if (data.token) {
          setLocalToken(data.token);
        }
        onLogin();
      } else {
        // Gunakan pesan error dari API jika ada, jika tidak gunakan fallback default
        setError(
          data.message ||
            "Kredensial salah. Silakan periksa kembali email dan kata sandi Anda.",
        );
      }
    } catch (err) {
      console.error("Login fetch error:", err);
      setError(
        "Gagal terhubung ke server. Silakan periksa koneksi internet Anda.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto pt-10 pb-16">
      {/* Card dengan aksen warna Emerald & Amber Border */}
      <div className="bg-neutral-900/60 rounded-2xl p-8 border border-emerald-900/30 backdrop-blur-md shadow-xl relative overflow-hidden">
        {/* Dekorasi Glow Latar Belakang Kecil */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[50px] pointer-events-none rounded-full" />

        <div className="text-center mb-8 relative z-10">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-4 text-amber-400 shadow-inner">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-100">
            {appSettings?.appName || "PPMH Insight Admin"}
          </h1>
          <p className="text-xs text-muted-foreground mt-1.5 max-w-[280px] mx-auto leading-relaxed">
            Portal otorisasi terbatas. Akses hanya diberikan kepada pengurus dan
            pengembang resmi.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
          {/* Input Email */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-emerald-400">
              Alamat Email
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-neutral-950/50 border border-emerald-900/40 text-sm text-slate-200 placeholder:text-neutral-600 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all outline-none"
                placeholder="admin@example.com"
              />
            </div>
          </div>

          {/* Input Password */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-emerald-400">
              Kata Sandi Akses
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-neutral-950/50 border border-emerald-900/40 text-sm text-slate-200 placeholder:text-neutral-600 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all outline-none"
                placeholder="••••••••"
                required
              />
            </div>

            {/* Alert Error */}
            {error && (
              <div className="text-red-400 text-xs mt-2 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg font-medium flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1">
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Button Submit Majestic Theme */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 py-3 rounded-xl text-white font-bold text-sm tracking-wide uppercase shadow-lg shadow-emerald-950/50 hover:bg-emerald-500 active:scale-[0.98] disabled:opacity-50 disabled:scale-100 transition-all flex items-center justify-center gap-2 border border-emerald-500/20 mt-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Otorisasi Akses"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
