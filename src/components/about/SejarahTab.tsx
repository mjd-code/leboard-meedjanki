"use client";

import React from "react";
import { Eye, Award, History, Users, BookOpen } from "lucide-react";
import Image from "next/image";

export default function SejarahTab() {
  const listMisi = [
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

  const listMasyayikh = [
    {
      id: 1,
      nama: "KH. Ahmad Zarkasyi",
      jabatan: "Pengasuh Utama / Pendiri",
      foto: "https://images.unsplash.com/photo-1566753323558-f4e0952af115?auto=format&fit=crop&w=300&q=80",
    },
    {
      id: 2,
      nama: "KH. Abdullah Syafi'i",
      jabatan: "Mudir Ma'had",
      foto: "https://images.unsplash.com/photo-1610088441520-4352b57e70d5?auto=format&fit=crop&w=300&q=80",
    },
    {
      id: 3,
      nama: "K.H. M. Cholil Nafis, Lc., M.A.",
      jabatan: "Dewan Pembina & Ahli Falak",
      foto: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80",
    },
    {
      id: 4,
      nama: "Ustadz H. Ibrahim, M.Pd.I",
      jabatan: "Kepala Bidang Pendidikan",
      foto: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80",
    },
  ];

  const listPengurus = [
    { nama: "KH. Ahmad Zarkasyi", peran: "Pimpinan Pesantren" },
    { nama: "KH. Abdullah Syafi'i", peran: "Wakil Pimpinan / Mudir" },
    { nama: "Ustadz H. Ibrahim, M.Pd.I", peran: "Bagian Kurikulum & Akademik" },
    { nama: "Ustadzah Fatimah, S.Pd.I", peran: "Kepala Asrama Putri" },
    { nama: "Ustadz M. Yusuf, S.Kom", peran: "Bagian Sarana Prasarana & IT" },
    { nama: "Ustadzah Aisyah, M.Pd", peran: "Bendahara Pesantren" },
    { nama: "Ustadz Umar bin Khattab", peran: "Pengurus Harian & Keamanan" },
    { nama: "Ustadzah Khadijah, Lc.", peran: "Musyrifah Tahfidz" },
  ];

  return (
    <div className="space-y-12">
      {/* 1. Sejarah Berdiri */}
      <div className="bg-neutral-900/40 border border-neutral-800/60 rounded-[2rem] p-6 sm:p-8 flex flex-col md:flex-row gap-6 items-center">
        <div className="p-4 rounded-2xl bg-amber-500/10 text-amber-500 shrink-0 self-start md:self-center">
          <History className="w-10 h-10" />
        </div>
        <div>
          <h2 className="font-display text-2xl font-black tracking-tight text-emerald-50 mb-3">
            Sejarah Berdirinya Lembaga
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed font-serif">
            Didirikan pada tahun 1995 oleh{" "}
            <strong className="text-amber-400">KH. Ahmad Zarkasyi</strong>,
            pesantren ini bermula dari sebuah majelis taklim kecil di pelosok
            desa. Dengan niat tulus untuk membentengi generasi muda dari
            degradasi moral dan arus globalisasi, lembaga ini bertransformasi
            menjadi pesantren modern berbasis tahfidz dan kitab kuning. Hingga
            saat ini, pesantren terus berkembang menjadi wadah pencetak
            kader-kader ulama dan intelektual yang berakhlak mulia.
          </p>
        </div>
      </div>

      {/* 2. Visi & Misi */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 bg-gradient-to-b from-amber-950/20 to-neutral-950 border border-amber-900/30 rounded-[2rem] p-6 flex flex-col justify-between">
          <div>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 w-max mb-4">
              <Eye className="w-5 h-5" />
            </div>
            <h2 className="font-display text-2xl font-black tracking-tight text-emerald-50">
              VISI UTAMA
            </h2>
            <p className="text-sm text-muted-foreground mt-4 leading-relaxed font-medium font-serif italic">
              "Terwujudnya generasi santri mutafaqqih fiddin yang berkarakter
              mulia, mutqin dalam hafalan Al-Qur'an, serta kompeten
              mengeksplorasi arsitektur teknologi global modern, demi mencetak
              pribadi{" "}
              <span className="text-amber-400 font-bold not-italic">
                Ibadillah Sholihin
              </span>
              ."
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
                <Image
                  src={syekh.foto}
                  alt={syekh.nama}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover"
                />
              </div>
              <div className="p-4 flex flex-col flex-grow justify-between text-center">
                <div>
                  <h3 className="font-bold text-emerald-50 text-sm md:text-base">
                    {syekh.nama}
                  </h3>
                  <p className="text-xs text-amber-500 font-medium mt-1">
                    {syekh.jabatan}
                  </p>
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
          {listPengurus.map((pengurus, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-4 bg-neutral-950/40 rounded-xl border border-neutral-800/40"
            >
              <div>
                <h4 className="font-semibold text-emerald-50 text-sm">
                  {pengurus.nama}
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {pengurus.peran}
                </p>
              </div>
              <div className="w-2 h-2 rounded-full bg-amber-500/60" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
