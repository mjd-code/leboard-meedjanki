'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { BlogPostsAPI } from '@/hooks/queries';
import type { Post } from '@/lib/types';
import { slugifyCategory } from '@/lib/categorySlug';

interface CategoryBucket {
  name: string;
  slug: string;
  count: number;
  cover?: string;
  latestTitle?: string;
}

export function CategoryIndexPage() {
  const { data: rawPosts = [], isLoading } = BlogPostsAPI.useList();
  const posts: Post[] = React.useMemo(
    () => (rawPosts as Post[]).filter((p) => p.status === 'published'),
    [rawPosts],
  );

  const buckets: CategoryBucket[] = React.useMemo(() => {
    const map = new Map<string, CategoryBucket>();
    const sorted = [...posts].sort((a, b) =>
      (b.published_at ?? '').localeCompare(a.published_at ?? '')
    );
    for (const p of sorted) {
      const name = (p.category || 'Umum').trim();
      const key = slugifyCategory(name);
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(key, {
          name,
          slug: key,
          count: 1,
          cover: p.featured_image,
          latestTitle: p.title,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [posts]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 pt-8 md:pt-12">
        <nav className="mb-6">
          <Link
            href="/blog"
            className="inline-flex items-center text-foreground/70 font-semibold hover:text-foreground transition-colors text-sm uppercase tracking-widest"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> PPMH Insight
          </Link>
        </nav>

        <header className="text-center border-y-4 border-double border-foreground py-8 md:py-10 mb-10">
          <p className="text-[11px] uppercase tracking-[0.4em] text-muted-foreground mb-3">
            Indeks
          </p>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-black text-foreground leading-none tracking-tight">
            Kategori <span className="italic font-normal">Berita</span>
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-4 italic font-serif-body">
            Telusuri tulisan PPMH Insight berdasarkan rubrik.
          </p>
        </header>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-56 bg-muted/40 rounded-sm" />
            ))}
          </div>
        ) : buckets.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground border border-dashed border-border">
            <p className="font-serif-body italic">Belum ada artikel yang dipublikasikan.</p>
          </div>
        ) : (
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {buckets.map((c) => (
              <Link
                key={c.slug}
                href={`/berita/kategori/${c.slug}`}
                className="group block border border-border hover:border-foreground transition-colors"
              >
                {c.cover ? (
                  <div className="relative w-full aspect-[16/10] overflow-hidden bg-muted">
                    <Image
                      src={c.cover}
                      alt={c.name}
                      fill
                      referrerPolicy="no-referrer"
                      className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                      <p className="text-[10px] uppercase tracking-[0.3em] font-bold opacity-80 mb-1">
                        {c.count} artikel
                      </p>
                      <h2 className="font-display text-2xl md:text-3xl font-black leading-tight">
                        {c.name}
                      </h2>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 aspect-[16/10] flex flex-col justify-end bg-foreground/[0.03]">
                    <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-muted-foreground mb-1">
                      {c.count} artikel
                    </p>
                    <h2 className="font-display text-2xl md:text-3xl font-black leading-tight">
                      {c.name}
                    </h2>
                  </div>
                )}
                <div className="flex items-center justify-between px-5 py-4 border-t border-border">
                  <p className="text-xs text-muted-foreground italic font-serif-body line-clamp-1">
                    Terbaru: {c.latestTitle ?? '-'}
                  </p>
                  <span className="inline-flex items-center text-xs font-bold text-primary uppercase tracking-widest shrink-0 ml-3">
                    Buka <ChevronRight className="w-3 h-3 ml-0.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
