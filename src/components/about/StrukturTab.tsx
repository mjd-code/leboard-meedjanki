"use client";

import React from "react";
import { GraduationCap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { Student } from "@/lib/types";

export default function StrukturTab() {
  const { data: students = [] } = useQuery<Student[]>({
    queryKey: ["public-students"],
    queryFn: async () => {
      const res = await apiFetch("/api/students");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const pengurus = [
    {
      nama: "KH. Ahmad Dahlan, M.Pd.I",
      jabatan: "Pengasuh Utama",
      role: "Mengarahkan visi keislaman.",
    },
    {
      nama: "Ust. Muhammad Rizqi, S.Kom",
      jabatan: "Ketua Pondok",
      role: "Mengawasi integrasi teknologi.",
    },
  ];

  return (
    <div className="bg-black border border-emerald-950 rounded-[2rem] p-6 sm:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
          <GraduationCap className="w-5 h-5" />
        </div>
        <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight">
          Masyayikh & Khadimul Ma'had
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
        {pengurus.map((p, idx) => (
          <div
            key={idx}
            className="p-5 rounded-2xl border border-neutral-900 bg-neutral-950/40 flex flex-col justify-between"
          >
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-amber-500">
                {p.jabatan}
              </p>
              <h4 className="font-display text-base font-black text-emerald-50 mt-1.5">
                {p.nama}
              </h4>
              <p className="text-xs text-muted-foreground mt-2">{p.role}</p>
            </div>
          </div>
        ))}
      </div>
      {students.length > 0 && (
        <div className="mt-4 p-4 rounded-xl border border-emerald-900/20 bg-emerald-950/10 text-center text-xs font-medium text-emerald-400">
          Mengayomi total akumulasi {students.length} santri terdaftar aktif.
        </div>
      )}
    </div>
  );
}
