"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Eye, Award, History, Users, BookOpen } from "lucide-react";
import Image from "next/image";
import { apiFetch } from "@/lib/api";
import { resolveImageUrl } from "@/lib/gdrive";
import type { SejarahSection, Personnel } from "@/lib/types";

export default function SejarahTab() {
  const [sections, setSections] = useState<SejarahSection[]>([]);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [sRes, pRes] = await Promise.all([
          apiFetch("/api/sejarahContent"),
          apiFetch("/api/personnel"),
        ]);
        const s = sRes.ok ? ((await sRes.json()) as SejarahSection[]) : [];
        const p = pRes.ok ? ((await pRes.json()) as Personnel[]) : [];
        if (!cancelled) {
          setSections(Array.isArray(s) ? s : []);
          setPersonnel(Array.isArray(p) ? p : []);
        }
      } catch {
        /* silent — fall back to defaults below */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const sejarah = sections.find((s) => s.key === "sejarah");
  const visi = sections.find((s) => s.key === "visi");

  const defaultMisi = [
    {
      num: "01",
      title: "Transformasi Kurikulum Turats",
      desc: "Menyelenggarakan kajian berkala kitab kuning secara mendalam dan bersanad.",
    },
    {
      num: "02",
      title: "Akselerasi Tahfidz Mutqin",
      desc: "Membimbing santri menghafal Al-Qur'an 30 juz melalui sistem setoran dan tahsin yang ketat.",
    },
    {
      num: "03",
      title: "Pembinaan Akhlak Karimah",
      desc: "Menanamkan nilai-nilai spiritual dan keteladanan untuk mencetak pribadi ibadillah sholihin.",
    },
  ];
  const listMisi = useMemo(
    () =>
      visi?.misi && visi.misi.length > 0 ? visi.misi : defaultMisi,
    [visi],
  );

  const defaultMasyayikh: Personnel[] = [
    {
      id: "d1",
      kind: "masyayikh",
      name: "KH. Ahmad Zarkasyi",
      role: "Pengasuh Utama / Pendiri",
      photoUrl:
        "https://images.unsplash.com/photo-1566753323558-f4e0952af115?auto=format&fit=crop&w=300&q=80",
      order: 1,
      visible: true,
    },
    {
      id: "d2",
      kind: "masyayikh",
      name: "KH. Abdullah Syafi'i",
      role: "Mudir Ma'had",
      photoUrl:
        "https://images.unsplash.com/photo-1610088441520-4352b57e70d5?auto=format&fit=crop&w=300&q=80",
      order: 2,
      visible: true,
    },
  ];
  const defaultPengurus: Personnel[] = [
    { id: "p1", kind: "pengurus", name: "KH. Ahmad Zarkasyi", role: "Pimpinan Pesantren", order: 1, visible: true },
    { id: "p2", kind: "pengurus", name: "KH. Abdullah Syafi'i", role: "Wakil Pimpinan / Mudir", order: 2, visible: true },
  ];

  const masyayikhFromDb = personnel
    .filter((p) => p.kind === "masyayikh" && p.visible !== false)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const pengurusFromDb = personnel
    .filter((p) => p.kind === "pengurus" && p.visible !== false)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const listMasyayikh =
    masyayikhFromDb.length > 0 ? masyayikhFromDb : defaultMasyayikh;
  const listPengurus =
    pengurusFromDb.length > 0 ? pengurusFromDb : defaultPengurus;

  const showSejarah = sejarah ? sejarah.visible !== false : true;
  const showVisi = visi ? visi.visible !== false : true;

  const sejarahTitle = sejarah?.title || "Sejarah Berdirinya Lembaga";
  const sejarahBody =
    sejarah?.body ||
    "Didirikan pada tahun 1995 oleh KH. Ahmad Zarkasyi, pesantren ini bermula dari sebuah majelis taklim kecil di pelosok desa. Dengan niat tulus untuk membentengi generasi muda dari degradasi moral dan arus globalisasi, lembaga ini bertransformasi menjadi pesantren modern berbasis tahfidz dan kitab kuning.";
  const visiTitle = visi?.title || "VISI UTAMA";
  const visiBody =
    visi?.body ||
    "Terwujudnya generasi santri mutafaqqih fiddin yang berkarakter mulia, mutqin dalam hafalan Al-Qur'an, serta kompeten mengeksplorasi arsitektur teknologi global modern, demi mencetak pribadi Ibadillah Sholihin.";

  return (
    <div className="space-y-12">
      {/* 1. Sejarah Berdiri */}
      {showSejarah && (
        <div className="bg-neutral-900/40 border border-neutral-800/60 rounded-[2rem] p-6 sm:p-8 flex flex-col md:flex-row gap-6 items-center">
          <div className="p-4 rounded-2xl bg-amber-500/10 text-amber-500 shrink-0 self-start md:self-center">
            <History className="w-10 h-10" />
          </div>
          <div className="flex-1">
            <h2 className="font-display text-2xl font-black tracking-tight text-emerald-50 mb-3">
              {sejarahTitle}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed font-serif whitespace-pre-line">
              {sejarahBody}
            </p>
            {sejarah?.imageUrl && (
              <div className="mt-4 relative w-full aspect-video rounded-2xl overflow-hidden bg-neutral-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resolveImageUrl(sejarah.imageUrl)}
                  alt={sejarahTitle}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. Visi & Misi */}
      {showVisi && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 bg-gradient-to-b from-amber-950/20 to-neutral-950 border border-amber-900/30 rounded-[2rem] p-6 flex flex-col justify-between">
            <div>
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 w-max mb-4">
                <Eye className="w-5 h-5" />
              </div>
              <h2 className="font-display text-2xl font-black tracking-tight text-emerald-50">
                {visiTitle}
              </h2>
              <p className="text-sm text-muted-foreground mt-4 leading-relaxed font-medium font-serif italic whitespace-pre-line">
                {visiBody}
              </p>
            </div>
          </div>

        <div className="md:col-span-2 bg-neutral-900/40 border border-neutral-800/60 rounded-[2rem] p-6 sm:p-8 space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Award className="w-5 h-5" />
            </div>
            <h2 className="font-display text-xl font-bold tracking-tight">
              Misi Strategis
            </h2>
          </div>
          <ul className="space-y-4">
            {listMisi.map((misi) => (
              <li
                key={misi.num}
                className="flex gap-4 items-start p-4 bg-neutral-950/50 rounded-xl border border-neutral-800/50"
              >
                <span className="font-display text-lg font-black text-amber-500 bg-amber-500/10 w-8 h-8 rounded-lg flex items-center justify-center shrink-0">
                  {misi.num}
                </span>
                <div>
                  <h4 className="font-bold text-emerald-50 text-sm">
                    {misi.title}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {misi.desc}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        </div>
      )}

      {/* 3. Para Masyayikh */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <h2 className="font-display text-2xl font-bold tracking-tight">
            Dewan Masyayikh & Pimpinan Pesantren
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {listMasyayikh.map((syekh) => (
            <div
              key={syekh.id}
              className="bg-neutral-900/50 border border-neutral-800 rounded-2xl overflow-hidden flex flex-col"
            >
              <div className="w-full h-48 relative bg-neutral-800">
                {syekh.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={resolveImageUrl(syekh.photoUrl)}
                    alt={syekh.name}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : null}
              </div>
              <div className="p-4 flex flex-col flex-grow justify-between text-center">
                <div>
                  <h3 className="font-bold text-emerald-50 text-sm md:text-base">
                    {syekh.name}
                  </h3>
                  {syekh.role && (
                    <p className="text-xs text-amber-500 font-medium mt-1">
                      {syekh.role}
                    </p>
                  )}
                  {syekh.bio && (
                    <p className="text-[11px] text-muted-foreground mt-2 line-clamp-3">
                      {syekh.bio}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Struktur Kepengurusan */}
      <div className="bg-neutral-900/30 border border-neutral-800/80 rounded-[2rem] p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-400">
            <Users className="w-5 h-5" />
          </div>
          <h2 className="font-display text-2xl font-bold tracking-tight">
            Struktur Kepengurusan Lembaga
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {listPengurus.map((pengurus) => (
            <div
              key={pengurus.id}
              className="flex items-center justify-between p-4 bg-neutral-950/40 rounded-xl border border-neutral-800/40"
            >
              <div>
                <h4 className="font-semibold text-emerald-50 text-sm">
                  {pengurus.name}
                </h4>
                {pengurus.role && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {pengurus.role}
                  </p>
                )}
              </div>
              <div className="w-2 h-2 rounded-full bg-amber-500/60" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
