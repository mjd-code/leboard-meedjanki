"use client";

import React, { useRef, useEffect, useState, useMemo } from "react";
import {
  ImageIcon,
  LayoutGrid,
  CheckCircle2,
  Grid2X2,
  Grid3X3,
  StretchHorizontal,
} from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { motion, AnimatePresence } from "motion/react";
import { apiFetch } from "@/lib/api";
import { resolveImageUrl } from "@/lib/gdrive";
import type { GalleryCategory, GalleryItem } from "@/lib/types";

interface GaleriTabProps {
  createWheelHandler: (
    ref: React.RefObject<HTMLDivElement | null>,
  ) => (e: WheelEvent) => void;
}

type GridSize = "dense" | "normal" | "large";

export default function GaleriTab({ createWheelHandler }: GaleriTabProps) {
  const galleryRef = useRef<HTMLDivElement>(null);
  const [gridSize, setGridSize] = useState<GridSize>("normal");
  const [isAutoplayEnabled, setIsAutoplayEnabled] = useState(true);
  const pluginGallery = useRef(
    Autoplay({ delay: 5000, stopOnInteraction: true, stopOnMouseEnter: true }),
  );

  const [albums, setAlbums] = useState<GalleryCategory[]>([]);
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [catsRes, itemsRes] = await Promise.all([
          apiFetch("/api/galleryCategories"),
          apiFetch("/api/galleryItems"),
        ]);
        const cats = (catsRes.ok ? await catsRes.json() : []) as GalleryCategory[];
        const its = (itemsRes.ok ? await itemsRes.json() : []) as GalleryItem[];
        if (!alive) return;
        const sortedCats = [...cats].sort(
          (a, b) => (a.order ?? 0) - (b.order ?? 0),
        );
        setAlbums(sortedCats);
        setItems(
          [...its].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
        );
        if (sortedCats[0]) setSelectedAlbum(sortedCats[0].id);
      } catch (e) {
        console.warn("gallery fetch failed", e);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const itemsByCat = useMemo(() => {
    const m = new Map<string, GalleryItem[]>();
    items.forEach((it) => {
      if (!m.has(it.categoryId)) m.set(it.categoryId, []);
      m.get(it.categoryId)!.push(it);
    });
    return m;
  }, [items]);

  const filteredPhotos = useMemo(() => {
    if (!selectedAlbum) return [];
    return itemsByCat.get(selectedAlbum) || [];
  }, [itemsByCat, selectedAlbum]);

  useEffect(() => {
    const galContainer = galleryRef.current;
    if (galContainer) {
      const handleGalWheel = createWheelHandler(galleryRef);
      galContainer.addEventListener("wheel", handleGalWheel, {
        passive: false,
      });
      return () => {
        galContainer.removeEventListener("wheel", handleGalWheel);
      };
    }
  }, [createWheelHandler]);

  const activeAlbumData = useMemo(
    () => albums.find((a) => a.id === selectedAlbum),
    [albums, selectedAlbum],
  );

  const gridLayoutClass = useMemo(() => {
    switch (gridSize) {
      case "dense":
        return "grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-1 sm:gap-2";
      case "large":
        return "grid grid-cols-1 md:grid-cols-2 gap-5";
      case "normal":
      default:
        return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5";
    }
  }, [gridSize]);

  if (albums.length === 0) {
    return (
      <div className="p-10 text-center text-muted-foreground border border-dashed border-neutral-800 rounded-2xl">
        <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
        Galeri masih kosong. Admin dapat menambahkan album & foto dari panel
        kontrol.
      </div>
    );
  }

  return (
    <div className="space-y-8 md:space-y-12 pb-10">
      <div className="bg-gradient-to-tr from-neutral-950 via-neutral-900/40 to-amber-950/10 border border-emerald-900/20 rounded-[2rem] p-5 sm:p-6 space-y-6 overflow-hidden shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-lg sm:text-xl font-bold tracking-tight">
                Pilih Album Dokumentasi
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Klik salah satu kartu untuk membuka isi album
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono bg-neutral-950 border border-neutral-800 px-3 py-1.5 rounded-xl text-muted-foreground w-max self-start sm:self-center">
            {albums.length} Kategori Tersedia
          </span>
        </div>

        <div ref={galleryRef}>
          <Carousel
            opts={{ align: "start", loop: true, dragFree: true }}
            plugins={isAutoplayEnabled ? [pluginGallery.current] : []}
            className="w-full"
          >
            <CarouselContent className="-ml-4 pb-2">
              {albums.map((item) => {
                const isActive = selectedAlbum === item.id;
                const catItems = itemsByCat.get(item.id) || [];
                const thumb =
                  catItems.find((i) => i.id === item.thumbnailItemId) ||
                  catItems[0];
                const thumbUrl = thumb ? resolveImageUrl(thumb.imageUrl) : null;
                return (
                  <CarouselItem
                    key={item.id}
                    className="pl-4 basis-[78%] sm:basis-[48%] md:basis-[33%] lg:basis-[28%] select-none"
                  >
                    <button
                      onClick={() => {
                        setSelectedAlbum(item.id);
                        setIsAutoplayEnabled(false);
                      }}
                      className={`w-full text-left group relative aspect-[16/10] sm:aspect-[4/3] rounded-2xl overflow-hidden border transition-all ${
                        isActive
                          ? "border-amber-500 shadow-lg shadow-amber-500/5 ring-1 ring-amber-500"
                          : "border-neutral-800 bg-neutral-950 hover:border-emerald-700/60"
                      }`}
                    >
                      <ImageWithFallback
                        src={thumbUrl}
                        alt={item.name}
                        fallbackType="gradient"
                        fill
                        containerClassName="w-full h-full opacity-80 group-hover:opacity-100 transition-opacity"
                      />

                      {isActive && (
                        <div className="absolute top-3 right-3 bg-amber-500 text-neutral-950 p-1 rounded-lg z-10 shadow-md">
                          <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent flex flex-col justify-end p-4">
                        {item.tag && (
                          <span
                            className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded w-max mb-1.5 backdrop-blur-sm border ${
                              isActive
                                ? "text-neutral-950 bg-amber-500 border-amber-400"
                                : "text-amber-400 bg-amber-500/10 border-amber-500/20"
                            }`}
                          >
                            {item.tag}
                          </span>
                        )}
                        <h4
                          className={`font-bold text-sm line-clamp-1 group-hover:text-amber-300 transition-colors ${isActive ? "text-amber-400" : "text-white"}`}
                        >
                          {item.name}
                        </h4>
                        <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">
                          {catItems.length} Foto
                        </p>
                      </div>
                    </button>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
          </Carousel>
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 px-1 border-b border-emerald-950/20 pb-4">
          <div className="flex items-start gap-2">
            <LayoutGrid className="w-4 h-4 text-emerald-400 mt-1" />
            <div>
              <h3 className="font-display text-sm font-black text-emerald-50 uppercase tracking-widest">
                Isi Galeri:{" "}
                <span className="text-amber-400 normal-case font-serif font-medium italic ml-1">
                  # {activeAlbumData?.name}
                </span>
              </h3>
              {activeAlbumData?.description && (
                <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                  {activeAlbumData.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-900 self-end sm:self-auto">
            {(
              [
                { k: "dense", I: Grid3X3, l: "Dense" },
                { k: "normal", I: Grid2X2, l: "Normal" },
                { k: "large", I: StretchHorizontal, l: "Large" },
              ] as { k: GridSize; I: any; l: string }[]
            ).map(({ k, I, l }) => (
              <button
                key={k}
                onClick={() => setGridSize(k)}
                className={`p-2 rounded-lg transition-all flex items-center gap-1.5 text-xs font-semibold ${
                  gridSize === k
                    ? "bg-amber-500 text-neutral-950 font-bold"
                    : "text-muted-foreground hover:text-slate-200"
                }`}
              >
                <I className="w-4 h-4" />
                <span className="hidden sm:inline">{l}</span>
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={`${selectedAlbum}-${gridSize}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className={gridLayoutClass}
          >
            {filteredPhotos.map((photo) => {
              const isDense = gridSize === "dense";
              return (
                <div
                  key={photo.id}
                  className={`group bg-neutral-950/60 border border-neutral-900 overflow-hidden hover:border-emerald-900/60 transition-all flex flex-col justify-between ${
                    isDense
                      ? "p-0 rounded-md sm:rounded-xl border-transparent"
                      : "p-3 rounded-2xl"
                  }`}
                >
                  <div>
                    <div
                      className={`relative w-full rounded-xl overflow-hidden bg-neutral-900 ${
                        isDense
                          ? "aspect-square rounded-none sm:rounded-lg"
                          : "aspect-[4/3] mb-3"
                      }`}
                    >
                      <ImageWithFallback
                        src={resolveImageUrl(photo.imageUrl)}
                        alt={photo.title}
                        fallbackType="gradient"
                        fill
                        containerClassName="w-full h-full"
                        className="transition-transform duration-500 group-hover:scale-105"
                      />

                      {isDense && (
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2 text-center pointer-events-none">
                          <p className="text-[10px] font-bold text-amber-400 line-clamp-2 hidden sm:block">
                            {photo.title}
                          </p>
                        </div>
                      )}
                    </div>

                    {!isDense && (
                      <h4
                        className={`font-bold text-emerald-50 group-hover:text-amber-400 transition-colors leading-snug px-1 ${
                          gridSize === "large"
                            ? "text-base sm:text-lg"
                            : "text-sm"
                        }`}
                      >
                        {photo.title}
                      </h4>
                    )}
                  </div>

                  {!isDense && photo.description && (
                    <p
                      className={`mt-2 text-muted-foreground leading-relaxed px-1 pb-1 font-medium ${
                        gridSize === "large"
                          ? "text-xs sm:text-sm"
                          : "text-[11px] sm:text-xs"
                      }`}
                    >
                      {photo.description}
                    </p>
                  )}
                </div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </section>
    </div>
  );
}
