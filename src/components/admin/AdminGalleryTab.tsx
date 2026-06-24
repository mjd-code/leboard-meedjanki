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
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { resolveImageUrl } from "@/lib/gdrive";
import { ImageUploader } from "@/components/ui/ImageUploader";
import { SortableList, DragHandle } from "./editor/sortable";
import type { GalleryCategory, GalleryItem } from "@/lib/types";

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
  const r = await apiFetch(`/api/galleryCategories/${id}`, { method: "DELETE" });
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
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-soft w-full max-w-lg border border-border max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-bold text-lg">
            {initial.id ? "Edit Kategori" : "Kategori Baru"}
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-secondary"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-4 overflow-y-auto">
          <div>
            <label className="text-sm font-semibold mb-1 block">Nama</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Misal: Kajian Subuh"
              className="w-full h-10 rounded-xl border border-input bg-background px-3"
            />
          </div>
          <div>
            <label className="text-sm font-semibold mb-1 block">
              Tag pendek
            </label>
            <input
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="Misal: Kajian"
              className="w-full h-10 rounded-xl border border-input bg-background px-3"
            />
          </div>
          <div>
            <label className="text-sm font-semibold mb-1 block">
              Deskripsi
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Deskripsi singkat ditampilkan di header album."
              className="w-full rounded-xl border border-input bg-background p-3 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-semibold mb-1 block">
              Thumbnail (pilih dari foto kategori ini)
            </label>
            {itemsForThumb.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Tambahkan foto dulu, lalu pilih salah satu sebagai thumbnail.
              </p>
            ) : (
              <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                {itemsForThumb.map((it) => {
                  const active = it.id === thumbnailItemId;
                  return (
                    <button
                      key={it.id}
                      type="button"
                      onClick={() =>
                        setThumbnailItemId(active ? null : it.id)
                      }
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
                          <Star className="w-3 h-3" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-border">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-sm font-semibold hover:bg-secondary"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 flex items-center gap-2"
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
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-soft w-full max-w-lg border border-border max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-bold text-lg">
            {initial.id ? "Edit Foto" : "Foto Baru"}
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-secondary"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-4 overflow-y-auto">
          <div>
            <label className="text-sm font-semibold mb-1 block">Judul</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-10 rounded-xl border border-input bg-background px-3"
            />
          </div>
          <div>
            <label className="text-sm font-semibold mb-1 block">
              Deskripsi
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-input bg-background p-3 text-sm"
            />
          </div>

          {/* Source toggle */}
          <div>
            <label className="text-sm font-semibold mb-2 block">
              Sumber gambar
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSourceType("drive")}
                className={`flex items-center gap-2 justify-center px-3 py-2 rounded-xl border text-sm font-semibold transition-all ${
                  sourceType === "drive"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-secondary"
                }`}
              >
                <LinkIcon className="w-4 h-4" />
                Google Drive
              </button>
              <button
                type="button"
                onClick={() => setSourceType("upload")}
                className={`flex items-center gap-2 justify-center px-3 py-2 rounded-xl border text-sm font-semibold transition-all ${
                  sourceType === "upload"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-secondary"
                }`}
              >
                <UploadIcon className="w-4 h-4" />
                Unggah & Crop
              </button>
            </div>
          </div>

          {sourceType === "drive" ? (
            <div>
              <label className="text-sm font-semibold mb-1 block">
                Link Google Drive
              </label>
              <input
                value={imageUrl}
                onChange={(e) => {
                  setImageUrl(e.target.value);
                  setImagePath("");
                }}
                placeholder="https://drive.google.com/file/d/.../view"
                className="w-full h-10 rounded-xl border border-input bg-background px-3"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Pastikan link diatur ke &quot;Anyone with the link&quot;.
              </p>
            </div>
          ) : (
            <div>
              <label className="text-sm font-semibold mb-1 block">
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
            <div className="rounded-xl overflow-hidden border border-border bg-muted aspect-[4/3]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="preview"
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-border">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-sm font-semibold hover:bg-secondary"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 flex items-center gap-2"
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
  const handleItemReorder = async (
    categoryId: string,
    next: GalleryItem[],
  ) => {
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
      !confirm(
        `Hapus kategori "${cat.name}" beserta semua foto di dalamnya?`,
      )
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
        prev.map((c) => (c.id === cat.id ? { ...c, thumbnailItemId: next } : c)),
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
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-black">Manajemen Galeri</h2>
          <p className="text-sm text-muted-foreground">
            Kelola album, urutan, dan foto yang tampil di tab Galeri.
          </p>
        </div>
        <button
          onClick={() =>
            setCatForm({ order: cats.length, thumbnailItemId: null })
          }
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90"
        >
          <Plus className="w-4 h-4" /> Kategori Baru
        </button>
      </div>

      {cats.length === 0 ? (
        <div className="border border-dashed border-border rounded-2xl p-10 text-center text-muted-foreground">
          <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
          Belum ada kategori galeri. Buat kategori pertama untuk memulai.
        </div>
      ) : (
        <SortableList items={cats} onReorder={handleCatReorder}>
          {(cat) => {
            const catItems = itemsByCat.get(cat.id) || [];
            const isOpen = expanded[cat.id] ?? true;
            const thumb = catItems.find((i) => i.id === cat.thumbnailItemId);
            return (
              <div className="border border-border rounded-2xl bg-card mb-3 overflow-hidden">
                <div className="flex items-center gap-2 p-3 border-b border-border bg-secondary/30">
                  <DragHandle />
                  <button
                    onClick={() =>
                      setExpanded((p) => ({ ...p, [cat.id]: !isOpen }))
                    }
                    className="p-1 rounded hover:bg-secondary"
                  >
                    {isOpen ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                  <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden shrink-0">
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={resolveImageUrl(thumb.imageUrl)}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="w-4 h-4 m-3 text-muted-foreground/50" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold truncate">{cat.name}</span>
                      {cat.tag && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary">
                          {cat.tag}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {catItems.length} foto
                      </span>
                    </div>
                    {cat.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {cat.description}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() =>
                      setItemForm({
                        categoryId: cat.id,
                        initial: { order: catItems.length, sourceType: "drive" },
                      })
                    }
                    className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Foto
                  </button>
                  <button
                    onClick={() => setCatForm(cat)}
                    className="p-2 rounded-lg hover:bg-secondary"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelCat(cat)}
                    className="p-2 rounded-lg hover:bg-destructive/10 text-destructive"
                    title="Hapus"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {isOpen && (
                  <div className="p-3">
                    {catItems.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic p-3">
                        Belum ada foto. Klik &quot;Foto&quot; di kanan untuk
                        menambahkan.
                      </p>
                    ) : (
                      <SortableList
                        items={catItems}
                        onReorder={(next) => handleItemReorder(cat.id, next)}
                      >
                        {(it) => {
                          const isThumb = cat.thumbnailItemId === it.id;
                          return (
                            <div className="flex items-center gap-2 p-2 mb-1 rounded-xl border border-border hover:bg-secondary/40">
                              <DragHandle />
                              <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden shrink-0">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={resolveImageUrl(it.imageUrl)}
                                  alt={it.title}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm truncate">
                                  {it.title}
                                </p>
                                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                                  {it.sourceType === "drive" ? (
                                    <LinkIcon className="w-3 h-3" />
                                  ) : (
                                    <UploadIcon className="w-3 h-3" />
                                  )}
                                  {it.sourceType === "drive"
                                    ? "Google Drive"
                                    : "Upload"}
                                </p>
                              </div>
                              <button
                                onClick={() => handleSetThumb(cat, it.id)}
                                className={`p-2 rounded-lg ${
                                  isThumb
                                    ? "bg-primary/15 text-primary"
                                    : "hover:bg-secondary text-muted-foreground"
                                }`}
                                title={
                                  isThumb
                                    ? "Lepas sebagai thumbnail"
                                    : "Jadikan thumbnail"
                                }
                              >
                                {isThumb ? (
                                  <Star className="w-4 h-4 fill-current" />
                                ) : (
                                  <StarOff className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                onClick={() =>
                                  setItemForm({
                                    categoryId: cat.id,
                                    initial: it,
                                  })
                                }
                                className="p-2 rounded-lg hover:bg-secondary"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelItem(it)}
                                className="p-2 rounded-lg hover:bg-destructive/10 text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        }}
                      </SortableList>
                    )}
                  </div>
                )}
              </div>
            );
          }}
        </SortableList>
      )}

      {catForm && (
        <CategoryForm
          initial={catForm}
          itemsForThumb={
            catForm.id ? itemsByCat.get(catForm.id) || [] : []
          }
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
