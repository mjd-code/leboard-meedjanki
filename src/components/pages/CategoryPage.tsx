'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ChevronRight, Clock } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import type { Post } from '@/lib/types';
import { matchesCategorySlug, slugifyCategory } from '@/lib/categorySlug';
import { CategoryChips } from '@/components/ui/CategoryChips';
import { ArticleCard } from '@/components/ui/ArticleCard';
import { SmartSearchBar, type SortKey } from '@/components/ui/SmartSearchBar';
import { SimplePagination } from '@/components/ui/SimplePagination';

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

export function CategoryPage({ slug }: { slug: string }) {
  const { data: posts = [], isLoading } = useQuery<Post[]>({
    queryKey: ['public-posts'],
    queryFn: async () => {
      const res = await apiFetch('/api/posts');
      if (!res.ok) throw new Error('Failed to fetch posts');
      const all: Post[] = await res.json();
      return all.filter((p) => p.status === 'published');
    },
  });

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
  const lead = !isFiltering ? filtered[0] : undefined;
  const gridStart = lead ? 1 : 0;
  const gridList = filtered.slice(gridStart);

  const totalPages = Math.max(1, Math.ceil(gridList.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = gridList.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 pt-8 md:pt-12">
        <nav className="mb-6 flex items-center gap-3 text-sm uppercase tracking-widest font-semibold text-muted-foreground">
          <Link href="/blog" className="inline-flex items-center hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" /> PPMH Insight
          </Link>
          <span className="text-foreground/30">/</span>
          <Link href="/berita/kategori" className="hover:text-foreground transition-colors">
            Kategori
          </Link>
        </nav>

        <header className="text-center border-y-4 border-double border-foreground py-8 md:py-10 mb-6">
          <p className="text-[11px] uppercase tracking-[0.4em] text-muted-foreground mb-3">
            Kategori · {todayLabel()}
          </p>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-black text-foreground leading-none tracking-tight capitalize">
            {categoryName}
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-4 italic font-serif-body">
            {inCategory.length} artikel terbit dalam kategori ini.
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
            placeholder={`Cari di ${categoryName}…`}
            resultCount={isFiltering ? filtered.length : undefined}
          />
          {/* Chip bar acts as quick navigation between categories */}
          {otherCategories.length > 0 && (
            <CategoryChips
              categories={otherCategories}
              activeName={categoryName}
              showAll
              allLabel="Indeks"
            />
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 pt-10">
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 h-[420px] bg-muted/40 rounded-sm" />
            <div className="space-y-6">
              <div className="h-48 bg-muted/40 rounded-sm" />
              <div className="h-48 bg-muted/40 rounded-sm" />
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground border border-dashed border-border">
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
            {/* Lead story (only when not filtering) */}
            {lead && (
              <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10 pb-12 mb-12 border-b border-border">
                <article className="lg:col-span-2 group">
                  <Link href={`/blog/${lead.slug || lead.id}`} className="block">
                    {lead.featured_image ? (
                      <div className="relative w-full aspect-[16/10] overflow-hidden mb-6 bg-muted">
                        <Image
                          src={lead.featured_image}
                          alt={lead.title}
                          fill
                          referrerPolicy="no-referrer"
                          className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                        />
                      </div>
                    ) : (
                      <div className="w-full aspect-[16/10] bg-foreground/[0.03] flex items-center justify-center mb-6">
                        <span className="font-display text-foreground/10 text-7xl font-black">PPMH</span>
                      </div>
                    )}
                    <span className="inline-block text-[10px] uppercase tracking-[0.3em] font-bold text-primary mb-3">
                      {lead.category}
                    </span>
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

                <aside className="lg:col-span-1 lg:border-l lg:border-border lg:pl-8 space-y-8 divide-y divide-border">
                  {filtered.slice(1, 4).map((post, idx) => (
                    <article key={post.id} className={`group ${idx > 0 ? 'pt-8' : ''}`}>
                      <Link href={`/blog/${post.slug || post.id}`} className="block">
                        {post.featured_image && (
                          <div className="relative w-full aspect-[16/9] overflow-hidden mb-4 bg-muted">
                            <Image
                              src={post.featured_image}
                              alt={post.title}
                              fill
                              referrerPolicy="no-referrer"
                              className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                            />
                          </div>
                        )}
                        <h3 className="font-display text-xl font-bold text-foreground leading-tight group-hover:text-primary transition-colors">
                          {post.title}
                        </h3>
                      </Link>
                    </article>
                  ))}
                </aside>
              </section>
            )}

            <section>
              <div className="flex items-center gap-4 text-xs uppercase tracking-[0.25em] font-bold text-muted-foreground mb-8">
                <span className="text-foreground">
                  {isFiltering ? 'Hasil' : `Lebih Banyak di ${categoryName}`}
                </span>
                <span className="flex-1 editorial-rule" />
                <span>{gridList.length} artikel</span>
              </div>

              {pageItems.length === 0 ? (
                <div className="py-16 text-center border border-dashed border-border">
                  <p className="font-serif-body italic text-muted-foreground">
                    Tidak ada artikel yang cocok. Reset filter atau ubah kata kunci.
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

// Re-export to avoid unused import warnings if not consumed elsewhere.
export { slugifyCategory };
