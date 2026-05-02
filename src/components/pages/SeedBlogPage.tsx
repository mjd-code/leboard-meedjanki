'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { SEED_POSTS, type SeedPost } from '@/lib/seed/blogSeedData';
import type { Post } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

type Row = {
  slug: string;
  title: string;
  status: 'pending' | 'skipped' | 'created' | 'updated' | 'error';
  detail?: string;
};

function publishedAt(daysAgo: number) {
  return new Date(Date.now() - daysAgo * 86400000).toISOString();
}

function toPostBody(s: SeedPost): Partial<Post> {
  return {
    title: s.title,
    slug: s.slug,
    content: s.content,
    excerpt: s.excerpt,
    featured_image: s.featured_image,
    status: 'published',
    category: s.category,
    tags: s.tags,
    meta_title: s.meta_title,
    meta_description: s.meta_description,
    published_at: publishedAt(s.daysAgo),
    author_id: 'admin',
  };
}

export function SeedBlogPage() {
  const [rows, setRows] = useState<Row[]>(
    SEED_POSTS.map((p) => ({ slug: p.slug, title: p.title, status: 'pending' }))
  );
  const [running, setRunning] = useState(false);
  const [overwrite, setOverwrite] = useState(false);
  const [done, setDone] = useState(false);

  const update = (slug: string, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.slug === slug ? { ...r, ...patch } : r)));

  const seed = async () => {
    setRunning(true);
    setDone(false);

    let existing: Post[] = [];
    try {
      const res = await apiFetch('/api/posts');
      if (res.ok) existing = await res.json();
    } catch (e) {
      console.warn('Could not preload existing posts', e);
    }
    const bySlug = new Map(existing.map((p) => [p.slug, p]));

    for (const seed of SEED_POSTS) {
      const body = toPostBody(seed);
      const found = bySlug.get(seed.slug);

      if (found && !overwrite) {
        update(seed.slug, { status: 'skipped', detail: 'Sudah ada' });
        continue;
      }

      try {
        const url = found ? `/api/posts/${found.id}` : '/api/posts';
        const method = found ? 'PUT' : 'POST';
        const res = await apiFetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const txt = await res.text().catch(() => '');
          update(seed.slug, { status: 'error', detail: `${res.status} ${txt.slice(0, 80)}` });
        } else {
          update(seed.slug, { status: found ? 'updated' : 'created' });
        }
      } catch (e: any) {
        update(seed.slug, { status: 'error', detail: e?.message ?? String(e) });
      }
    }

    setRunning(false);
    setDone(true);
  };

  const counts = rows.reduce(
    (acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }),
    {} as Record<Row['status'], number>
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        <Link
          href="/blog"
          className="inline-flex items-center text-foreground/70 font-semibold hover:text-foreground text-sm uppercase tracking-widest mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Blog
        </Link>

        <header className="border-y-4 border-double border-foreground py-6 mb-8 text-center">
          <p className="text-[11px] uppercase tracking-[0.4em] text-muted-foreground mb-2">
            Developer Tool
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-black tracking-tight">
            Seed Blog Database
          </h1>
          <p className="font-serif-body italic text-muted-foreground mt-3">
            Mengisi pesantren digital dengan {SEED_POSTS.length} artikel panjang multi-kategori.
          </p>
        </header>

        <div className="flex flex-wrap items-center gap-3 mb-6">
          <Button onClick={seed} disabled={running} size="lg">
            {running ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Memproses…
              </>
            ) : done ? (
              'Jalankan Ulang'
            ) : (
              'Mulai Seeding'
            )}
          </Button>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={overwrite}
              onChange={(e) => setOverwrite(e.target.checked)}
              disabled={running}
            />
            Timpa artikel yang sudah ada (slug sama)
          </label>
        </div>

        {done && (
          <div className="mb-6 grid grid-cols-2 sm:grid-cols-5 gap-3 text-center text-sm">
            <Stat label="Dibuat" value={counts.created ?? 0} tone="ok" />
            <Stat label="Diupdate" value={counts.updated ?? 0} tone="ok" />
            <Stat label="Dilewati" value={counts.skipped ?? 0} tone="muted" />
            <Stat label="Gagal" value={counts.error ?? 0} tone="error" />
            <Stat label="Total" value={rows.length} />
          </div>
        )}

        <div className="border border-border divide-y divide-border">
          {rows.map((r) => (
            <div key={r.slug} className="flex items-center gap-3 px-4 py-3">
              <StatusIcon status={r.status} />
              <div className="flex-1 min-w-0">
                <p className="font-display font-bold truncate">{r.title}</p>
                <p className="text-xs text-muted-foreground truncate">/{r.slug}</p>
              </div>
              {r.detail && (
                <p className="text-xs text-muted-foreground max-w-[40%] truncate">
                  {r.detail}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: 'ok' | 'error' | 'muted';
}) {
  const color =
    tone === 'ok'
      ? 'text-emerald-600'
      : tone === 'error'
        ? 'text-destructive'
        : tone === 'muted'
          ? 'text-muted-foreground'
          : 'text-foreground';
  return (
    <div className="border border-border py-3">
      <div className={`font-display text-2xl font-black ${color}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
        {label}
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: Row['status'] }) {
  if (status === 'created' || status === 'updated')
    return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
  if (status === 'error') return <XCircle className="w-5 h-5 text-destructive" />;
  if (status === 'skipped')
    return <CheckCircle2 className="w-5 h-5 text-muted-foreground" />;
  return <div className="w-5 h-5 rounded-full border-2 border-muted" />;
}
