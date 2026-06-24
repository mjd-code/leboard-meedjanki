"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  History,
  Eye,
  Compass,
  ImageIcon,
  Users,
  Settings,
  Newspaper,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

// --- LAZY LOAD TABS ---
const BerandaTab = dynamic(() => import("@/components/about/BerandaTab"), {
  loading: () => <TabSkeleton />,
});
const BlogListTab = dynamic(() => import("@/components/about/BlogListTab"), {
  loading: () => <TabSkeleton />,
});
const LoginTab = dynamic(() => import("@/components/about/LoginTab"), {
  loading: () => <TabSkeleton />,
});
const SejarahTab = dynamic(() => import("@/components/about/SejarahTab"), {
  loading: () => <TabSkeleton />,
});
const ProgramTab = dynamic(() => import("@/components/about/ProgramTab"), {
  loading: () => <TabSkeleton />,
});
const GaleriTab = dynamic(() => import("@/components/about/GaleryTab"), {
  loading: () => <TabSkeleton />,
});
const StrukturTab = dynamic(() => import("@/components/about/StrukturTab"), {
  loading: () => <TabSkeleton />,
});

function TabSkeleton() {
  return (
    <div className="h-60 bg-neutral-900/50 animate-pulse rounded-2xl border border-neutral-800" />
  );
}

export function AboutPage() {
  const [activeTab, setActiveTab] = useState<
    "beranda" | "blog" | "sejarah" | "program" | "galeri" | "struktur" | "login"
  >("beranda");
  const [isStickyFloating, setIsStickyFloating] = useState(false);

  const mainTabsContainerRef = useRef<HTMLDivElement>(null);
  const floatingTabsContainerRef = useRef<HTMLDivElement>(null);
  const mainActiveTabRef = useRef<HTMLButtonElement>(null);
  const floatingActiveTabRef = useRef<HTMLButtonElement>(null);

  // SENSOR REF: Diletakkan persis di batas bawah navbar statis
  const sensorRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const createWheelHandler = useCallback(
    (ref: React.RefObject<HTMLDivElement | null>) => {
      return (e: WheelEvent) => {
        const carouselContainer = ref.current;
        if (!carouselContainer) return;
        const emblaViewport =
          carouselContainer.querySelector('[class*="overflow-hidden"]') ||
          carouselContainer;
        if (e.deltaY !== 0) {
          e.preventDefault();
          emblaViewport.scrollLeft += e.deltaY;
        }
      };
    },
    [],
  );

  // Efek untuk Wheel Scroll
  useEffect(() => {
    const mainContainer = mainTabsContainerRef.current;
    if (mainContainer) {
      const handleMainWheel = createWheelHandler(mainTabsContainerRef);
      mainContainer.addEventListener("wheel", handleMainWheel, {
        passive: false,
      });
      return () => mainContainer.removeEventListener("wheel", handleMainWheel);
    }
  }, [createWheelHandler]);

  useEffect(() => {
    if (!isStickyFloating) return;
    const floatingContainer = floatingTabsContainerRef.current;
    if (floatingContainer) {
      const handleFloatingWheel = createWheelHandler(floatingTabsContainerRef);
      floatingContainer.addEventListener("wheel", handleFloatingWheel, {
        passive: false,
      });
      return () =>
        floatingContainer.removeEventListener("wheel", handleFloatingWheel);
    }
  }, [createWheelHandler, isStickyFloating]);

  // --- 🌟 BREAKTHROUGH: SENSOR INTERSECTION OBSERVER ---
  // Sangat ringan dan akurat karena sensor tidak bergerak.
  useEffect(() => {
    const sensor = sensorRef.current;
    if (!sensor) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Tampilkan floating jika SENSOR (batas bawah navbar statis) melewati atas viewport
        if (!entry.isIntersecting && entry.boundingClientRect.top < 0) {
          setIsStickyFloating(true);
        } else {
          setIsStickyFloating(false);
        }
      },
      // RootMargin 0 memastikan deteksi terjadi pas saat piksel terakhir navbar utama hilang
      { threshold: 0, rootMargin: "0px" },
    );

    observer.observe(sensor);
    return () => observer.disconnect();
  }, []);

  // --- 🌟 BREAKTHROUGH: SAFE HORIZONTAL SCROLL ---
  // Menggantikan scrollIntoView yang merusak window scroll Y.
  const safeHorizontalScroll = (
    container: HTMLElement | null,
    tab: HTMLElement | null,
  ) => {
    if (!container || !tab) return;
    // Hitung posisi tengah tanpa menyentuh vertical scroll
    const scrollPos =
      tab.offsetLeft - container.offsetWidth / 2 + tab.offsetWidth / 2;
    container.scrollTo({ left: scrollPos, behavior: "smooth" });
  };

  useEffect(() => {
    // Scroll aman untuk navbar utama
    safeHorizontalScroll(
      mainTabsContainerRef.current,
      mainActiveTabRef.current,
    );

    // Scroll aman untuk floating navbar jika sedang aktif
    if (isStickyFloating) {
      safeHorizontalScroll(
        floatingTabsContainerRef.current,
        floatingActiveTabRef.current,
      );
    }
  }, [activeTab, isStickyFloating]);

  const tabs = [
    { id: "sejarah", label: "Sejarah", icon: History },
    { id: "beranda", label: "Beranda", icon: Compass },
    { id: "blog", label: "Blog", icon: Newspaper },
    { id: "program", label: "Program", icon: Compass },
    { id: "galeri", label: "Galeri", icon: ImageIcon },
    { id: "struktur", label: "Struktur", icon: Users },
    { id: "login", label: "login", icon: Settings },
  ] as const;

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 overflow-x-hidden selection:bg-amber-500 selection:text-neutral-900">
      <HeroSection />

      {/* 1. NAVIGATION BAR UTAMA DENGAN SENSOR DI BAWAHNYA */}
      <div className="max-w-5xl mx-auto sm:mx-4 mb-10 relative min-h-16.5 sm:min-h-18.5">
        <div
          ref={mainTabsContainerRef}
          className="flex flex-nowrap items-center gap-2 p-2 rounded-2xl overflow-x-auto scrollbar-hide snap-x bg-neutral-950/60 border border-emerald-900/30 lg:items-center lg:justify-center lg:flex relative z-10 backdrop-blur-sm shadow-soft"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={`main-${tab.id}`}
                ref={isActive ? mainActiveTabRef : null}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 px-5 py-3 text-xs md:text-sm font-bold tracking-wide uppercase transition-all rounded-xl shrink-0 snap-center z-10 ${
                  isActive
                    ? "text-neutral-950 bg-amber-500 shadow-md"
                    : "text-muted-foreground hover:text-emerald-400 hover:bg-emerald-950/20"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeTabIndicatorMain"
                    className="absolute inset-0 rounded-xl border border-amber-400 -z-10"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* SENSOR INVISIBLE: Penempatannya mutlak di batas bawah wrapper navbar ini */}
        <div
          ref={sensorRef}
          className="absolute bottom-0 left-0 w-full h-px pointer-events-none opacity-0"
        />
      </div>

      {/* 2. DYNAMIC FLOATING NAVIGATION BAR */}
      <AnimatePresence>
        {isStickyFloating && (
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            className="fixed left-0 right-0 z-50 px-4 py-3 bg-background/80 backdrop-blur-lg border-emerald-900/20 shadow-2xl top-0 border-b"
          >
            <div className="max-w-4xl mx-auto w-full">
              <div
                ref={floatingTabsContainerRef}
                className="flex flex-nowrap items-center justify-center gap-2 p-1.5 rounded-xl overflow-x-auto scrollbar-hide snap-x bg-neutral-950/95 border border-emerald-500/20 relative"
              >
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={`floating-${tab.id}`}
                      ref={isActive ? floatingActiveTabRef : null}
                      onClick={() => setActiveTab(tab.id)}
                      className={`relative flex items-center gap-2 px-4 py-2.5 text-xs font-bold tracking-wide uppercase transition-all rounded-lg shrink-0 snap-center z-10 ${
                        isActive
                          ? "text-neutral-950 bg-amber-500"
                          : "text-muted-foreground hover:text-emerald-400 hover:bg-emerald-950/20"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span>{tab.label}</span>
                      {isActive && (
                        <motion.div
                          layoutId="activeTabIndicatorFloating"
                          className="absolute inset-0 rounded-lg border border-amber-400 -z-10"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CONTAINER DYNAMIC RENDERING */}
      <main className="max-w-5xl mx-auto min-h-[90vh]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="w-full"
          >
            {activeTab === "beranda" && (
              <BerandaTab createWheelHandler={createWheelHandler} />
            )}
            {activeTab === "blog" && (
              <BlogListTab />
            )}
            {activeTab === "sejarah" && <SejarahTab />}
            {activeTab === "program" && (
              <ProgramTab createWheelHandler={createWheelHandler} />
            )}
            {activeTab === "galeri" && (
              <GaleriTab createWheelHandler={createWheelHandler} />
            )}
            {activeTab === "struktur" && <StrukturTab />}
            {activeTab === "login" && (
              <LoginTab onLogin={() => router.push("/admin")} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

function HeroSection() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (date: Date) => {
    return date
      .toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
      .replace(/\./g, ":");
  };

  return (
    <section className="relative overflow-hidden bg-linear-to-b from-emerald-950 via-background to-background pt-24 text-center min-h-100 flex items-center justify-center rounded-2xl">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-150 h-75 bg-emerald-500/15 blur-[120px] pointer-events-none rounded-full z-0" />
      <div className="absolute inset-0 top-20 md:top-30 lg:top-40 flex items-center justify-center opacity-[0.1] pointer-events-none select-none z-0 mix-blend-luminosity">
        <img
          src="/logo-app.png"
          alt="Logo Watermark"
          className="w-[140%] max-w-150 md:max-w-175 lg:max-w-212.5 aspect-square object-contain animate-pulse"
        />
      </div>
      <div className="absolute inset-0 bg-linear-to-t from-background via-transparent to-transparent z-0" />
      <div className="container mx-auto px-4 relative z-10 max-w-4xl space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-950/40 border border-emerald-800/30 backdrop-blur-md shadow-inner">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
          <p className="text-xs font-medium tracking-wide text-emerald-200/90 tabular-nums">
            {formatDate(time)} <span className="text-amber-400 mx-1">•</span>{" "}
            {formatTime(time)} WIB
          </p>
        </div>
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.4em] text-amber-400 font-extrabold drop-shadow-[0_2px_8px_rgba(251,191,36,0.2)]">
            Tentang Kami
          </p>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight bg-clip-text text-transparent bg-linear-to-r from-white via-slate-100 to-emerald-200 py-1">
            PPMH Insight
          </h1>
        </div>
        <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed font-normal">
          Menyajikan transparansi data, rekam jejak prestasi, dan grafik
          perkembangan santri secara{" "}
          <span className="text-emerald-400 font-medium">real-time</span> demi
          mewujudkan ekosistem pendidikan yang unggul dan modern.
        </p>
      </div>
    </section>
  );
}
