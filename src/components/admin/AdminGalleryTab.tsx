"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  Link as LinkIcon,
  Upload as UploadIcon,
  Image as ImageIcon,
  Loader2,
  Save,
  X,
  Star,
  StarOff,
  MoreVertical,
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { resolveImageUrl } from "@/lib/gdrive";
import { ImageUploader } from "@/components/ui/ImageUploader";
import { SortableList, DragHandle } from "./editor/sortable";
import type { GalleryCategory, GalleryItem } from "@/lib/types";
import { motion, AnimatePresence } from "motion/react";

// --- API helpers ---
async function listCats(): Promise<GalleryCategory[]> {
  const r = await apiFetch("/api/galleryCategories");
  if (!r.ok) return [];
  const rows = (await r.json()) as GalleryCategory[];
  return [...rows].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}
async function listItems(): Promise<GalleryItem[]> {
  const r = await apiFetch("/api/galleryItems");
  if (!r.ok) return [];
  const rows = (await r.json()) as GalleryItem[];
  return [...rows].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}
async function saveCat(c: Partial<GalleryCategory> & { id?: string }) {
  const isEdit = !!c.id;
  const r = await apiFetch(
    isEdit ? `/api/galleryCategories/${c.id}` : "/api/galleryCategories",
    {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(c),
    },
  );
  if (!r.ok) throw new Error("Gagal menyimpan kategori");
  return r.json();
}
async function deleteCat(id: string) {
  const r = await apiFetch(`/api/galleryCategories/${id}`, {
    method: "DELETE",
  });
  if (!r.ok) throw new Error("Gagal menghapus kategori");
}
async function saveItem(it: Partial<GalleryItem> & { id?: string }) {
  const isEdit = !!it.id;
  const r = await apiFetch(
    isEdit ? `/api/galleryItems/${it.id}` : "/api/galleryItems",
    {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(it),
    },
  );
  if (!r.ok) throw new Error("Gagal menyimpan foto");
  return r.json();
}
async function deleteItem(id: string) {
  const r = await apiFetch(`/api/galleryItems/${id}`, { method: "DELETE" });
  if (!r.ok) throw new Error("Gagal menghapus foto");
}
async function reorderCats(items: { id: string; order: number }[]) {
  await apiFetch("/api/galleryCategories/reorder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
}
async function reorderItems(
  categoryId: string,
  items: { id: string; order: number }[],
) {
  await apiFetch("/api/galleryItems/reorder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ categoryId, items }),
  });
}

// --- Category form modal ---
function CategoryForm({
  initial,
  itemsForThumb,
  onClose,
  onSaved,
}: {
  initial: Partial<GalleryCategory>;
  itemsForThumb: GalleryItem[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initial.name || "");
  const [tag, setTag] = useState(initial.tag || "");
  const [description, setDescription] = useState(initial.description || "");
  const [thumbnailItemId, setThumbnailItemId] = useState<string | null>(
    initial.thumbnailItemId ?? null,
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Nama kategori wajib diisi");
      return;
    }
    setSaving(true);
    try {
      await saveCat({
        id: initial.id,
        name: name.trim(),
        tag: tag.trim(),
        description: description.trim(),
        thumbnailItemId,
        order: initial.order ?? Date.now(),
      });
      toast.success("Kategori tersimpan");
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-card rounded-2xl shadow-soft w-full max-w-lg border border-border max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-bold text-base sm:text-lg">
            {initial.id ? "Edit Kategori" : "Kategori Baru"}
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-4 overflow-y-auto flex-1 text-sm">
          <div>
            <label className="text-xs sm:text-sm font-semibold mb-1 block">
              Nama
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Misal: Kajian Subuh"
              className="w-full h-10 rounded-xl border border-input bg-background px-3 focus:outline-none text-xs sm:text-sm"
            />
          </div>
          <div>
            <label className="text-xs sm:text-sm font-semibold mb-1 block">
              Tag pendek
            </label>
            <input
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="Misal: Kajian"
              className="w-full h-10 rounded-xl border border-input bg-background px-3 focus:outline-none text-xs sm:text-sm"
            />
          </div>
          <div>
            <label className="text-xs sm:text-sm font-semibold mb-1 block">
              Deskripsi
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Deskripsi singkat ditampilkan di header album."
              className="w-full rounded-xl border border-input bg-background p-3 text-xs sm:text-sm focus:outline-none resize-none"
            />
          </div>
          <div>
            <label className="text-xs sm:text-sm font-semibold mb-1 block">
              Thumbnail (pilih dari foto kategori ini)
            </label>
            {itemsForThumb.length === 0 ? (
              <p className="text-xs text-muted-foreground italic pt-1">
                Tambahkan foto dulu, lalu pilih salah satu sebagai thumbnail.
              </p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto pt-1">
                {itemsForThumb.map((it) => {
                  const active = it.id === thumbnailItemId;
                  return (
                    <button
                      key={it.id}
                      type="button"
                      onClick={() => setThumbnailItemId(active ? null : it.id)}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                        active
                          ? "border-primary ring-2 ring-primary/40"
                          : "border-border hover:border-primary/50"
                      }`}
                      title={it.title}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={resolveImageUrl(it.imageUrl)}
                        alt={it.title}
                        className="w-full h-full object-cover"
                      />
                      {active && (
                        <div className="absolute top-1 right-1 bg-primary text-primary-foreground p-0.5 rounded">
                          <Star className="w-3 h-3 text-amber-500 fill-current" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-border bg-card shrink-0">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold hover:bg-secondary transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 flex items-center gap-2 transition-opacity"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Item form modal ---
function ItemForm({
  categoryId,
  initial,
  onClose,
  onSaved,
}: {
  categoryId: string;
  initial: Partial<GalleryItem>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(initial.title || "");
  const [description, setDescription] = useState(initial.description || "");
  const [sourceType, setSourceType] = useState<"drive" | "upload">(
    initial.sourceType || "drive",
  );
  const [imageUrl, setImageUrl] = useState(initial.imageUrl || "");
  const [imagePath, setImagePath] = useState(initial.imagePath || "");
  const [saving, setSaving] = useState(false);

  const previewUrl = useMemo(() => resolveImageUrl(imageUrl), [imageUrl]);

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Judul wajib diisi");
      return;
    }
    if (!imageUrl.trim()) {
      toast.error("Gambar belum diisi");
      return;
    }
    setSaving(true);
    try {
      await saveItem({
        id: initial.id,
        categoryId,
        title: title.trim(),
        description: description.trim(),
        sourceType,
        imageUrl: imageUrl.trim(),
        imagePath: sourceType === "upload" ? imagePath : "",
        order: initial.order ?? Date.now(),
      });
      toast.success("Foto tersimpan");
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-card rounded-2xl shadow-soft w-full max-w-lg border border-border max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-bold text-base sm:text-lg">
            {initial.id ? "Edit Foto" : "Foto Baru"}
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-4 overflow-y-auto flex-1 text-sm">
          <div>
            <label className="text-xs sm:text-sm font-semibold mb-1 block">
              Judul
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-10 rounded-xl border border-input bg-background px-3 focus:outline-none text-xs sm:text-sm"
            />
          </div>
          <div>
            <label className="text-xs sm:text-sm font-semibold mb-1 block">
              Deskripsi
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-input bg-background p-3 text-xs sm:text-sm focus:outline-none resize-none"
            />
          </div>

          <div>
            <label className="text-xs sm:text-sm font-semibold mb-2 block">
              Sumber gambar
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSourceType("drive")}
                className={`flex items-center gap-2 justify-center px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                  sourceType === "drive"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-secondary"
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5" />
                Google Drive
              </button>
              <button
                type="button"
                onClick={() => setSourceType("upload")}
                className={`flex items-center gap-2 justify-center px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                  sourceType === "upload"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-secondary"
                }`}
              >
                <UploadIcon className="w-3.5 h-3.5" />
                Unggah & Crop
              </button>
            </div>
          </div>

          {sourceType === "drive" ? (
            <div>
              <label className="text-xs sm:text-sm font-semibold mb-1 block">
                Link Google Drive
              </label>
              <input
                value={imageUrl}
                onChange={(e) => {
                  setImageUrl(e.target.value);
                  setImagePath("");
                }}
                placeholder="https://drive.google.com/file/d/.../view"
                className="w-full h-10 rounded-xl border border-input bg-background px-3 focus:outline-none text-xs sm:text-sm"
              />
              <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-1">
                Pastikan link diatur ke &quot;Anyone with the link&quot;.
              </p>
            </div>
          ) : (
            <div>
              <label className="text-xs sm:text-sm font-semibold mb-1 block">
                Unggah gambar
              </label>
              <ImageUploader
                folder="gallery"
                aspectRatio={4 / 3}
                title={imageUrl ? "Ganti Gambar" : "Pilih & Crop Gambar"}
                onUploadSuccess={(url, meta) => {
                  setImageUrl(url);
                  setImagePath(meta?.path || "");
                }}
              />
            </div>
          )}

          {imageUrl && (
            <div className="rounded-xl overflow-hidden border border-border bg-muted aspect-[4/3] relative max-w-xs mx-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="preview"
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-border bg-card shrink-0">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold hover:bg-secondary transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 flex items-center gap-2 transition-opacity"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Main tab ---
export function AdminGalleryTab() {
  const [cats, setCats] = useState<GalleryCategory[]>([]);
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [catForm, setCatForm] = useState<Partial<GalleryCategory> | null>(null);
  const [itemForm, setItemForm] = useState<{
    categoryId: string;
    initial: Partial<GalleryItem>;
  } | null>(null);

  const [activeMenu, setActiveMenu] = useState<{
    type: "cat" | "item";
    id: string;
  } | null>(null);

  useEffect(() => {
    const closeAllMenus = () => setActiveMenu(null);
    if (activeMenu) {
      window.addEventListener("click", closeAllMenus);
    }
    return () => window.removeEventListener("click", closeAllMenus);
  }, [activeMenu]);

  const refresh = async () => {
    setLoading(true);
    try {
      const [c, i] = await Promise.all([listCats(), listItems()]);
      setCats(c);
      setItems(i);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const itemsByCat = useMemo(() => {
    const m = new Map<string, GalleryItem[]>();
    items.forEach((it) => {
      if (!m.has(it.categoryId)) m.set(it.categoryId, []);
      m.get(it.categoryId)!.push(it);
    });
    m.forEach((arr) => arr.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
    return m;
  }, [items]);

  const handleCatReorder = async (next: GalleryCategory[]) => {
    setCats(next);
    await reorderCats(next.map((c, i) => ({ id: c.id, order: i })));
  };

  const handleItemReorder = async (categoryId: string, next: GalleryItem[]) => {
    setItems((prev) => {
      const others = prev.filter((p) => p.categoryId !== categoryId);
      const reindexed = next.map((it, i) => ({ ...it, order: i }));
      return [...others, ...reindexed];
    });
    await reorderItems(
      categoryId,
      next.map((it, i) => ({ id: it.id, order: i })),
    );
  };

  const handleDelCat = async (cat: GalleryCategory) => {
    if (
      !confirm(`Hapus kategori "${cat.name}" beserta semua foto di dalamnya?`)
    )
      return;
    try {
      await deleteCat(cat.id);
      toast.success("Kategori dihapus");
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDelItem = async (it: GalleryItem) => {
    if (!confirm(`Hapus foto "${it.title}"?`)) return;
    try {
      await deleteItem(it.id);
      toast.success("Foto dihapus");
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleSetThumb = async (cat: GalleryCategory, itemId: string) => {
    const next = cat.thumbnailItemId === itemId ? null : itemId;
    try {
      await saveCat({ id: cat.id, thumbnailItemId: next });
      setCats((prev) =>
        prev.map((c) =>
          c.id === cat.id ? { ...c, thumbnailItemId: next } : c,
        ),
      );
      toast.success(next ? "Thumbnail diperbarui" : "Thumbnail dilepas");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (loading) {
    return (
      <div className="p-10 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 space-y-5 w-full box-border max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
        <div className="space-y-0.5">
          <h2 className="text-lg sm:text-xl font-black tracking-tight">
            Manajemen Galeri
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Kelola album, urutan, dan foto yang tampil di tab Galeri.
          </p>
        </div>
        <button
          onClick={() =>
            setCatForm({ order: cats.length, thumbnailItemId: null })
          }
          className="flex items-center justify-center gap-2 px-4 h-10 rounded-xl bg-primary text-primary-foreground font-semibold text-xs sm:text-sm hover:opacity-90 transition-opacity w-full sm:w-auto shrink-0"
        >
          <Plus className="w-4 h-4" /> Kategori Baru
        </button>
      </div>

      {cats.length === 0 ? (
        <div className="border border-dashed border-border rounded-2xl p-10 text-center text-muted-foreground text-xs sm:text-sm">
          <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
          Belum ada kategori galeri. Buat kategori pertama untuk memulai.
        </div>
      ) : (
        <SortableList items={cats} onReorder={handleCatReorder}>
          {(cat) => {
            const catItems = itemsByCat.get(cat.id) || [];
            const isOpen = expanded[cat.id] ?? true;
            const thumb = catItems.find((i) => i.id === cat.thumbnailItemId);
            const isCatMenuOpen =
              activeMenu?.type === "cat" && activeMenu?.id === cat.id;

            return (
              /* PERUBAHAN 1: Menambahkan z-index dinamis pada Parent Card agar melayang di atas list lain saat menu terbuka */
              <div
                className={`border border-border rounded-2xl bg-card mb-3.5 overflow-visible shadow-sm transition-all ${
                  isCatMenuOpen ? "relative z-40" : "relative z-10"
                }`}
              >
                {/* HEADER ACCORDION */}
                <div
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-secondary/30 transition-all duration-200 ${
                    isOpen
                      ? "rounded-t-2xl border-b border-border"
                      : "rounded-2xl"
                  }`}
                >
                  {/* Sisi Kiri: Detail Kategori */}
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <DragHandle />

                    <div className="w-9 h-9 rounded-lg bg-muted overflow-hidden shrink-0 border border-border/40">
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={resolveImageUrl(thumb.imageUrl)}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="w-4 h-4 m-2.5 text-muted-foreground/40" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs sm:text-sm text-foreground truncate max-w-[14ch] xs:max-w-[20ch] sm:max-w-none">
                          {cat.name}
                        </span>
                        {cat.tag && (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-primary/10 text-primary shrink-0">
                            {cat.tag}
                          </span>
                        )}
                        <span className="text-[10px] sm:text-xs text-muted-foreground shrink-0 font-medium">
                          ({catItems.length} foto)
                        </span>
                      </div>
                      {cat.description && (
                        <p className="text-[11px] text-muted-foreground line-clamp-1">
                          {cat.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Sisi Kanan: Kumpulan Tombol Aksi Kontrol */}
                  <div className="flex items-center justify-end gap-2 w-full sm:w-auto border-t border-border/30 pt-2 sm:pt-0 sm:border-none shrink-0">
                    {/* Tombol Tambah Foto */}
                    <button
                      onClick={() =>
                        setItemForm({
                          categoryId: cat.id,
                          initial: {
                            order: catItems.length,
                            sourceType: "drive",
                          },
                        })
                      }
                      className="h-8 px-3 rounded-lg bg-primary/10 text-primary text-[11px] font-bold hover:bg-primary/20 flex items-center gap-1 transition-colors flex-1 sm:flex-none justify-center"
                    >
                      <Plus className="w-3.5 h-3.5" /> Foto
                    </button>

                    {/* Tombol Opsi Konteks Menu (Edit/Delete) */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenu(
                            isCatMenuOpen ? null : { type: "cat", id: cat.id },
                          );
                        }}
                        className={`h-8 w-8 inline-flex items-center justify-center rounded-lg border transition-all ${
                          isCatMenuOpen
                            ? "bg-secondary border-primary/30 text-primary"
                            : "hover:bg-secondary border-transparent"
                        }`}
                        title="Opsi Pilihan"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      <AnimatePresence>
                        {isCatMenuOpen && (
                          <motion.div
                            /* PERUBAHAN 2: Mengubah animasi meluncur dari sumbu X (samping kiri) */
                            initial={{ opacity: 0, scale: 0.95, x: 10 }}
                            animate={{ opacity: 1, scale: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.95, x: 10 }}
                            transition={{ duration: 0.12 }}
                            /* PERUBAHAN 3: Menggunakan posisi 'right-full top-0 mr-2' agar menu terbuka ke arah kiri horizontal, aman dari tabrakan vertikal */
                            className="absolute right-full top-0 mr-2 w-36 bg-card border border-border rounded-xl shadow-xl z-50 p-1 space-y-0.5 animate-in fade-in"
                          >
                            <button
                              onClick={() => setCatForm(cat)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg hover:bg-secondary transition-colors text-left"
                            >
                              <Pencil className="w-3.5 h-3.5" /> Edit Kategori
                            </button>
                            <button
                              onClick={() => handleDelCat(cat)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg hover:bg-destructive/10 text-destructive transition-colors text-left"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Hapus Kategori
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Tombol Accordion (Di sebelah kanan tombol options) */}
                    <button
                      onClick={() =>
                        setExpanded((p) => ({ ...p, [cat.id]: !isOpen }))
                      }
                      className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:bg-secondary hover:text-foreground transition-all shrink-0"
                      aria-label="Toggle Accordion"
                    >
                      {isOpen ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* ANIMASI ACCORDION: Bagian Bawah yang Meluncur Mulus */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      className="overflow-hidden rounded-b-2xl bg-card"
                    >
                      <div className="p-3">
                        {catItems.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic p-4 text-center">
                            Belum ada foto. Klik tombol &quot;+ Foto&quot; untuk
                            menambahkan wawasan visual baru.
                          </p>
                        ) : (
                          <SortableList
                            items={catItems}
                            onReorder={(next) =>
                              handleItemReorder(cat.id, next)
                            }
                          >
                            {(it) => {
                              const isThumb = cat.thumbnailItemId === it.id;
                              const isItemMenuOpen =
                                activeMenu?.type === "item" &&
                                activeMenu?.id === it.id;

                              return (
                                /* PERUBAHAN 4: Naikkan z-index item row secara dinamis saat menu opsi item terbuka */
                                <div
                                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2.5 mb-2 rounded-xl border border-border/80 hover:bg-secondary/20 transition-colors ${
                                    isItemMenuOpen
                                      ? "relative z-30"
                                      : "relative z-10"
                                  }`}
                                >
                                  {/* Baris Kiri: Konten Detail Gambar */}
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <DragHandle />
                                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg bg-muted overflow-hidden shrink-0 border border-border/30">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={resolveImageUrl(it.imageUrl)}
                                        alt={it.title}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-bold text-xs sm:text-sm text-foreground truncate">
                                        {it.title}
                                      </p>
                                      <p className="text-[10px] sm:text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                        {it.sourceType === "drive" ? (
                                          <LinkIcon className="w-3 h-3 text-emerald-500" />
                                        ) : (
                                          <UploadIcon className="w-3 h-3 text-amber-500" />
                                        )}
                                        {it.sourceType === "drive"
                                          ? "Google Drive"
                                          : "Lokal / Upload"}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Baris Kanan: Aksi & Opsi Menu Utama Foto */}
                                  <div className="flex items-center justify-end gap-2 border-t border-border/20 pt-2 sm:pt-0 sm:border-none shrink-0">
                                    <button
                                      onClick={() => handleSetThumb(cat, it.id)}
                                      className={`h-7 px-2.5 rounded-lg flex items-center gap-1 text-[11px] font-bold transition-all ${
                                        isThumb
                                          ? "bg-primary/15 text-primary"
                                          : "hover:bg-secondary text-muted-foreground"
                                      }`}
                                      title={
                                        isThumb
                                          ? "Lepas dari thumbnail utama"
                                          : "Jadikan cover thumbnail"
                                      }
                                    >
                                      {isThumb ? (
                                        <>
                                          <Star className="w-3.5 h-3.5 fill-current text-amber-500" />
                                          <span className="text-[10px] font-black text-amber-500">
                                            Cover
                                          </span>
                                        </>
                                      ) : (
                                        <>
                                          <StarOff className="w-3.5 h-3.5" />
                                          <span className="text-[10px] font-normal">
                                            Set Cover
                                          </span>
                                        </>
                                      )}
                                    </button>

                                    {/* UNIFIED OPTIONS DROPDOWN BUTTON FOR ITEM */}
                                    <div className="relative">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveMenu(
                                            isItemMenuOpen
                                              ? null
                                              : { type: "item", id: it.id },
                                          );
                                        }}
                                        className={`h-7 w-7 inline-flex items-center justify-center rounded-lg border transition-all ${
                                          isItemMenuOpen
                                            ? "bg-secondary border-primary/30 text-primary"
                                            : "hover:bg-secondary border-transparent"
                                        }`}
                                        title="Opsi Foto"
                                      >
                                        <MoreVertical className="w-3.5 h-3.5" />
                                      </button>

                                      <AnimatePresence>
                                        {isItemMenuOpen && (
                                          <motion.div
                                            /* PERUBAHAN 5: Mengubah arah buka menu opsi item ke arah kiri horizontal juga */
                                            initial={{
                                              opacity: 0,
                                              scale: 0.95,
                                              x: 10,
                                            }}
                                            animate={{
                                              opacity: 1,
                                              scale: 1,
                                              x: 0,
                                            }}
                                            exit={{
                                              opacity: 0,
                                              scale: 0.95,
                                              x: 10,
                                            }}
                                            transition={{ duration: 0.12 }}
                                            className="absolute right-full top-0 mr-2 w-32 bg-card border border-border rounded-xl shadow-xl z-50 p-1 space-y-0.5"
                                          >
                                            <button
                                              onClick={() =>
                                                setItemForm({
                                                  categoryId: cat.id,
                                                  initial: it,
                                                })
                                              }
                                              className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-semibold rounded-lg hover:bg-secondary transition-colors text-left"
                                            >
                                              <Pencil className="w-3.5 h-3.5" />{" "}
                                              Edit Foto
                                            </button>
                                            <button
                                              onClick={() => handleDelItem(it)}
                                              className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-semibold rounded-lg hover:bg-destructive/10 text-destructive transition-colors text-left"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />{" "}
                                              Hapus Foto
                                            </button>
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </div>
                                  </div>
                                </div>
                              );
                            }}
                          </SortableList>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          }}
        </SortableList>
      )}

      {/* MODAL SYSTEM */}
      {catForm && (
        <CategoryForm
          initial={catForm}
          itemsForThumb={catForm.id ? itemsByCat.get(catForm.id) || [] : []}
          onClose={() => setCatForm(null)}
          onSaved={refresh}
        />
      )}
      {itemForm && (
        <ItemForm
          categoryId={itemForm.categoryId}
          initial={itemForm.initial}
          onClose={() => setItemForm(null)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}

export default AdminGalleryTab;
