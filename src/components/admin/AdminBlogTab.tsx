import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Edit2, Trash2, Globe, EyeOff, Check, X, ShieldAlert, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { ConfirmModal } from '../ui/ConfirmModal';
import { DataTable } from '../ui/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import type { Post, AdminUser } from '../../lib/types';
import { TiptapEditor } from './TiptapEditor';
import { useAuthRole } from '@/hooks/useAuthRole';
import Image from 'next/image';
import { ImageUploader } from '../ui/ImageUploader';
import { toast } from 'sonner';

export function AdminBlogTab() {
  const queryClient = useQueryClient();
  const { isSuperAdmin } = useAuthRole();
  const [isEditing, setIsEditing] = useState<Partial<Post> | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[] | null>(null);

  const { data: posts = [], isLoading } = useQuery<Post[]>({
    queryKey: ['posts'],
    queryFn: async () => {
      const res = await apiFetch('/api/posts');
      if (!res.ok) throw new Error('Failed to fetch posts');
      return res.json();
    }
  });

  const { data: adminUsers = [] } = useQuery<AdminUser[]>({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await apiFetch('/api/admin_users');
      if (!res.ok) throw new Error('Failed to fetch admins');
      return res.json();
    }
  });

  const existingCategories = useMemo(() => {
    const cats = new Set(posts.map(p => p.category).filter(Boolean));
    return Array.from(cats);
  }, [posts]);


  const saveMutation = useMutation({
    mutationFn: async (post: Partial<Post>) => {
      const url = post.id ? `/api/posts/${post.id}` : '/api/posts';
      const method = post.id ? 'PUT' : 'POST';
      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(post)
      });
      if (!res.ok) throw new Error('Failed to save post');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      setIsEditing(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(`/api/posts/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete post');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      setDeleteConfirmId(null);
    }
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id =>
        apiFetch(`/api/posts/${id}`, { method: 'DELETE' }).catch(() => null)
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      setBulkDeleteIds(null);
    }
  });

  const columns = useMemo<ColumnDef<Post>[]>(() => [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
          onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
          aria-label="Pilih semua"
          className="h-4 w-4"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(v) => row.toggleSelected(!!v)}
          aria-label="Pilih baris"
          className="h-4 w-4"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'title',
      header: 'Judul',
      cell: ({ row }) => <div className="font-medium max-w-[300px] truncate">{row.getValue('title')}</div>
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const isPub = row.getValue('status') === 'published';
        return (
          <div className="flex items-center gap-2">
            <Badge variant={isPub ? 'default' : 'secondary'} className="gap-1 rounded-full whitespace-nowrap">
              {isPub ? <Globe className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              {isPub ? 'Terbit' : 'Draf'}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              className="h-6 w-6 p-0"
              title={isPub ? "Jadikan Draf" : "Terbitkan"}
              onClick={() => {
                 saveMutation.mutate({ 
                   id: row.original.id, 
                   status: isPub ? 'draft' : 'published',
                   published_at: isPub ? row.original.published_at : new Date().toISOString()
                 });
              }}
            >
              {isPub ? <EyeOff className="w-3 h-3" /> : <Check className="w-3 h-3" />}
            </Button>
          </div>
        );
      }
    },
    {
      accessorKey: 'category',
      header: 'Kategori',
      cell: ({ row }) => <span className="text-muted-foreground">{row.getValue('category') || '-'}</span>
    },
    {
      accessorKey: 'author_id',
      header: 'Penulis',
      cell: ({ row }) => {
        const authorId = row.getValue('author_id');
        const author = adminUsers.find(u => u.id === authorId);
        return <span className="text-muted-foreground">{author ? author.full_name || author.email : '-'}</span>;
      }
    },
    {
      accessorKey: 'published_at',
      header: 'Tanggal Terbit',
      cell: ({ row }) => {
        const dateStr = row.getValue('published_at');
        return <span className="text-muted-foreground text-sm">{dateStr ? new Date(dateStr as string).toLocaleDateString('id-ID') : '-'}</span>;
      }
    },
    {
      id: 'actions',
      header: 'Aksi',
      cell: ({ row }) => (
        <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={() => setIsEditing(row.original)} aria-label="Ubah">
            <Edit2 className="w-4 h-4" />
          </Button>
          {isSuperAdmin && (
              <Button variant="ghost" size="icon" aria-label="Hapus" onClick={() => setDeleteConfirmId(row.original.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      )
    }
  ], [isSuperAdmin]);

  if (isEditing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">{isEditing.id ? 'Ubah Artikel' : 'Tulis Artikel Baru'}</h2>
          <Button variant="ghost" onClick={() => setIsEditing(null)}><X className="w-4 h-4 mr-2" /> Batal</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6 bg-card text-card-foreground p-6 rounded-2xl border border-border shadow-soft">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Judul Artikel</label>
              <Input
                value={isEditing.title || ''}
                onChange={e => setIsEditing({ 
                  ...isEditing, 
                  title: e.target.value, 
                  slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
                 })}
                placeholder="Masukkan judul..."
                className="text-lg font-medium py-6"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Konten</label>
              <TiptapEditor 
                content={isEditing.content || ''} 
                onChange={(html) => setIsEditing({ ...isEditing, content: html })} 
              />
            </div>
          </div>
          
          <div className="space-y-6 bg-card text-card-foreground p-6 rounded-2xl border border-border shadow-soft h-fit">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Status</label>
              <select 
                className="w-full p-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                value={isEditing.status || 'draft'}
                onChange={e => setIsEditing({ ...isEditing, status: e.target.value as 'draft' | 'published' })}
              >
                <option value="draft">Draf</option>
                <option value="published">Terbit</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Penulis</label>
              <select 
                className="w-full p-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                value={isEditing.author_id || ''}
                onChange={e => setIsEditing({ ...isEditing, author_id: e.target.value })}
              >
                <option value="">-- Pilih Penulis --</option>
                {adminUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Kategori</label>
              <Input
                list="categories-list"
                value={isEditing.category || ''}
                onChange={e => setIsEditing({ ...isEditing, category: e.target.value })}
                placeholder="Misal: Berita, Pengumuman (Ketik baru)"
              />
              <datalist id="categories-list">
                {existingCategories.map(c => (
                  <option key={c as string} value={c as string} />
                ))}
              </datalist>
            </div>

             <div className="space-y-2">
              <label className="text-sm font-semibold">URL Slug</label>
              <Input
                value={isEditing.slug || ''}
                onChange={e => setIsEditing({ ...isEditing, slug: e.target.value })}
                placeholder="url-artikel-slug"
              />
            </div>

             <div className="space-y-2">
              <label className="text-sm font-semibold">Kutipan Singkat (Excerpt)</label>
              <textarea
                value={isEditing.excerpt || ''}
                onChange={e => setIsEditing({ ...isEditing, excerpt: e.target.value })}
                className="w-full p-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground min-h-[80px] text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="Ringkasan singkat artikel..."
              />
            </div>

            <hr className="border-border my-2" />
            <h3 className="font-bold text-sm">Analytics & Views</h3>
            
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Offset Views (Seeding)</label>
              <Input
                type="number"
                min="0"
                value={isEditing.offset_views || 0}
                onChange={e => setIsEditing({ ...isEditing, offset_views: parseInt(e.target.value, 10) || 0 })}
                className="h-9 text-sm"
              />
              <p className="text-[10px] text-muted-foreground">
                Organic Views: {isEditing.organic_views || 0} | Total: {(isEditing.organic_views || 0) + (isEditing.offset_views || 0)}
              </p>
            </div>

            <hr className="border-border my-2" />
            <h3 className="font-bold text-sm">SEO & Social Sharing</h3>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Meta Title</label>
              <Input
                value={isEditing.meta_title || ''}
                onChange={e => setIsEditing({ ...isEditing, meta_title: e.target.value })}
                placeholder="Title untuk pencarian..."
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Meta Description</label>
              <textarea
                value={isEditing.meta_description || ''}
                onChange={e => setIsEditing({ ...isEditing, meta_description: e.target.value })}
                className="w-full p-2 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground min-h-[60px] text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="Description singkat..."
              />
            </div>
            
             <div className="bg-muted/50 p-3 rounded-lg border border-border text-xs space-y-1 shadow-sm mt-2">
               <p className="font-medium text-muted-foreground mb-1 border-b border-border pb-1">Pratinjau Pencarian</p>
               <p className="font-bold text-primary line-clamp-1">{isEditing.meta_title || isEditing.title || 'Judul Artikel'}</p>
               <p className="text-foreground/70 line-clamp-1">https://ppmh.com/blog/{isEditing.slug || 'url-artikel-slug'}</p>
               <p className="text-muted-foreground line-clamp-2">{isEditing.meta_description || isEditing.excerpt || 'Deskripsi akan muncul di sini saat artikel dibagikan atau dicari di Google...'}</p>
            </div>

            <hr className="border-border my-2" />
            <h3 className="font-bold text-sm">Media</h3>

            <div className="space-y-4">
              <label className="text-xs font-semibold text-muted-foreground">Gambar Utama (Featured Image)</label>
              {isEditing.featured_image && (
                <div className="relative w-full h-32 rounded-lg overflow-hidden group border border-border bg-muted">
                  <Image src={isEditing.featured_image} alt="Featured" fill referrerPolicy="no-referrer" className="object-cover" />
                  <button 
                    onClick={() => setIsEditing({ ...isEditing, featured_image: '' })}
                    className="absolute top-2 right-2 bg-foreground/60 p-1.5 rounded-full text-background opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Hapus gambar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              <div className="flex flex-col gap-2">
                <Input
                  value={isEditing.featured_image || ''}
                  onChange={e => setIsEditing({ ...isEditing, featured_image: e.target.value })}
                  placeholder="URL Gambar..."
                  className="h-8 text-sm flex-1"
                />
                <ImageUploader 
                  folder="thumbnails" 
                  aspectRatio={16/9} 
                  onUploadSuccess={(url) => setIsEditing({ ...isEditing, featured_image: url })} 
                  trigger={
                    <Button variant="outline" size="sm" className="w-full relative overflow-hidden" type="button">
                      Pilih Gambar Lokal
                    </Button>
                  }
                  className="w-full"
                />
              </div>
            </div>

            <Button 
              className="w-full rounded-xl py-6 font-bold shadow-primary-glow mt-6" 
              onClick={() => {
                let generatedSlug = isEditing.slug;
                if (!generatedSlug && isEditing.title) {
                  generatedSlug = isEditing.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                }

                let generatedExcerpt = isEditing.excerpt;
                if (!generatedExcerpt && isEditing.content) {
                  const tempEl = document.createElement('div');
                  tempEl.innerHTML = isEditing.content;
                  const text = tempEl.textContent || tempEl.innerText || '';
                  generatedExcerpt = text.slice(0, 160).trim() + (text.length > 160 ? '...' : '');
                }

                let finalMetaTitle = isEditing.meta_title || isEditing.title;
                let finalMetaDesc = isEditing.meta_description || generatedExcerpt;

                saveMutation.mutate({ 
                  ...isEditing, 
                  slug: generatedSlug,
                  excerpt: generatedExcerpt,
                  meta_title: finalMetaTitle,
                  meta_description: finalMetaDesc,
                  published_at: isEditing.status === 'published' && !isEditing.published_at ? new Date().toISOString() : isEditing.published_at 
                });
              }}
              disabled={saveMutation.isPending || !isEditing.title}
            >
              {saveMutation.isPending ? 'Menyimpan...' : (isEditing.id ? 'Simpan Perubahan' : 'Buat Artikel')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card text-card-foreground p-6 rounded-2xl border border-border shadow-soft">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">PPMH Insight <Badge className="bg-primary/20 text-primary hover:bg-primary/30">CMS</Badge></h2>
          <p className="text-muted-foreground mt-1 text-sm">Kelola artikel dan konten publikasi pesantren.</p>
        </div>
        <Button onClick={() => setIsEditing({ status: 'draft' })} className="rounded-xl shadow-primary-glow font-bold gap-2 w-full sm:w-auto">
          <Plus className="w-5 h-5" /> Tulis Artikel
        </Button>
      </div>

      <div className="bg-card text-card-foreground rounded-2xl p-6 border border-border shadow-soft">
        <DataTable
          columns={columns}
          data={posts}
          filterColumn="title"
          filterPlaceholder="Cari judul artikel..."
          onDeleteSelected={isSuperAdmin ? (ids) => setBulkDeleteIds(ids) : undefined}
        />
      </div>

      <ConfirmModal 
        isOpen={!!deleteConfirmId}
        title="Konfirmasi Hapus Artikel"
        message="Apakah Anda yakin ingin menghapus artikel ini? Tindakan ini tidak dapat diurungkan."
        onConfirm={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
        onCancel={() => setDeleteConfirmId(null)}
      />

      <ConfirmModal
        isOpen={!!bulkDeleteIds}
        title="Konfirmasi Hapus Massal"
        message={`Hapus ${bulkDeleteIds?.length ?? 0} artikel? Tindakan ini tidak dapat diurungkan.`}
        onConfirm={() => bulkDeleteIds && bulkDeleteMutation.mutate(bulkDeleteIds)}
        onCancel={() => setBulkDeleteIds(null)}
      />
    </div>
  );
}
