'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import type { Post } from '../../lib/types';
import Link from 'next/link';
import { ArrowLeft, Clock, LayoutGrid, Flame, Star } from 'lucide-react';
import { slugifyCategory } from '../../lib/categorySlug';
import { HScroller, HScrollItem } from '@/components/ui/HScroller';
import { CategoryChips } from '@/components/ui/CategoryChips';
import { ArticleCard } from '@/components/ui/ArticleCard';
import { SmartSearchBar, type SortKey } from '@/components/ui/SmartSearchBar';
import { SimplePagination } from '@/components/ui/SimplePagination';
import { ImageWithFallback } from '@/components/ui/ImageWithFallback';

function formatDate(d?: string | null) {
  return d
    ? new Date(d).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })
    : '-';
}

function todayLabel() {
  return new Date().toLocaleDateString('id-ID', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

const PAGE_SIZE = 9;

export function BlogListPage() {
  const { data: posts = [], isLoading } = useQuery<Post[]>({
    queryKey: ['public-posts'],
    queryFn: async () => {
      const res = await apiFetch('/api/posts');
      if (!res.ok) throw new Error('Failed to fetch posts');
      const all: Post[] = await res.json();
      return all.filter((p) => p.status === 'published');
    },
  });

  // Discovery state
  const [search, setSearch] = React.useState('');
  const [sort, setSort] = React.useState<SortKey>('newest');
  const [activeCat, setActiveCat] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);

  React.useEffect(() => {
    setPage(1);
  }, [search, sort, activeCat]);

  // Categories
  const categoryCounts = React.useMemo(() => {
    const map = new Map<string, number>();
    posts.forEach((p) => {
      const cat = (p.category || 'Umum').trim();
      map.set(cat, (map.get(cat) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [posts]);

  // Filter + sort
  const filtered = React.useMemo(() => {
    let list = [...posts];
    if (activeCat) list = list.filter((p) => (p.category || 'Umum') === activeCat);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.excerpt || '').toLowerCase().includes(q) ||
          (p.category || '').toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      switch (sort) {
        case 'oldest':
          return (a.published_at || '').localeCompare(b.published_at || '');
        case 'popular':
          return (((b as any).views || 0) - ((a as any).views || 0));
        case 'az':
          return a.title.localeCompare(b.title);
        case 'newest':
        default:
          return (b.published_at || '').localeCompare(a.published_at || '');
      }
    });
    return list;
  }, [posts, activeCat, search, sort]);

  const isFiltering = !!search.trim() || !!activeCat || sort !== 'newest';

  // Featured rails: only when not filtering, to keep front-page editorial flavor
  const featured = posts.slice(0, 3);
  const [lead, ...secondaryFeatured] = featured;
  const popular = [...posts]
    .sort((a, b) => (((b as any).views || 0) - ((a as any).views || 0)))
    .slice(0, 8);

  // Paginated grid
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 pt-8 md:pt-12">
        <nav className="mb-6 flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center text-foreground/70 font-semibold hover:text-foreground transition-colors text-sm uppercase tracking-widest"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Beranda
          </Link>
          <Link
            href="/berita/kategori"
            className="inline-flex items-center text-foreground/70 font-semibold hover:text-foreground transition-colors text-sm uppercase tracking-widest"
          >
            <LayoutGrid className="w-4 h-4 mr-2" /> Indeks Kategori
          </Link>
        </nav>

        {/* Masthead */}
        <header className="text-center border-y-4 border-double border-foreground py-8 md:py-10 mb-6">
          <p className="text-[11px] uppercase tracking-[0.4em] text-muted-foreground mb-3">
            Edisi Digital · {todayLabel()}
          </p>
          <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-foreground leading-none tracking-tight">
            PPMH <span className="italic font-normal">Insight</span>
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-4 italic font-serif-body">
            "Membangun generasi unggul melalui keterbukaan informasi."
          </p>
        </header>
      </div>

      {/* Sticky discovery bar */}
      <div className="sticky top-0 z-30 bg-background/85 backdrop-blur-sm border-y border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-4 space-y-3">
          <SmartSearchBar
            value={search}
            onChange={setSearch}
            sort={sort}
            onSortChange={setSort}
            resultCount={isFiltering ? filtered.length : undefined}
          />
          {categoryCounts.length > 0 && (
            <CategoryChips
              categories={categoryCounts}
              activeName={activeCat}
              onSelect={setActiveCat}
            />
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 pt-10">
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 h-[420px] bg-muted/40 animate-pulse rounded-sm" />
            <div className="space-y-6">
              <div className="h-48 bg-muted/40 animate-pulse rounded-sm" />
              <div className="h-48 bg-muted/40 animate-pulse rounded-sm" />
            </div>
          </div>
        ) : posts.length === 0 ? (
          <div className="py-24 text-center text-muted-foreground border border-dashed border-border">
            <p className="font-serif-body italic">Belum ada artikel yang diterbitkan.</p>
          </div>
        ) : (
          <>
            {/* Newspaper Hero (only when no filter active — keep front-page magic) */}
            {!isFiltering && lead && (
              <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10 pb-12 mb-12 border-b border-border">
                <article className="lg:col-span-2 group">
                  <Link href={`/blog/${lead.slug || lead.id}`} className="block">
                    <ImageWithFallback
                      src={lead.featured_image || null}
                      alt={lead.title}
                      fallbackType="gradient"
                      fill
                      sizes="(max-width: 1024px) 100vw, 66vw"
                      containerClassName="w-full aspect-[16/10] mb-6"
                      className="transition-transform duration-700 group-hover:scale-[1.03]"
                    />
                    {lead.category && (
                      <span className="inline-block text-[10px] uppercase tracking-[0.3em] font-bold text-primary mb-3">
                        {lead.category}
                      </span>
                    )}
                    <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-black text-foreground leading-[1.05] tracking-tight group-hover:text-primary transition-colors">
                      {lead.title}
                    </h2>
                    {lead.excerpt && (
                      <p className="font-serif-body text-lg text-foreground/75 mt-4 leading-relaxed line-clamp-3">
                        {lead.excerpt}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground mt-5 font-semibold">
                      <Clock className="w-3.5 h-3.5" />
                      <time>{formatDate(lead.published_at)}</time>
                    </div>
                  </Link>
                </article>

                <div className="lg:col-span-1 lg:border-l lg:border-border lg:pl-8 space-y-8 divide-y divide-border">
                  {secondaryFeatured.map((post, idx) => (
                    <article key={post.id} className={`group ${idx > 0 ? 'pt-8' : ''}`}>
                      <Link href={`/blog/${post.slug || post.id}`} className="block">
                        <ImageWithFallback
                          src={post.featured_image || null}
                          alt={post.title}
                          fallbackType="gradient"
                          fill
                          sizes="(max-width: 1024px) 100vw, 33vw"
                          containerClassName="w-full aspect-[16/9] mb-4"
                          className="transition-transform duration-700 group-hover:scale-[1.03]"
                        />
                        {post.category && (
                          <span className="inline-block text-[10px] uppercase tracking-[0.3em] font-bold text-primary mb-2">
                            {post.category}
                          </span>
                        )}
                        <h3 className="font-display text-xl md:text-2xl font-bold text-foreground leading-tight group-hover:text-primary transition-colors">
                          {post.title}
                        </h3>
                      </Link>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {/* Popular rail (only when no filter) */}
            {!isFiltering && popular.length > 0 && (
              <section className="mb-14">
                <div className="flex items-center gap-4 text-xs uppercase tracking-[0.25em] font-bold text-muted-foreground mb-6">
                  <span className="text-foreground inline-flex items-center gap-2">
                    <Flame className="w-3.5 h-3.5 text-primary" /> Populer Pekan Ini
                  </span>
                  <span className="flex-1 editorial-rule" />
                </div>
                <HScroller ariaLabel="Artikel populer">
                  {popular.map((post) => (
                    <HScrollItem key={post.id}>
                      <ArticleCard post={post} showViews />
                    </HScrollItem>
                  ))}
                </HScroller>
              </section>
            )}

            {/* Filtered / All grid with pagination */}
            <section>
              <div className="flex items-center gap-4 text-xs uppercase tracking-[0.25em] font-bold text-muted-foreground mb-6">
                <span className="text-foreground inline-flex items-center gap-2">
                  <Star className="w-3.5 h-3.5 text-primary" />
                  {isFiltering
                    ? `Hasil${activeCat ? ' · ' + activeCat : ''}`
                    : 'Semua Artikel'}
                </span>
                <span className="flex-1 editorial-rule" />
                <span>{filtered.length} artikel</span>
              </div>

              {pageItems.length === 0 ? (
                <div className="py-16 text-center border border-dashed border-border">
                  <p className="font-serif-body italic text-muted-foreground">
                    Tidak ada artikel yang cocok. Coba kata kunci lain atau reset filter.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
                  {pageItems.map((post) => (
                    <ArticleCard key={post.id} post={post} showViews={sort === 'popular'} />
                  ))}
                </div>
              )}

              <SimplePagination
                page={currentPage}
                totalPages={totalPages}
                onChange={(p) => {
                  setPage(p);
                  if (typeof window !== 'undefined') {
                    window.scrollTo({ top: 320, behavior: 'smooth' });
                  }
                }}
              />
            </section>
          </>
        )}
      </div>
    </div>
  );
}
