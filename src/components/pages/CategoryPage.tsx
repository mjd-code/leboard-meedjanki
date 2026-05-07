'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronRight, Clock, Star, Flame, TrendingUp, LayoutGrid } from 'lucide-react';
import { BlogPostsAPI } from '@/hooks/queries';
import type { Post } from '@/lib/types';
import { matchesCategorySlug, slugifyCategory } from '@/lib/categorySlug';
import { CategoryChips } from '@/components/ui/CategoryChips';
import { SmartSearchBar, type SortKey } from '@/components/ui/SmartSearchBar';
import { SimplePagination } from '@/components/ui/SimplePagination';
import { ImageWithFallback } from '@/components/ui/ImageWithFallback';

function formatDate(d?: string | null) {
  return d
    ? new Date(d).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })
    : '-';
}

const PAGE_SIZE = 9;

export function CategoryPage({ slug }: { slug: string }) {
  const { data: rawPosts = [], isLoading } = BlogPostsAPI.useList();
  const posts: Post[] = React.useMemo(
    () => (rawPosts as Post[]).filter((p) => p.status === 'published'),
    [rawPosts],
  );

  const inCategory = React.useMemo(
    () => posts.filter((p) => matchesCategorySlug(p.category, slug)),
    [posts, slug]
  );

  const categoryName = inCategory[0]?.category ?? slug.replace(/-/g, ' ');

  // Other categories for the chip bar (links, not filters)
  const otherCategories = React.useMemo(() => {
    const map = new Map<string, number>();
    posts.forEach((p) => {
      const cat = (p.category || 'Umum').trim();
      map.set(cat, (map.get(cat) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [posts]);

  // Filter / sort
  const [search, setSearch] = React.useState('');
  const [sort, setSort] = React.useState<SortKey>('newest');
  const [page, setPage] = React.useState(1);

  React.useEffect(() => {
    setPage(1);
  }, [search, sort, slug]);

  const filtered = React.useMemo(() => {
    let list = [...inCategory];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.excerpt || '').toLowerCase().includes(q)
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
  }, [inCategory, search, sort]);

  const isFiltering = !!search.trim() || sort !== 'newest';
  const lead = filtered[0];
  const popular = [...inCategory]
    .sort((a, b) => (((b as any).views || 0) - ((a as any).views || 0)))
    .slice(0, 5);

  let verticalList = filtered;
  if (!isFiltering && lead) {
    verticalList = filtered.slice(1);
  }

  const totalPages = Math.max(1, Math.ceil(verticalList.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = verticalList.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="min-h-[100dvh] bg-background pb-20 flex flex-col">
      {/* 1. Header: Sticky Search Bar + Filter Chips */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-4xl mx-auto px-4 py-3 space-y-3">
          <div className="flex items-center justify-between gap-2 mb-1">
            <Link
              href="/blog"
              className="inline-flex items-center text-foreground hover:text-primary transition-colors p-2 -ml-2 rounded-full"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="font-display text-lg font-bold capitalize line-clamp-1">{categoryName}</h1>
            <Link
              href="/berita/kategori"
              className="inline-flex items-center justify-center p-2 rounded-full hover:bg-muted/50 text-foreground transition-colors"
              title="Indeks Kategori"
            >
              <LayoutGrid className="w-5 h-5" />
            </Link>
          </div>
          
          <SmartSearchBar
            value={search}
            onChange={setSearch}
            sort={sort}
            onSortChange={setSort}
            placeholder={`Cari di ${categoryName}…`}
            resultCount={isFiltering ? filtered.length : undefined}
          />
          {otherCategories.length > 0 && (
            <div className="overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
              <CategoryChips
                categories={otherCategories}
                activeName={categoryName}
                showAll
                allLabel="SEMUA"
                className="flex-nowrap whitespace-nowrap"
              />
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full pt-6 pb-12">
        {isLoading ? (
          <div className="px-4 space-y-6">
            <div className="h-[250px] bg-muted/40 animate-pulse rounded-2xl" />
            <div className="flex gap-4 overflow-hidden">
              <div className="min-w-[240px] h-32 bg-muted/40 animate-pulse rounded-xl" />
              <div className="min-w-[240px] h-32 bg-muted/40 animate-pulse rounded-xl" />
            </div>
            <div className="space-y-4 pt-6">
              <div className="h-24 bg-muted/40 animate-pulse rounded-xl" />
              <div className="h-24 bg-muted/40 animate-pulse rounded-xl" />
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center px-4 text-muted-foreground border border-dashed border-border mx-4 rounded-xl">
            <p className="font-serif-body italic">Belum ada artikel di kategori ini.</p>
            <Link
              href="/berita/kategori"
              className="inline-flex items-center mt-4 text-sm font-bold uppercase tracking-widest text-primary"
            >
              Lihat semua kategori <ChevronRight className="w-3 h-3 ml-1" />
            </Link>
          </div>
        ) : (
          <>
            {/* 2. Dominasi Hero Card (Titik Awal) */}
            {!isFiltering && lead && (
              <section className="px-4 mb-8 group">
                <Link href={`/blog/${lead.slug || lead.id}`} className="block">
                  <ImageWithFallback
                    src={lead.featured_image || null}
                    alt={lead.title}
                    fallbackType="gradient"
                    fill
                    sizes="(max-width: 1024px) 100vw, 800px"
                    containerClassName="w-full aspect-video rounded-2xl overflow-hidden mb-4 bg-muted"
                    className="transition-transform duration-700 md:group-hover:scale-[1.03]"
                  />
                  <span className="inline-block text-[10px] uppercase tracking-[0.3em] font-bold text-primary mb-2">
                    {lead.category || categoryName}
                  </span>
                  <h2 className="font-display text-2xl md:text-4xl font-black text-foreground leading-tight tracking-tight">
                    {lead.title}
                  </h2>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-3 font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    <time>{formatDate(lead.published_at)}</time>
                  </div>
                </Link>
              </section>
            )}

            {/* 3. Horizontal Scroll List (Popular/Featured in Category) */}
            {!isFiltering && popular.length > 0 && (
              <section className="mb-10">
                <div className="px-4 flex items-center gap-3 text-sm font-bold text-foreground mb-4">
                  <Flame className="w-4 h-4 text-primary" /> Populer Kategori Ini
                </div>
                <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide px-4 gap-4 pb-4">
                  {popular.map((post) => (
                    <Link
                      key={post.id}
                      href={`/blog/${post.slug || post.id}`}
                      className="snap-start shrink-0 w-[75%] sm:w-64 flex flex-col group"
                    >
                      <ImageWithFallback
                        src={post.featured_image || null}
                        alt={post.title}
                        fallbackType="gradient"
                        fill
                        sizes="300px"
                        containerClassName="w-full aspect-[4/3] rounded-xl overflow-hidden mb-3"
                        className="transition-transform duration-500 md:group-hover:scale-105"
                      />
                      <h3 className="font-display text-base font-bold text-foreground leading-snug line-clamp-2 md:group-hover:text-primary transition-colors">
                        {post.title}
                      </h3>
                      <div className="flex items-center mt-auto pt-2 text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                        <TrendingUp className="w-3 h-3 mr-1" /> {(post.organic_views || 0) + (post.offset_views || 0)} views
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* 4. Vertical List View (Daftar Artikel Bawah) */}
            <section className="px-4">
              <div className="flex items-center gap-3 text-sm font-bold text-foreground mb-5">
                <Star className="w-4 h-4 text-primary" />
                {isFiltering ? 'Hasil Pencarian' : `Terbaru di ${categoryName}`}
              </div>

              {pageItems.length === 0 && isFiltering ? (
                <div className="py-16 text-center border border-dashed border-border rounded-xl">
                  <p className="font-serif-body italic text-muted-foreground">
                    Tidak ada artikel yang cocok. Reset filter atau ubah kata kunci.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  {pageItems.map((post) => (
                    <Link
                      key={post.id}
                      href={`/blog/${post.slug || post.id}`}
                      className="flex gap-4 group items-center"
                    >
                      <ImageWithFallback
                        src={post.featured_image || null}
                        alt={post.title}
                        fallbackType="gradient"
                        fill
                        sizes="100px"
                        containerClassName="w-24 h-24 sm:w-32 sm:h-32 shrink-0 rounded-xl overflow-hidden"
                        className="transition-transform duration-500 md:group-hover:scale-105"
                      />
                      <div className="flex-1 min-w-0 py-1">
                        <h3 className="font-display text-base sm:text-lg font-bold text-foreground leading-tight line-clamp-3 md:group-hover:text-primary transition-colors">
                          {post.title}
                        </h3>
                        <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-muted-foreground mt-2">
                          <Clock className="w-3 h-3" />
                          <time>{formatDate(post.published_at)}</time>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              <div className="mt-10">
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
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

export { slugifyCategory };
