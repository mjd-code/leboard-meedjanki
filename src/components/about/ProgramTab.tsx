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
  const programCarouselRef = useRef<HTMLDivElement>(null);
  const [isAutoplayEnabled, setIsAutoplayEnabled] = useState(true);

  const pluginProgram = useRef(
    Autoplay({ delay: 6000, stopOnInteraction: true, stopOnMouseEnter: true }),
  );

  // 1. Live data dari admin
  const { data: appData } = useAppDataQuery();
  const liveGroups = appData?.groups || [];
  const liveCategories = appData?.categories || [];
  const liveGoals = appData?.masterGoals || [];

  // HANYA SATU FALLBACK PROGRAM (LEBIH SIMPLE & NESTED)
  const FALLBACK_PROGRAMS = useMemo(
    () => [
      {
        id: "klasikal-diniyah",
        title: "Klasikal (Madrasah Diniyah)",
        shortDesc:
          "Program terstruktur berkelanjutan untuk penguasaan ilmu agama dasar.",
        icon: "🏫",
        fullDesc:
          "Program Klasikal Madrasah Diniyah dirancang dengan masa belajar berkesinambungan untuk membangun fondasi keagamaan yang kokoh, mencakup akidah tauhid, pembiasaan akhlak mulia, serta fikih ibadah praktis.",
        curriculum: [
          {
            level: "Fase Dasar (Ula)",
            detail:
              "Pengenalan huruf hijaiyah, penulisan arab dasar, hafalan doa harian, serta bimbingan adab akhlak dasar kepada orang tua dan guru.",
            requirements: [
              {
                item: "Persyaratan Masuk Fase",
                detail:
                  "Minimal usia 7 tahun dan mengikuti tes pemetaan kemampuan membaca huruf hijaiyah dasar.",
              },
              {
                item: "Sertifikasi Kelulusan Fase",
                detail:
                  "Tingkat kehadiran minimal 80% serta lulus ujian praktik bacaan shalat wajib.",
              },
            ],
          },
          {
            level: "Fase Lanjutan (Wustha)",
            detail:
              "Pendalaman fiqih ibadah (bersuci & shalat), membaca kitab ringkas (Safinatun Najah), sirah nabawiyah, dan kelancaran tajwid Al-Qur'an.",
            requirements: [
              {
                item: "Persyaratan Kenaikan Tingkat",
                detail:
                  "Telah menyelesaikan Fase Ula atau lulus tes penempatan akselerasi materi dasar.",
              },
              {
                item: "Sertifikasi Kelulusan Akhir",
                detail:
                  "Lulus Ujian Akhir Madrasah (UAM) baik teori maupun ujian praktik ibadah menyeluruh.",
              },
            ],
          },
        ],
      },
    ],
    [],
  );

  // Bangun programDatabase dari hierarki live dengan pola struktur bersarang (nested)
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
                ? `${c.goals.length} materi dalam fase ini.`
                : "Detail kurikulum belum diisi."),
            // Bersarang langsung di dalam kurikulum
            requirements: c.goals.map((g) => ({
              item: g.title,
              detail: g.description || "Detail prasyarat belum diisi.",
            })),
          }));

        return {
          id: n.group.id,
          title: n.group.name,
          icon: n.group.icon || "📚",
          shortDesc:
            n.group.description ||
            `${n.categories.length} fase kurikulum tersedia.`,
          fullDesc:
            n.group.longDescription ||
            n.group.description ||
            "Deskripsi program belum diisi.",
          curriculum: curriculum.length
            ? curriculum
            : [
                {
                  level: "Belum ada fase kurikulum",
                  detail: "Tambahkan kategori pada grup ini di admin.",
                  requirements: [],
                },
              ],
        };
      });
    return mapped.length ? mapped : FALLBACK_PROGRAMS;
  }, [liveGroups, liveCategories, liveGoals, FALLBACK_PROGRAMS]);

  const [selectedProgram, setSelectedProgram] = useState<string>(
    programDatabase[0]?.id || "",
  );

  // Sync selectedProgram saat live data masuk
  useEffect(() => {
    if (
      !programDatabase.find((p) => p.id === selectedProgram) &&
      programDatabase[0]
    ) {
      setSelectedProgram(programDatabase[0].id);
    }
  }, [programDatabase, selectedProgram]);

  // State Accordion Level 1 (Kurikulum) dan Level 2 (Prasyarat)
  const [openCurriculumIdx, setOpenCurriculumIdx] = useState<number | null>(
    null,
  );
  const [openReqIdx, setOpenReqIdx] = useState<number | null>(null);

  // Pasang horizontal wheel scroll untuk area carousel
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

  const activeProgramData = useMemo(() => {
    return (
      programDatabase.find((p) => p.id === selectedProgram) ||
      programDatabase[0]
    );
  }, [programDatabase, selectedProgram]);

  return (
    <div className="space-y-5 md:space-y-8 pb-8 px-3 max-w-7xl mx-auto w-full box-border">
      {/* --- ETALASE ATAS: CAROUSEL PROGRAM FILTER --- */}
      <div className="bg-neutral-900/20 border border-neutral-800/60 rounded-xl md:rounded-[2rem] p-4 md:p-6 lg:p-8 space-y-4 overflow-hidden shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-sm sm:text-lg font-bold tracking-tight text-neutral-100">
                Kurikulum & Program Pendidikan
              </h2>
              <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                Klik atau geser kartu untuk mengeksplorasi silabus bersarang
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono bg-neutral-950 border border-neutral-800 px-2.5 py-1 rounded-lg text-muted-foreground w-max self-start sm:self-center">
            {programDatabase.length} Program
          </span>
        </div>

        {/* Jalur interaksi carousel horizontal (Mobile First Optimization) */}
        <div ref={programCarouselRef} className="w-full overflow-visible">
          <Carousel
            opts={{ align: "start", loop: false, dragFree: true }}
            plugins={isAutoplayEnabled ? [pluginProgram.current] : []}
            className="w-full"
          >
            <CarouselContent className="-ml-2 md:-ml-4 pb-2">
              {programDatabase.map((prog) => {
                const isActive = selectedProgram === prog.id;
                return (
                  <CarouselItem
                    key={prog.id}
                    // basis-[86%] memberikan efek intip kartu selanjutnya di layar HP (sangat mobile friendly)
                    className="pl-2 basis-[86%] sm:basis-[48%] md:basis-[33%] lg:basis-[25%] select-none flex"
                  >
                    <button
                      onClick={() => {
                        setSelectedProgram(prog.id);
                        setIsAutoplayEnabled(false);
                        setOpenCurriculumIdx(null);
                        setOpenReqIdx(null);
                      }}
                      className={`w-full text-left group relative p-4 rounded-xl md:rounded-2xl border transition-all flex flex-col justify-between min-h-[150px] sm:min-h-[170px] h-full ${
                        isActive
                          ? "border-amber-500 bg-gradient-to-br from-emerald-950/70 to-neutral-950 shadow-lg ring-1 ring-amber-500"
                          : "border-neutral-800 bg-neutral-950/80 hover:border-emerald-700/60"
                      }`}
                    >
                      {isActive && (
                        <div className="absolute top-3 right-3 bg-amber-500 text-neutral-950 p-1 rounded-md z-10 shadow-md">
                          <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}

                      <div className="space-y-2 w-full">
                        <span
                          className={`text-lg p-2 rounded-lg border inline-block ${
                            isActive
                              ? "bg-emerald-900/60 border-amber-500/40"
                              : "bg-emerald-950/80 border-emerald-900/40"
                          }`}
                        >
                          {prog.icon}
                        </span>
                        <h3
                          className={`font-bold text-xs sm:text-sm transition-colors line-clamp-1 ${
                            isActive
                              ? "text-amber-400"
                              : "text-emerald-50 group-hover:text-amber-400"
                          }`}
                        >
                          {prog.title}
                        </h3>
                        <p className="text-[11px] sm:text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {prog.shortDesc}
                        </p>
                      </div>

                      <div
                        className={`text-[9px] font-bold uppercase tracking-wider mt-3 pt-2 border-t border-neutral-900/60 w-full ${
                          isActive
                            ? "text-amber-500"
                            : "text-muted-foreground group-hover:text-emerald-400"
                        }`}
                      >
                        {isActive ? "Sedang Aktif •" : "Lihat Detail →"}
                      </div>
                    </button>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
          </Carousel>
        </div>
      </div>

      {/* --- GRID DETAIL BAWAH: RESPONSIVE & ANIMATED --- */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedProgram}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 items-start w-full"
        >
          {/* Kolom Kiri: Deskripsi Utama */}
          <div className="lg:col-span-1 bg-neutral-950/60 border border-neutral-900 rounded-xl md:rounded-[2rem] p-4 sm:p-6 space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl shrink-0">
                {activeProgramData.icon}
              </span>
              <h3 className="font-display text-sm sm:text-base font-bold text-emerald-50">
                {activeProgramData.title}
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-medium">
              {activeProgramData.fullDesc}
            </p>
            <div className="pt-2.5 border-t border-neutral-900 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-[9px] uppercase font-bold tracking-widest text-amber-500">
                Informasi Silabus Lembaga
              </span>
            </div>
          </div>

          {/* Kolom Kanan: Blok Nested Accordion Terpadu */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2 px-1">
              <Layers className="w-4 h-4 text-emerald-400 shrink-0" />
              <h4 className="font-display text-[10px] sm:text-xs font-black text-emerald-500 uppercase tracking-widest">
                Struktur & Prasyarat Kurikulum
              </h4>
            </div>

            {/* LEVEL 1 ACCORDION (JALUR STRUKTUR KURIKULUM) */}
            <div className="space-y-2">
              {activeProgramData.curriculum.map((cur, curIdx) => {
                const isCurOpen = openCurriculumIdx === curIdx;
                return (
                  <div
                    key={curIdx}
                    className="border border-neutral-900 rounded-xl bg-neutral-950/60 overflow-hidden hover:border-emerald-950/40 transition-colors"
                  >
                    {/* Tombol Pemicu Level 1 (Min height 44px untuk mobile touch target standard) */}
                    <button
                      onClick={() => {
                        setOpenCurriculumIdx(isCurOpen ? null : curIdx);
                        setOpenReqIdx(null); // Reset Level 2 state ketika level 1 berpindah
                      }}
                      className="w-full flex items-center justify-between p-4 text-left group min-h-[44px]"
                    >
                      <div className="flex items-center gap-3 mr-2">
                        <div className="w-6 h-6 rounded bg-neutral-900 border border-neutral-800 flex items-center justify-center text-[10px] font-mono text-muted-foreground group-hover:text-amber-400 shrink-0">
                          0{curIdx + 1}
                        </div>
                        <span className="font-bold text-xs sm:text-sm text-emerald-100 group-hover:text-amber-400 transition-colors line-clamp-1">
                          {cur.level}
                        </span>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-amber-500 shrink-0 transition-transform duration-200 ${
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
                          {/* Konten Kontainer Level 1 */}
                          <div className="p-4 pt-0 space-y-4 border-t border-neutral-900/40 bg-neutral-950/30">
                            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed pt-3 font-medium">
                              {cur.detail}
                            </p>

                            {/* ========================================================================= */}
                            {/* LEVEL 2 ACCORDION (NESTED): PRASYARAT SERTIFIKASI KELULUSAN                */}
                            {/* ========================================================================= */}
                            {cur.requirements &&
                              cur.requirements.length > 0 && (
                                <div className="mt-2 pt-3 border-t border-neutral-900/60 space-y-2">
                                  <div className="space-y-2">
                                    {cur.requirements.map((req, reqIdx) => {
                                      const isReqOpen = openReqIdx === reqIdx;
                                      return (
                                        <div
                                          key={reqIdx}
                                          className="border border-neutral-900/80 rounded-lg bg-neutral-950/50 overflow-hidden hover:border-amber-950/20 transition-colors"
                                        >
                                          {/* Tombol Pemicu Level 2 */}
                                          <button
                                            onClick={() =>
                                              setOpenReqIdx(
                                                isReqOpen ? null : reqIdx,
                                              )
                                            }
                                            className="w-full flex items-center justify-between p-3 text-left group min-h-[40px]"
                                          >
                                            <div className="flex items-center gap-2 mr-2">
                                              <GraduationCap className="w-3.5 h-3.5 text-muted-foreground group-hover:text-amber-400 shrink-0" />
                                              <span className="font-bold text-[11px] sm:text-xs text-emerald-200 group-hover:text-amber-400 transition-colors line-clamp-1">
                                                {req.item}
                                              </span>
                                            </div>
                                            <ChevronDown
                                              className={`w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform duration-200 ${
                                                isReqOpen ? "rotate-180" : ""
                                              }`}
                                            />
                                          </button>

                                          <AnimatePresence initial={false}>
                                            {isReqOpen && (
                                              <motion.div
                                                initial={{
                                                  height: 0,
                                                  opacity: 0,
                                                }}
                                                animate={{
                                                  height: "auto",
                                                  opacity: 1,
                                                }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{
                                                  duration: 0.15,
                                                  ease: "easeInOut",
                                                }}
                                              >
                                                <p className="p-3 pt-0 text-xs text-muted-foreground leading-relaxed border-t border-neutral-900/30 bg-neutral-950/40">
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
                              )}
                            {/* END OF LEVEL 2 ACCORDION */}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
