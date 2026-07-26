"use client";

/**
 * Admin CRUD for the public "Sejarah" tab (About page).
 *
 * Manages three data surfaces:
 *  - Sejarah section: single editorial block (title + body + optional photo).
 *  - Visi & Misi section: editorial block plus a repeatable Misi list.
 *  - Personnel: rows for Masyayikh (photo cards) and Pengurus (list).
 *
 * All rows carry a `visible` toggle so a section can be hidden from the
 * public page without deletion. Personnel photos accept either a Google
 * Drive share URL or a direct upload via ImageUploader (Firebase Storage).
 */

import React, { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  Loader2,
  Save,
  Eye,
  EyeOff,
  Link as LinkIcon,
  Upload as UploadIcon,
  ArrowUp,
  ArrowDown,
  History,
  BookOpen,
  Users as UsersIcon,
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { resolveImageUrl } from "@/lib/gdrive";
import { ImageUploader } from "@/components/ui/ImageUploader";
import type { SejarahSection, Personnel } from "@/lib/types";

// ---------- API helpers ----------
async function listSections(): Promise<SejarahSection[]> {
  const r = await apiFetch("/api/sejarahContent");
  if (!r.ok) return [];
  return (await r.json()) as SejarahSection[];
}
async function upsertSection(s: Partial<SejarahSection>) {
  const r = await apiFetch("/api/sejarahContent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(s),
  });
  if (!r.ok) throw new Error("Gagal menyimpan bagian");
  return r.json();
}
async function listPersonnel(): Promise<Personnel[]> {
  const r = await apiFetch("/api/personnel");
  if (!r.ok) return [];
  const rows = (await r.json()) as Personnel[];
  return [...rows].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}
async function savePersonnel(p: Partial<Personnel> & { id?: string }) {
  const isEdit = !!p.id;
  const r = await apiFetch(
    isEdit ? `/api/personnel/${p.id}` : "/api/personnel",
    {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p),
    },
  );
  if (!r.ok) throw new Error("Gagal menyimpan personil");
  return r.json();
}
async function deletePersonnel(id: string) {
  const r = await apiFetch(`/api/personnel/${id}`, { method: "DELETE" });
  if (!r.ok) throw new Error("Gagal menghapus personil");
}
async function reorderPersonnel(items: { id: string; order: number }[]) {
  await apiFetch("/api/personnel/reorder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
}

// ---------- Small reusable field wrappers ----------
function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label className="text-xs sm:text-sm font-semibold mb-1 block">
        {label}
      </label>
      {children}
      {hint && (
        <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>
      )}
    </div>
  );
}

function VisibilityToggle({
  visible,
  onChange,
}: {
  visible: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!visible)}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
        visible
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : "border-border bg-muted text-muted-foreground"
      }`}
      title={visible ? "Tampil di halaman publik" : "Disembunyikan"}
    >
      {visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
      {visible ? "Tampil" : "Sembunyi"}
    </button>
  );
}

// ---------- Section editor (sejarah + visi) ----------
// Self-contained: loads and refreshes ONLY its own row so saving one block
// never resets unsaved edits in the other blocks on this page.
function SectionEditor({
  keyName,
  fallbackTitle,
  withMisi,
}: {
  keyName: string;
  fallbackTitle: string;
  withMisi?: boolean;
}) {
  const [row, setRow] = useState<SejarahSection | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState(fallbackTitle);
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imagePath, setImagePath] = useState("");
  const [visible, setVisible] = useState(true);
  const [misi, setMisi] = useState<
    { num: string; title: string; desc: string }[]
  >([]);
  const [saving, setSaving] = useState(false);

  const hydrate = (s: SejarahSection | null) => {
    setRow(s);
    setTitle(s?.title || fallbackTitle);
    setBody(s?.body || "");
    setImageUrl(s?.imageUrl || "");
    setImagePath(s?.imagePath || "");
    setVisible(s?.visible ?? true);
    setMisi(s?.misi || []);
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      const all = await listSections();
      if (!alive) return;
      hydrate(all.find((s) => s.key === keyName) || null);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyName]);

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Judul wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const saved = await upsertSection({
        id: row?.id || keyName,
        key: keyName,
        title: title.trim(),
        body: body,
        imageUrl,
        imagePath,
        visible,
        misi: withMisi ? misi : undefined,
      });
      // Only this block's snapshot is updated — no page-wide refresh.
      setRow((prev) => ({ ...(prev as any), ...(saved || {}) }));
      toast.success("Bagian tersimpan");
    } catch (e: any) {
      toast.error(e.message || "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  const addMisi = () =>
    setMisi((m) => [
      ...m,
      { num: String(m.length + 1).padStart(2, "0"), title: "", desc: "" },
    ]);
  const removeMisi = (idx: number) =>
    setMisi((m) => m.filter((_, i) => i !== idx));
  const updateMisi = (idx: number, patch: Partial<{ num: string; title: string; desc: string }>) =>
    setMisi((m) => m.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="font-bold text-base sm:text-lg flex items-center gap-2">
          {fallbackTitle}
          {loading && (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
          )}
        </h3>
        <VisibilityToggle visible={visible} onChange={setVisible} />
      </div>

      <Field label="Judul">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none"
        />
      </Field>

      <Field label="Isi / Deskripsi">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          className="w-full rounded-xl border border-input bg-background p-3 text-sm resize-y focus:outline-none"
        />
      </Field>

      <Field label="Foto pendukung (opsional)">
        <ImageUploader
          folder="sejarah"
          aspectRatio={16 / 9}
          title={imageUrl ? "Ganti Gambar" : "Unggah Gambar"}
          onUploadSuccess={(url, meta) => {
            setImageUrl(url);
            setImagePath(meta?.path || "");
          }}
        />
        {imageUrl && (
          <div className="mt-2 rounded-xl overflow-hidden border border-border max-w-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resolveImageUrl(imageUrl)}
              alt="preview"
              className="w-full aspect-video object-cover"
            />
          </div>
        )}
      </Field>

      {withMisi && (
        <div className="pt-2 space-y-3 border-t border-border">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">Daftar Misi</h4>
            <button
              type="button"
              onClick={addMisi}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-secondary hover:bg-secondary/80"
            >
              <Plus className="w-3.5 h-3.5" /> Tambah Misi
            </button>
          </div>
          {misi.length === 0 ? (
            <p className="text-xs italic text-muted-foreground">
              Belum ada misi. Klik "Tambah Misi".
            </p>
          ) : (
            <div className="space-y-2">
              {misi.map((m, idx) => (
                <div
                  key={idx}
                  className="flex gap-2 items-start p-3 rounded-xl border border-border bg-background"
                >
                  <input
                    value={m.num}
                    onChange={(e) => updateMisi(idx, { num: e.target.value })}
                    className="w-14 h-9 rounded-lg border border-input bg-background px-2 text-xs text-center"
                    placeholder="01"
                  />
                  <div className="flex-1 space-y-2">
                    <input
                      value={m.title}
                      onChange={(e) => updateMisi(idx, { title: e.target.value })}
                      placeholder="Judul misi"
                      className="w-full h-9 rounded-lg border border-input bg-background px-2 text-xs"
                    />
                    <textarea
                      value={m.desc}
                      onChange={(e) => updateMisi(idx, { desc: e.target.value })}
                      rows={2}
                      placeholder="Deskripsi singkat misi"
                      className="w-full rounded-lg border border-input bg-background p-2 text-xs resize-y"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeMisi(idx)}
                    className="p-2 rounded-lg hover:bg-destructive/10 text-destructive"
                    title="Hapus misi"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-60"
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
  );
}

// ---------- Personnel editor ----------
function PersonnelForm({
  initial,
  onClose,
  onSaved,
}: {
  initial: Partial<Personnel> & { kind: "masyayikh" | "pengurus" };
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initial.name || "");
  const [role, setRole] = useState(initial.role || "");
  const [bio, setBio] = useState(initial.bio || "");
  const [sourceType, setSourceType] = useState<"drive" | "upload">(
    initial.sourceType || "drive",
  );
  const [photoUrl, setPhotoUrl] = useState(initial.photoUrl || "");
  const [photoPath, setPhotoPath] = useState(initial.photoPath || "");
  const [visible, setVisible] = useState(initial.visible ?? true);
  const [saving, setSaving] = useState(false);

  const previewUrl = useMemo(() => (photoUrl ? resolveImageUrl(photoUrl) : ""), [photoUrl]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Nama wajib diisi");
      return;
    }
    setSaving(true);
    try {
      await savePersonnel({
        id: initial.id,
        kind: initial.kind,
        name: name.trim(),
        role: role.trim(),
        bio: bio.trim(),
        sourceType,
        photoUrl: photoUrl.trim(),
        photoPath: sourceType === "upload" ? photoPath : "",
        order: initial.order ?? Date.now(),
        visible,
      });
      toast.success("Personil tersimpan");
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
            {initial.id ? "Edit Personil" : "Personil Baru"}{" "}
            <span className="text-xs font-normal text-muted-foreground">
              ({initial.kind === "masyayikh" ? "Masyayikh" : "Pengurus"})
            </span>
          </h3>
          <VisibilityToggle visible={visible} onChange={setVisible} />
        </div>
        <div className="p-4 space-y-4 overflow-y-auto flex-1 text-sm">
          <Field label="Nama (wajib)">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none"
            />
          </Field>
          <Field label="Jabatan / Peran (opsional)">
            <input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="mis. Pengasuh Utama"
              className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none"
            />
          </Field>
          <Field label="Bio singkat (opsional)">
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-input bg-background p-3 text-sm resize-y focus:outline-none"
            />
          </Field>

          <Field label="Sumber foto">
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
                <LinkIcon className="w-3.5 h-3.5" /> Google Drive
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
                <UploadIcon className="w-3.5 h-3.5" /> Unggah & Crop
              </button>
            </div>
          </Field>

          {sourceType === "drive" ? (
            <Field
              label="Link Google Drive"
              hint="Pastikan link diatur ke 'Anyone with the link'."
            >
              <input
                value={photoUrl}
                onChange={(e) => {
                  setPhotoUrl(e.target.value);
                  setPhotoPath("");
                }}
                placeholder="https://drive.google.com/file/d/.../view"
                className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none"
              />
            </Field>
          ) : (
            <Field label="Unggah foto">
              <ImageUploader
                folder="personnel"
                aspectRatio={1}
                title={photoUrl ? "Ganti Foto" : "Pilih & Crop Foto"}
                onUploadSuccess={(url, meta) => {
                  setPhotoUrl(url);
                  setPhotoPath(meta?.path || "");
                }}
              />
            </Field>
          )}

          {previewUrl && (
            <div className="rounded-xl overflow-hidden border border-border bg-muted aspect-square relative max-w-[10rem] mx-auto">
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
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold hover:bg-secondary"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 flex items-center gap-2"
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

// ---------- Personnel list per kind ----------
function PersonnelSection({
  kind,
  title,
  icon: Icon,
  personnel,
  onRefresh,
}: {
  kind: "masyayikh" | "pengurus";
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  personnel: Personnel[];
  onRefresh: () => void;
}) {
  const [form, setForm] = useState<
    (Partial<Personnel> & { kind: "masyayikh" | "pengurus" }) | null
  >(null);
  const list = personnel.filter((p) => p.kind === kind);

  const move = async (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= list.length) return;
    const a = list[idx];
    const b = list[target];
    const swapped: { id: string; order: number }[] = [
      { id: a.id, order: b.order ?? target },
      { id: b.id, order: a.order ?? idx },
    ];
    try {
      await reorderPersonnel(swapped);
      onRefresh();
    } catch (e: any) {
      toast.error(e.message || "Gagal mengurutkan");
    }
  };

  const del = async (p: Personnel) => {
    if (!confirm(`Hapus "${p.name}"?`)) return;
    try {
      await deletePersonnel(p.id);
      toast.success("Terhapus");
      onRefresh();
    } catch (e: any) {
      toast.error(e.message || "Gagal menghapus");
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
            <Icon className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-base sm:text-lg">{title}</h3>
          <span className="text-xs text-muted-foreground">
            ({list.length})
          </span>
        </div>
        <button
          type="button"
          onClick={() =>
            setForm({ kind, order: Date.now(), visible: true, sourceType: "drive" })
          }
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90"
        >
          <Plus className="w-3.5 h-3.5" /> Tambah
        </button>
      </div>

      {list.length === 0 ? (
        <p className="text-sm italic text-muted-foreground">
          Belum ada data.
        </p>
      ) : (
        <div className="space-y-2">
          {list.map((p, idx) => (
            <div
              key={p.id}
              className="flex items-center gap-3 p-3 rounded-xl border border-border bg-background"
            >
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted shrink-0 border border-border">
                {p.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={resolveImageUrl(p.photoUrl)}
                    alt={p.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                    –
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm truncate">{p.name}</span>
                  {!p.visible && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      hidden
                    </span>
                  )}
                </div>
                {p.role && (
                  <div className="text-xs text-muted-foreground truncate">
                    {p.role}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => move(idx, -1)}
                  disabled={idx === 0}
                  className="p-1.5 rounded-md hover:bg-secondary disabled:opacity-40"
                  title="Naik"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => move(idx, 1)}
                  disabled={idx === list.length - 1}
                  className="p-1.5 rounded-md hover:bg-secondary disabled:opacity-40"
                  title="Turun"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setForm({ ...p })}
                  className="px-2 py-1 rounded-md text-xs font-semibold hover:bg-secondary"
                >
                  Edit
                </button>
                <button
                  onClick={() => del(p)}
                  className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive"
                  title="Hapus"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {form && (
        <PersonnelForm
          initial={form}
          onClose={() => setForm(null)}
          onSaved={onRefresh}
        />
      )}
    </div>
  );
}

// ---------- Main tab ----------
export function AdminSejarahTab() {
  const [sections, setSections] = useState<SejarahSection[]>([]);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const [s, p] = await Promise.all([listSections(), listPersonnel()]);
      setSections(s);
      setPersonnel(p);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const sejarah = sections.find((s) => s.key === "sejarah") || null;
  const visi = sections.find((s) => s.key === "visi") || null;

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center text-muted-foreground text-sm">
        <Loader2 className="w-4 h-4 animate-spin mr-2" /> Memuat data…
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <History className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-bold text-lg sm:text-xl">Kelola Halaman Sejarah</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Perubahan di sini langsung tampil di tab "Sejarah" halaman Tentang.
          </p>
        </div>
      </div>

      <SectionEditor
        initial={sejarah}
        keyName="sejarah"
        fallbackTitle="Sejarah Berdirinya Lembaga"
        onSaved={refresh}
      />
      <SectionEditor
        initial={visi}
        keyName="visi"
        fallbackTitle="Visi & Misi"
        withMisi
        onSaved={refresh}
      />

      <PersonnelSection
        kind="masyayikh"
        title="Dewan Masyayikh & Pimpinan"
        icon={BookOpen}
        personnel={personnel}
        onRefresh={refresh}
      />
      <PersonnelSection
        kind="pengurus"
        title="Struktur Kepengurusan"
        icon={UsersIcon}
        personnel={personnel}
        onRefresh={refresh}
      />
    </div>
  );
}

export default AdminSejarahTab;