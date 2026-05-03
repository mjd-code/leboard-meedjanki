'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import type { Post } from '../../lib/types';
import Link from 'next/link';
import { ArrowLeft, CalendarDays, Clock, User, ArrowRight, Eye } from 'lucide-react';
import { HScroller, HScrollItem } from '@/components/ui/HScroller';
import { ArticleCard } from '@/components/ui/ArticleCard';
import { BlogContent } from '@/components/blog/BlogContent';
import { ImageWithFallback } from '@/components/ui/ImageWithFallback';

function formatDate(d?: string | null) {
  return d ? new Date(d).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) : '-';
}

function readingTime(html?: string) {
  if (!html) return '1 mnt';
  const text = html.replace(/<[^>]+>/g, ' ');
  const words = text.trim().split(/\s+/).length;
  return `${Math.max(1, Math.round(words / 200))} mnt baca`;
}

export function BlogPostPage({ slug }: { slug: string }) {
  const { data: allPosts = [] } = useQuery<Post[]>({
    queryKey: ['public-posts'],
    queryFn: async () => {
      const res = await apiFetch('/api/posts');
      if (!res.ok) throw new Error('Failed to fetch posts');
      const all: Post[] = await res.json();
      return all.filter((p) => p.status === 'published');
    },
  });

  const { data: post, isLoading } = useQuery<Post>({
    queryKey: ['public-post', slug],
    queryFn: async () => {
      const res = await apiFetch('/api/posts');
      if (!res.ok) throw new Error('Failed to fetch posts');
      const all: Post[] = await res.json();
      const match = all.find(p => p.slug === slug || p.id === slug);
      if (!match || match.status !== 'published') throw new Error('Post not found');
      return match;
    }
  });

  // Reading progress (sticky bar at top)
  const [progress, setProgress] = React.useState(0);
  
  // Track article read
  React.useEffect(() => {
    if (post && post.id) {
      const KEY = `ppmh_read_${post.id}`;
      // only count once per session
      if (!sessionStorage.getItem(KEY)) {
        sessionStorage.setItem(KEY, '1');
        apiFetch('/api/track-article', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postId: post.id })
        }).catch(console.error);
      }
    }
  }, [post?.id]);

  React.useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const scrolled = h.scrollTop;
      const max = h.scrollHeight - h.clientHeight;
      setProgress(max > 0 ? Math.min(100, Math.max(0, (scrolled / max) * 100)) : 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  // Related posts (same category, exclude current). Fallback to most recent.
  const related = React.useMemo(() => {
    if (!post) return [];
    const others = allPosts.filter((p) => p.id !== post.id);
    const sameCat = others.filter((p) => (p.category || '') === (post.category || ''));
    const pool = sameCat.length >= 3 ? sameCat : [...sameCat, ...others.filter((p) => !sameCat.includes(p))];
    return pool
      .sort((a, b) => (b.published_at || '').localeCompare(a.published_at || ''))
      .slice(0, 3);
  }, [post, allPosts]);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Reading progress bar */}
      <div
        role="progressbar"
        aria-label="Progres baca"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="fixed top-0 left-0 right-0 h-1 z-[60] bg-transparent pointer-events-none"
      >
        <div
          className="h-full bg-primary transition-[width] duration-150 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {post && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "NewsArticle",
              "headline": post.title,
              "image": post.featured_image ? [post.featured_image] : [],
              "datePublished": post.published_at,
              "dateModified": post.updated_at,
              "description": post.excerpt || post.title,
              "publisher": { "@type": "Organization", "name": "PPMH Insight" }
            })
          }}
        />
      )}

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 md:pt-12">
        <nav className="mb-8">
          <Link href="/blog" className="inline-flex items-center text-foreground/70 font-semibold hover:text-foreground transition-colors text-sm uppercase tracking-widest">
            <ArrowLeft className="w-4 h-4 mr-2" /> PPMH Insight
          </Link>
        </nav>

        {isLoading ? (
          <div className="space-y-6 animate-pulse">
            <div className="h-3 bg-muted/60 w-32" />
            <div className="h-12 bg-muted/60 w-full" />
            <div className="h-12 bg-muted/60 w-3/4" />
            <div className="h-4 bg-muted/60 w-1/3 mt-6" />
          </div>
        ) : !post ? (
          <div className="text-center py-24 border border-dashed border-border">
            <h2 className="font-display text-3xl font-bold mb-2">Artikel tidak ditemukan</h2>
            <p className="text-muted-foreground font-serif-body italic">Mungkin artikel telah dipindahkan atau dihapus.</p>
          </div>
        ) : (
          <article>
            {/* Category eyebrow */}
            {post.category && (
              <div className="text-center mb-5">
                <span className="inline-block text-[11px] uppercase tracking-[0.4em] font-bold text-primary border-y border-primary py-1.5 px-4">
                  {post.category}
                </span>
              </div>
            )}

            {/* Headline */}
            <header className="text-center max-w-3xl mx-auto mb-6">
              <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-black text-foreground leading-[1.05] tracking-tight">
                {post.title}
              </h1>
              {post.excerpt && (
                <p className="font-serif-body italic text-lg md:text-xl text-foreground/70 mt-5 leading-relaxed">
                  {post.excerpt}
                </p>
              )}
            </header>

            {/* Byline */}
            <div className="flex items-center justify-center gap-6 text-xs uppercase tracking-widest text-muted-foreground font-semibold border-y border-border py-4 mb-10">
              {(post.author_id || (post as any).author) && (
                <>
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5" />
                    <span>{(post as any).author || post.author_id}</span>
                  </div>
                  <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                </>
              )}
              <div className="flex items-center gap-2">
                <CalendarDays className="w-3.5 h-3.5" />
                <time dateTime={post.published_at || ''}>{formatDate(post.published_at)}</time>
              </div>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" />
                <span>{readingTime(post.content)}</span>
              </div>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
              <div className="flex items-center gap-2" title="Total Views">
                <Eye className="w-3.5 h-3.5" />
                <span>{(post.organic_views || 0) + (post.offset_views || 0)}</span>
              </div>
            </div>

            {/* Featured image */}
            {post.featured_image && (
              <figure className="mb-12 -mx-4 sm:mx-0">
                <ImageWithFallback 
                  src={post.featured_image || null} 
                  alt={post.title} 
                  fallbackType="gradient"
                  fill 
                  priority
                  containerClassName="w-full aspect-[16/9]"
                />
                <figcaption className="text-xs text-muted-foreground italic font-serif-body text-center mt-3 px-4">
                  {post.title}
                </figcaption>
              </figure>
            )}

            {/* Body — drop cap, serif body */}
            <BlogContent
              html={post.content}
              className="dropcap font-serif-body text-foreground/90 prose prose-lg max-w-none
                         prose-headings:font-display prose-headings:font-bold prose-headings:text-foreground
                         prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-4
                         prose-h3:text-2xl
                         prose-p:leading-[1.85] prose-p:text-[1.075rem]
                         prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                         prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:font-display prose-blockquote:italic prose-blockquote:text-2xl prose-blockquote:text-foreground
                         prose-img:rounded-none prose-img:mx-auto"
            />

            {/* End mark */}
            <div className="text-center mt-16 mb-8">
              <span className="inline-block w-2 h-2 bg-foreground rotate-45" />
            </div>

            <div className="text-center">
              <Link href="/blog" className="inline-flex items-center text-foreground font-semibold uppercase tracking-widest text-xs border-b border-foreground pb-1 hover:text-primary hover:border-primary transition-colors">
                Kembali ke PPMH Insight
              </Link>
            </div>

            {/* Related Posts */}
            {related.length > 0 && (
              <aside className="mt-20 pt-10 border-t border-border" aria-label="Saran postingan lain">
                <div className="flex items-end justify-between gap-4 mb-6">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.4em] text-muted-foreground mb-2">
                      Lanjutkan Membaca
                    </p>
                    <h2 className="font-display text-2xl md:text-3xl font-black text-foreground">
                      Saran Postingan Lain
                    </h2>
                  </div>
                  <Link href="/blog" className="hidden sm:inline-flex items-center text-foreground font-bold uppercase tracking-widest text-xs border-b border-foreground hover:text-primary hover:border-primary pb-1">
                    Semua Artikel <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Link>
                </div>

                <HScroller ariaLabel="Saran postingan lain">
                  {related.map((rp) => (
                    <HScrollItem key={rp.id}>
                      <ArticleCard post={rp} />
                    </HScrollItem>
                  ))}
                </HScroller>
              </aside>
            )}
          </article>
        )}
      </div>
    </div>
  );
}
