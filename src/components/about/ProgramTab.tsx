"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  GraduationCap,
  FileCheck,
  Layers,
} from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { motion, AnimatePresence } from "motion/react";
import { useAppDataQuery } from "@/hooks/useAppQueries";
import {
  buildHierarchy,
  FALLBACK_GROUP_ID,
  FALLBACK_CATEGORY_ID,
} from "@/lib/hierarchy";

interface ProgramTabProps {
  createWheelHandler: (
    ref: React.RefObject<HTMLDivElement | null>,
  ) => (e: WheelEvent) => void;
}

export default function ProgramTab({ createWheelHandler }: ProgramTabProps) {
  // Ref khusus untuk menangkap container area Carousel Program
  const programCarouselRef = useRef<HTMLDivElement>(null);

  // Autoplay berjalan lambat dan akan mati ketika user melakukan klik manual
  const [isAutoplayEnabled, setIsAutoplayEnabled] = useState(true);
  const pluginProgram = useRef(
    Autoplay({ delay: 6000, stopOnInteraction: true, stopOnMouseEnter: true }),
  );

  // 1. Live data dari admin Goals (Group → Category → Goal)
  const { data: appData } = useAppDataQuery();
  const liveGroups = appData?.groups || [];
  const liveCategories = appData?.categories || [];
  const liveGoals = appData?.masterGoals || [];

  const FALLBACK_PROGRAMS = useMemo(
    () => [
      {
        id: "klasikal-diniyah",
        title: "Klasikal (Diniyah Kelas 1-6)",
        shortDesc:
          "Program madrasah berjenjang terstruktur dari kelas 1 sampai 6 untuk penguasaan ilmu agama dasar.",
        icon: "🏫",
        fullDesc:
          "Program Klasikal Madrasah Diniyah dirancang mengikuti struktur sekolah pada umumnya dengan masa belajar berkesinambungan selama 6 tahun. Fokus utama program ini adalah penanaman akidah tauhid, pembiasaan akhlak mulia, penguasaan dasar fikih ibadah praktis, serta tarikh islam untuk membangun fondasi keagamaan anak yang kokoh.",
        curriculum: [
          {
            level: "Fase Dasar: Kelas 1 - 2 (Ula)",
            detail:
              "Pengenalan huruf hijaiyah, penulisan arab dasar, hafalan doa harian, pengenalan rukun iman/islam, serta bimbingan adab akhlak kepada orang tua dan guru.",
          },
          {
            level: "Fase Menengah: Kelas 3 - 4 (Wustha)",
            detail:
              "Pendalaman fiqih ibadah dasar (bersuci & tata cara shalat wajib), membaca kitab ringkas (Safinatun Najah), sirah nabawiyah, dan kelancaran membaca Al-Qur'an.",
          },
          {
            level: "Fase Lanjut: Kelas 5 - 6 (Ulya)",
            detail:
              "Pengenalan kaidah tata bahasa arab dasar, pendalaman aqidah (kitab Aqidatul Awam), fiqih muamalah mendasar, dan persiapan kelulusan ujian akhir madrasah.",
          },
        ],
        requirements: [
          {
            item: "Persyaratan Masuk",
            detail:
              "Minimal usia 7 tahun, mampu berkomunikasi dengan baik, dan mengikuti tes pemetaan kemampuan membaca huruf hijaiyah.",
          },
          {
            item: "Persyaratan Lulus & Sertifikasi",
            detail:
              "Menyelesaikan studi hingga kelas 6, tingkat kehadiran minimal 80%, serta lulus Ujian Akhir Madrasah (UAM) baik teori maupun praktik ibadah.",
          },
        ],
      },
      {
        id: "modular-tahfidz",
        title: "Modular: Tahfidz Surat Penting",
        shortDesc:
          "Program akselerasi hafalan fokus kualitas (mutqin) mencakup Juz Amma dan surat-surat pilihan.",
        icon: "📖",
        fullDesc:
          "Program modular bergaya ekstrakurikuler yang menitikberatkan pada kualitas hafalan yang kuat (mutqin), kefasihan makhraj, dan ketepatan tajwid, bukan sekadar mengejar kuantitas juz. Santri dibimbing secara intensif untuk menghafal Surah Al-A'la sampai An-Nas, serta surat-surat pilihan berfadhilah besar yaitu Surah Yasin, Al-Mulk, dan Al-Waqi'ah.",
        curriculum: [
          {
            level: "Tingkat 1: Tahsin & Juz Amma (Al-A'la s.d An-Nas)",
            detail:
              "Standardisasi makharijul huruf, ketukan mad, dan gunnah. Target kelulusan tingkat ini adalah hafalan mutqin dari Surah Al-A'la hingga Surah An-Nas.",
          },
          {
            level: "Tingkat 2: Ziyadah Surat Pilihan (Yasin & Al-Waqi'ah)",
            detail:
              "Pemberian setoran hafalan baru untuk Surah Yasin dan Surah Al-Waqi'ah dibarengi pemahaman terjemahan ayat secara global.",
          },
          {
            level: "Tingkat 3: Finalisasi & Itqan (Surah Al-Mulk)",
            detail:
              "Penyelesaian setoran Surah Al-Mulk dilanjutkan dengan program murajaah berkala untuk memperkuat ingatan dari seluruh surat yang telah dihafalkan.",
          },
        ],
        requirements: [
          {
            item: "Persyaratan Masuk",
            detail:
              "Lulus tes membaca Al-Qur'an dengan tajwid standar (tidak terbata-bata) dan memiliki komitmen disiplin waktu setoran.",
          },
          {
            item: "Persyaratan Lulus & Sertifikasi",
            detail:
              "Dinyatakan lulus setelah menempuh Ujian Sema'an Bil Ghaib (sekali duduk tanpa melihat mushaf) di hadapan Dewan Penguji dengan predikat minimal Jayyid.",
          },
        ],
      },
      {
        id: "modular-ilmu-alat",
        title: "Modular: Kajian Ilmu Alat",
        shortDesc:
          "Metode cepat membaca kitab kuning melalui sistem Al-Miftah Lil Ulum dan praktik Fathul Qorib.",
        icon: "🛠️",
        fullDesc:
          "Inkubator gramatika Arab super intensif untuk membekali santri kemampuan membaca, mengurai, dan memahami naskah kitab klasik/gundul. Menggunakan kurikulum akselerasi bersistematis tinggi dari Al-Miftah Lil Ulum Jilid 1 sampai 4, Al-Miftah Tashrif, serta langsung diaplikasikan pada forum Praktik Fathul Qorib.",
        curriculum: [
          {
            level: "Fase 1: Al-Miftah Jilid 1 & 2",
            detail:
              "Penguasaan konsep dasar kata (Isim, Fi'il, Huruf), karakteristik i'rab, serta pengenalan susunan kalimat sederhana (Mubtada'-Khabar, Fi'il-Fa'il).",
          },
          {
            level: "Fase 2: Al-Miftah Jilid 3, 4 & Tashrif",
            detail:
              "Pendalaman amil-amil pengubah kalimat, fungsi tawabi', serta penguasaan rumus perubahan bentuk kata (Shorof) melalui Kitab Al-Miftah Tashrif.",
          },
          {
            level: "Fase 3: Praktik Kitab Fathul Qorib",
            detail:
              "Penerapan langsung membaca kitab fiqih kosongan (Fathul Qorib Al-Mujib), mengurai kedudukan sintaksis kata, mengartikan, serta menjelaskan landasan hukumnya.",
          },
        ],
        requirements: [
          {
            item: "Persyaratan Masuk",
            detail:
              "Mampu membaca tulisan arab berharakat dengan lancar dan memahami konsep dasar pemisahan kalimat bahasa arab.",
          },
          {
            item: "Persyaratan Lulus & Sertifikasi",
            detail:
              "Lulus Imtihan Fathul Qorib (membaca lembaran kitab acak pilihan penguji secara spontan tanpa harakat dan wajib mengurai struktur nahwu/sharafnya).",
          },
        ],
      },
      {
        id: "modular-tilawah-imla",
        title: "Modular: Tilawah & Imla'",
        shortDesc:
          "Seni melantunkan ayat Al-Qur'an dengan nagham serta keterampilan menulis imla' arab secara presisi.",
        icon: "✍️",
        fullDesc:
          "Kombinasi program estetika Al-Qur'an dan linguistik praktis. Santri dilatih seni membaca Al-Qur'an dengan variasi lagu (Nagham Mujawwad) sekaligus diasah kemampuannya dalam mendengarkan teks arab lalu menuliskannya secara cepat dan tepat sesuai kaidah khat standard.",
        curriculum: [
          {
            level: "Materi Imla' Dasar & Khat",
            detail:
              "Kaidah menyambung huruf hijaiyah, penulisan Ta' Marbuthah vs Maftuhah, kaidah Hamzah Washal/Qatha', serta estetika penulisan Naskhi.",
          },
          {
            level: "Seni Tilawah & Maqamat Qur'an",
            detail:
              "Pengenalan seni olah vokal, teknik pernapasan, serta penguasaan macam-macam lagu dasar tilawah seperti Bayati, Shoba, Hijaz, dan Nahawand.",
          },
        ],
        requirements: [
          {
            item: "Persyaratan Masuk",
            detail:
              "Telah tuntas belajar Diniyah tingkat dasar atau setara, serta memiliki kepekaan dasar terhadap ketukan nada/bacaan.",
          },
          {
            item: "Persyaratan Lulus & Sertifikasi",
            detail:
              "Mendapatkan nilai minimal 75 pada imtihan imla' dikte tulisan kosongan, serta mampu mendemonstrasikan minimal 3 jenis lagu tilawah dengan fasih.",
          },
        ],
      },
      {
        id: "modular-amaliyah-dasar",
        title: "Modular: Amaliyah Dasar",
        shortDesc:
          "Standardisasi dan praktik langsung tata cara ibadah harian individu (Fardhu 'Ain) secara valid.",
        icon: "💧",
        fullDesc:
          "Fokus pada perbaikan mutu ibadah personal santri sehari-hari. Program ini memastikan seluruh gerakan, niat, dan bacaan thaharah (bersuci) maupun shalat lima waktu santri telah valid dan sesuai dengan koridor hukum fiqih mazhab Syafi'i.",
        curriculum: [
          {
            level: "Modul Fiqih Thaharah Praktis",
            detail:
              "Simulasi wudhu yang sah, tayamum dalam kondisi darurat, mandi wajib, serta tata cara membersihkan berbagai jenis najis (mukhaffafah, mutawassithah, mughalladhah).",
          },
          {
            level: "Modul Sifat Shalat Fardhu",
            detail:
              "Praktek presisi gerakan takbir, ruku', sujud, itidal, hingga duduk tasyahud disertai pemantapan kefasihan pelafalan bacaan wajib dan sunnah shalat.",
          },
        ],
        requirements: [
          {
            item: "Persyaratan Masuk",
            detail:
              "Terbuka bagi seluruh jenjang usia santri yang ingin memvalidasi ketepatan ibadah harian mereka.",
          },
          {
            item: "Persyaratan Lulus & Sertifikasi",
            detail:
              "Lulus tes praktik langsung (live testing) ibadah thaharah dan shalat fardhu secara mandiri di hadapan tim penguji asatidzah tanpa kesalahan fatal.",
          },
        ],
      },
      {
        id: "modular-amaliyah-menengah",
        title: "Modular: Amaliyah Menengah",
        shortDesc:
          "Pendalaman shalat-shalat sunnah, manajemen shalat jamaah, dan amalan wirid kemasyarakatan.",
        icon: "🌙",
        fullDesc:
          "Program lanjutan untuk membiasakan santri pada amalan sunnah reguler serta keterlibatan sosial-keagamaan. Materi mencakup tata cara shalat jamaah (makmum masbuq), shalat sunnah rawatib, dhuha, tahajjud, serta tata cara memimpin tahlilan dan istighosah.",
        curriculum: [
          {
            level: "Modul Shalat Jamaah & Sujud Sunnah",
            detail:
              "Ketentuan makmum masbuq, cara menggantikan posisi imam yang batal, tata cara shalat jamak-qashar, serta praktik sujud sahwi, sujud tilawah, dan sujud syukur.",
          },
          {
            level: "Modul Tradisi Wirid & Dzikir Gema",
            detail:
              "Hafalan runtutan wirid setelah shalat, struktur pembacaan tahlil, yasinan berjamaah, serta doa-doa selamatan/hajat khas kemasyarakatan.",
          },
        ],
        requirements: [
          {
            item: "Persyaratan Masuk",
            detail:
              "Telah dinyatakan lulus dari sertifikasi program Amaliyah Dasar madrasah.",
          },
          {
            item: "Persyaratan Lulus & Sertifikasi",
            detail:
              "Mampu bertindak sebagai imam shalat rawatib dalam ujian simulasi, serta lancar memimpin majelis tahlil tanpa memegang buku panduan.",
          },
        ],
      },
      {
        id: "modular-amaliyah-lanjut",
        title: "Modular: Amaliyah Lanjut",
        shortDesc:
          "Keterampilan tingkat lanjut fardhu kifayah perawatan jenazah dan seni khutbah/retorika dakwah.",
        icon: "🎓",
        fullDesc:
          "Mempersiapkan santri sebagai penggerak utama di masyarakat untuk memenuhi kewajiban kolektif (Fardhu Kifayah) serta membekali mereka keterampilan berdakwah. Fokus utama program ini adalah perawatan jenazah total serta teknik khutbah Jum'at yang sah secara syar'i.",
        curriculum: [
          {
            level: "Modul Tajhizul Janazah (Perawatan Jenazah)",
            detail:
              "Praktik memandikan jenazah, teknik memotong dan melipat kain kafan, tata cara menshalatkan jenazah laki-laki/perempuan, hingga rukun penguburan.",
          },
          {
            level: "Modul Muhadharah & Khutbah Jum'at",
            detail:
              "Pendalaman rukun-rukun dua khutbah Jum'at, penyusunan teks ceramah yang ringkas dan padat, serta pelatihan mental berbicara di depan publik (public speaking).",
          },
        ],
        requirements: [
          {
            item: "Persyaratan Masuk",
            detail:
              "Santri minimal kelas 5 Klasikal Diniyah atau telah lulus sertifikasi Amaliyah Menengah.",
          },
          {
            item: "Persyaratan Lulus & Sertifikasi",
            detail:
              "Lulus ujian membungkus manekin jenazah sesuai aturan kain kafan, serta lulus praktik penyampaian Khutbah Jum'at lengkap dengan rukun bahasa arabnya.",
          },
        ],
      },
    ],
    [],
  );

  // Bangun programDatabase dari hierarki live; fallback ke konten statis
  // jika admin belum mengisi Group/Category/Goal.
  const programDatabase = useMemo(() => {
    if (!liveGroups.length) return FALLBACK_PROGRAMS;
    const tree = buildHierarchy(liveGroups, liveCategories, liveGoals);
    const mapped = tree
      .filter(
        (n) =>
          n.group.id !== FALLBACK_GROUP_ID &&
          (n.categories.length > 0 || n.group.description),
      )
      .map((n) => {
        const curriculum = n.categories
          .filter((c) => c.category.id !== FALLBACK_CATEGORY_ID)
          .map((c) => ({
            level: c.category.name,
            detail:
              c.category.description ||
              (c.goals.length
                ? `${c.goals.length} materi/tugas dalam fase ini.`
                : "Detail kurikulum belum diisi."),
          }));
        const requirements = n.categories.flatMap((c) =>
          c.goals.map((g) => ({
            item: g.title,
            detail: g.description || "Detail belum diisi.",
          })),
        );
        return {
          id: n.group.id,
          title: n.group.name,
          icon: n.group.icon || "📚",
          shortDesc:
            n.group.description ||
            `${n.categories.length} fase kurikulum, ${requirements.length} materi.`,
          fullDesc:
            n.group.longDescription ||
            n.group.description ||
            "Deskripsi program belum diisi oleh admin.",
          curriculum: curriculum.length
            ? curriculum
            : [
                {
                  level: "Belum ada fase kurikulum",
                  detail: "Tambahkan kategori pada grup ini di admin.",
                },
              ],
          requirements: requirements.length
            ? requirements
            : [
                {
                  item: "Belum ada persyaratan",
                  detail: "Tambahkan tugas pada kategori di admin.",
                },
              ],
        };
      });
    return mapped.length ? mapped : FALLBACK_PROGRAMS;
  }, [liveGroups, liveCategories, liveGoals, FALLBACK_PROGRAMS]);

  // State Program yang Sedang Aktif (Default: Klasikal Diniyah)
  const [selectedProgram, setSelectedProgram] = useState<string>(
    programDatabase[0]?.id || "",
  );

  // Sync selectedProgram saat live data masuk (id pertama berubah).
  useEffect(() => {
    if (
      !programDatabase.find((p) => p.id === selectedProgram) &&
      programDatabase[0]
    ) {
      setSelectedProgram(programDatabase[0].id);
    }
  }, [programDatabase, selectedProgram]);

  // State untuk melacak Accordion Kurikulum & Sertifikasi yang terbuka di bagian bawah
  const [openCurriculumIdx, setOpenCurriculumIdx] = useState<number | null>(
    null,
  );
  const [openReqIdx, setOpenReqIdx] = useState<number | null>(null);

  // --- PASANG HORIZONTAL WHEEL SCROLL PADA BAGIAN CAROUSEL ---
  useEffect(() => {
    const progContainer = programCarouselRef.current;
    if (progContainer) {
      const handleProgWheel = createWheelHandler(programCarouselRef);
      progContainer.addEventListener("wheel", handleProgWheel, {
        passive: false,
      });
      return () => {
        progContainer.removeEventListener("wheel", handleProgWheel);
      };
    }
  }, [createWheelHandler]);

  // Ambil objek data program yang aktif saat ini
  const activeProgramData = useMemo(() => {
    return (
      programDatabase.find((p) => p.id === selectedProgram) ||
      programDatabase[0]
    );
  }, [programDatabase, selectedProgram]);

  return (
    <div className="space-y-8 md:space-y-12 pb-10">
      {/* --- ETALASE ATAS: CAROUSEL PROGRAM UNGGULAN FILTER --- */}
      <div className="bg-neutral-900/20 border border-neutral-800/60 rounded-[2rem] p-5 sm:p-6 lg:p-8 space-y-6 overflow-hidden shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-lg sm:text-xl font-bold tracking-tight">
                Kurikulum & Program Pendidikan
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Klik atau scroll kartu di bawah untuk mengeksplorasi silabus,
                materi, dan prasyarat
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono bg-neutral-950 border border-neutral-800 px-3 py-1.5 rounded-xl text-muted-foreground w-max self-start sm:self-center">
            {programDatabase.length} Program Tersedia
          </span>
        </div>

        {/* Div ref ditambahkan di sini untuk membungkus jalur interaksi mouse wheel horizontal */}
        <div ref={programCarouselRef}>
          <Carousel
            opts={{ align: "start", loop: true, dragFree: true }}
            plugins={isAutoplayEnabled ? [pluginProgram.current] : []}
            className="w-full"
          >
            <CarouselContent className="-ml-4 pb-2">
              {programDatabase.map((prog) => {
                const isActive = selectedProgram === prog.id;
                return (
                  <CarouselItem
                    key={prog.id}
                    className="pl-4 basis-[85%] sm:basis-[48%] md:basis-[33%] select-none"
                  >
                    <button
                      onClick={() => {
                        setSelectedProgram(prog.id);
                        setIsAutoplayEnabled(false); // Hentikan auto-scroll otomatis setelah pengguna memilih manual
                        setOpenCurriculumIdx(null); // Reset dropdown detail bawah
                        setOpenReqIdx(null);
                      }}
                      className={`w-full text-left group relative p-5 rounded-2xl border transition-all flex flex-col justify-between aspect-[16/11] sm:aspect-[4/3] ${
                        isActive
                          ? "border-amber-500 bg-gradient-to-br from-emerald-950/80 to-neutral-950 shadow-lg ring-1 ring-amber-500"
                          : "border-neutral-800 bg-neutral-950/80 hover:border-emerald-700/60"
                      }`}
                    >
                      {/* Badge Indikator Aktif */}
                      {isActive && (
                        <div className="absolute top-4 right-4 bg-amber-500 text-neutral-950 p-1 rounded-lg z-10 shadow-md">
                          <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}

                      <div>
                        <span
                          className={`text-2xl p-3 rounded-xl border inline-block mb-4 transition-transform group-hover:scale-105 ${
                            isActive
                              ? "bg-emerald-900/60 border-amber-500/40"
                              : "bg-emerald-950/80 border-emerald-900/40"
                          }`}
                        >
                          {prog.icon}
                        </span>
                        <h3
                          className={`font-bold text-sm sm:text-base transition-colors line-clamp-1 ${
                            isActive
                              ? "text-amber-400"
                              : "text-emerald-50 group-hover:text-amber-400"
                          }`}
                        >
                          {prog.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                          {prog.shortDesc}
                        </p>
                      </div>

                      <div
                        className={`text-[10px] font-bold uppercase tracking-wider mt-4 ${
                          isActive
                            ? "text-amber-500"
                            : "text-muted-foreground group-hover:text-emerald-400"
                        }`}
                      >
                        {isActive ? "Sedang Dilihat •" : "Lihat Silabus →"}
                      </div>
                    </button>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
          </Carousel>
        </div>
      </div>

      {/* --- GRID DETAIL BAWAH: DATA KHUSUS PROGRAM YANG AKTIF (RESPONSIVE & ANIMATED) --- */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedProgram}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start"
        >
          {/* Kolom Kiri: Deskripsi Utama Misi Program */}
          <div className="lg:col-span-1 bg-neutral-950/60 border border-neutral-900 rounded-[2rem] p-5 sm:p-6 lg:p-8 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-3xl">{activeProgramData.icon}</span>
              <h3 className="font-display text-xl font-bold text-emerald-50">
                {activeProgramData.title}
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-medium">
              {activeProgramData.fullDesc}
            </p>
            <div className="pt-4 border-t border-neutral-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-[10px] uppercase font-bold tracking-widest text-amber-500">
                Kurikulum Aktif Lembaga
              </span>
            </div>
          </div>

          {/* Kolom Kanan: Dropdown Silabus Kurikulum & Prasyarat Kelulusan */}
          <div className="lg:col-span-2 space-y-6">
            {/* SUB-SECTION 1: AKORDION JALUR STRUKTUR KURIKULUM */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <Layers className="w-4 h-4 text-emerald-400" />
                <h4 className="font-display text-xs font-black text-emerald-500 uppercase tracking-widest">
                  Struktur & Tingkatan Materi
                </h4>
              </div>

              <div className="space-y-2">
                {activeProgramData.curriculum.map((cur, idx) => {
                  const isCurOpen = openCurriculumIdx === idx;
                  return (
                    <div
                      key={idx}
                      className="border border-neutral-900 rounded-xl bg-neutral-950/40 overflow-hidden hover:border-emerald-950 transition-colors"
                    >
                      <button
                        onClick={() =>
                          setOpenCurriculumIdx(isCurOpen ? null : idx)
                        }
                        className="w-full flex items-center justify-between p-4 text-left group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-md bg-neutral-900 border border-neutral-800 flex items-center justify-center text-[10px] font-mono text-muted-foreground group-hover:text-amber-400">
                            0{idx + 1}
                          </div>
                          <span className="font-bold text-sm text-emerald-100 group-hover:text-amber-400 transition-colors">
                            {cur.level}
                          </span>
                        </div>
                        <ChevronDown
                          className={`w-4 h-4 text-amber-500 shrink-0 transition-transform duration-300 ${
                            isCurOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      <AnimatePresence initial={false}>
                        {isCurOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: "easeInOut" }}
                          >
                            <p className="p-4 pt-0 text-xs sm:text-sm text-muted-foreground leading-relaxed border-t border-neutral-900/40 font-medium">
                              {cur.detail}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SUB-SECTION 2: AKORDION PRASYARAT SERTIFIKASI KELULUSAN */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <FileCheck className="w-4 h-4 text-amber-500" />
                <h4 className="font-display text-xs font-black text-amber-500 uppercase tracking-widest">
                  Persyaratan & Ketentuan Sertifikasi
                </h4>
              </div>

              <div className="space-y-2">
                {activeProgramData.requirements.map((req, idx) => {
                  const isReqOpen = openReqIdx === idx;
                  return (
                    <div
                      key={idx}
                      className="border border-neutral-900 rounded-xl bg-neutral-950/40 overflow-hidden hover:border-amber-950/30 transition-colors"
                    >
                      <button
                        onClick={() => setOpenReqIdx(isReqOpen ? null : idx)}
                        className="w-full flex items-center justify-between p-4 text-left group"
                      >
                        <div className="flex items-center gap-3">
                          <GraduationCap className="w-4 h-4 text-muted-foreground group-hover:text-amber-400" />
                          <span className="font-bold text-sm text-emerald-100 group-hover:text-amber-400 transition-colors">
                            {req.item}
                          </span>
                        </div>
                        <ChevronDown
                          className={`w-4 h-4 text-amber-500 shrink-0 transition-transform duration-300 ${
                            isReqOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      <AnimatePresence initial={false}>
                        {isReqOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: "easeInOut" }}
                          >
                            <p className="p-4 pt-0 text-xs sm:text-sm text-muted-foreground leading-relaxed border-t border-neutral-900/40 font-medium">
                              {req.detail}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
