'use client';

import React from 'react';
import { BlogPostsAPI } from '@/hooks/queries';
import { trackArticleView } from '@/lib/firebase/tracking';
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
  const { data: rawPosts = [] } = BlogPostsAPI.useList();
  const allPosts = React.useMemo(
    () => (rawPosts as Post[]).filter((p) => p.status === 'published'),
    [rawPosts],
  );
  const post = React.useMemo(
    () => allPosts.find((p) => p.slug === slug || p.id === slug),
    [allPosts, slug],
  );
  const isLoading = !rawPosts.length;

  // Reading progress (sticky bar at top)
  const [progress, setProgress] = React.useState(0);
  
  // Track article read
  React.useEffect(() => {
    if (post && post.id) {
      const KEY = `ppmh_read_${post.id}`;
      // only count once per session
      if (!sessionStorage.getItem(KEY)) {
        sessionStorage.setItem(KEY, '1');
        trackArticleView(post.id);
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

  // Related posts (strict same category, exclude current, sort by popularity)
  const related = React.useMemo(() => {
    if (!post) return [];
    const others = allPosts.filter((p) => p.id !== post.id);
    const sameCat = others.filter((p) => (p.category || '') === (post.category || ''));
    return sameCat
      .sort((a, b) => ((b.organic_views || 0) + (b.offset_views || 0)) - ((a.organic_views || 0) + (a.offset_views || 0)))
      .slice(0, 5);
  }, [post, allPosts]);

  return (
    <div className="min-h-[100dvh] bg-background pb-20 flex flex-col">
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

      {/* Main Header Area */}
      <header className="pt-6 sm:pt-10 px-4 max-w-4xl mx-auto w-full">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors mb-8 pb-1 border-b border-transparent hover:border-foreground"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Kembali
        </Link>

        {isLoading ? (
          <div className="space-y-6 animate-pulse mt-4">
            <div className="h-4 bg-muted/60 w-32 rounded-full" />
            <div className="h-10 sm:h-14 bg-muted/60 w-full rounded-lg" />
            <div className="h-10 sm:h-14 bg-muted/60 w-3/4 rounded-lg" />
            <div className="flex gap-4 mt-8">
              <div className="h-8 bg-muted/60 w-20 rounded-full" />
              <div className="h-8 bg-muted/60 w-24 rounded-full" />
            </div>
            <div className="h-[300px] bg-muted/60 w-full mt-8 rounded-2xl" />
          </div>
        ) : !post ? (
          <div className="text-center py-24 border border-dashed border-border rounded-2xl mt-4">
            <h2 className="font-display text-2xl sm:text-3xl font-bold mb-2">Artikel tidak ditemukan</h2>
            <p className="text-muted-foreground font-serif-body italic text-sm sm:text-base">Mungkin artikel telah dipindahkan atau dihapus.</p>
          </div>
        ) : (
          <article className="mt-2">
            {/* Meta Tags / Category */}
            <div className="flex flex-wrap items-center gap-3 md:gap-4 mb-6">
              {post.category && (
                <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-widest">
                  {post.category}
                </span>
              )}
              <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground font-medium">
                <CalendarDays className="w-3.5 h-3.5" />
                <time dateTime={post.published_at || ''}>{formatDate(post.published_at)}</time>
              </div>
              <span className="text-muted-foreground/30 text-[10px] sm:text-xs hidden sm:inline">•</span>
              <div className="flex gap-4 sm:gap-4 ml-auto sm:ml-0">
                <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{readingTime(post.content)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground font-medium" title="Total Views">
                  <Eye className="w-3.5 h-3.5" />
                  <span>{(post.organic_views || 0) + (post.offset_views || 0)} views</span>
                </div>
              </div>
            </div>

            {/* Title & Excerpt */}
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-foreground leading-[1.1] tracking-tight text-pretty">
              {post.title}
            </h1>
            {post.excerpt && (
              <p className="font-serif-body italic text-base sm:text-lg md:text-xl text-muted-foreground mt-6 leading-relaxed">
                {post.excerpt}
              </p>
            )}

            {/* Author */}
            {(post.author_id || (post as any).author) && (
              <div className="flex items-center gap-3 mt-8 pb-8 border-b border-border/40">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold leading-none mb-1">Penulis</div>
                  <div className="text-sm font-semibold text-foreground">{(post as any).author || post.author_id}</div>
                </div>
              </div>
            )}

            {/* Featured Image */}
            {post.featured_image && (
              <figure className="my-8 sm:my-12 -mx-4 sm:mx-0">
                <ImageWithFallback 
                  src={post.featured_image || null} 
                  alt={post.title} 
                  fallbackType="gradient"
                  fill 
                  priority
                  sizes="(max-width: 1024px) 100vw, 800px"
                  containerClassName="w-full aspect-[4/3] sm:aspect-[16/9] sm:rounded-3xl shadow-sm"
                />
              </figure>
            )}

            {/* Content Body */}
            <div className="px-0 sm:px-4 md:px-8 max-w-[800px] mx-auto">
              <BlogContent
                html={post.content}
                className="dropcap font-serif-body text-foreground/90 prose prose-base sm:prose-lg max-w-none
                           prose-headings:font-display prose-headings:font-bold prose-headings:text-foreground
                           prose-p:leading-[1.8] prose-p:text-[1.05rem] sm:prose-p:text-[1.125rem]
                           prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                           prose-img:rounded-2xl prose-img:mx-auto prose-img:w-full prose-img:shadow-sm
                           [&_p]:my-6
                           [&_h1]:text-3xl sm:[&_h1]:text-4xl [&_h1]:mt-14 [&_h1]:mb-6 [&_h1]:font-black
                           [&_h2]:text-2xl sm:[&_h2]:text-3xl [&_h2]:mt-12 [&_h2]:mb-5 [&_h2]:font-bold
                           [&_h3]:text-xl sm:[&_h3]:text-2xl [&_h3]:mt-10 [&_h3]:mb-4
                           [&_h4]:text-lg sm:[&_h4]:text-xl [&_h4]:mt-8 [&_h4]:mb-3
                           [&_ul]:list-disc [&_ul]:pl-5 sm:[&_ul]:pl-6 [&_ul]:my-6 [&_ul_li]:my-2
                           [&_ol]:list-decimal [&_ol]:pl-5 sm:[&_ol]:pl-6 [&_ol]:my-6 [&_ol_li]:my-2
                           [&_blockquote]:my-8 [&_blockquote]:border-l-4 [&_blockquote]:border-primary/60 [&_blockquote]:bg-primary/5 [&_blockquote]:py-3 [&_blockquote]:pr-4 [&_blockquote]:pl-5 sm:[&_blockquote]:pl-6 [&_blockquote]:italic [&_blockquote]:rounded-r-xl
                           [&_pre]:my-8 [&_pre]:bg-[#18181b] [&_pre]:text-gray-100 [&_pre]:p-5 sm:[&_pre]:p-6 [&_pre]:rounded-2xl [&_pre]:overflow-x-auto [&_pre]:text-sm sm:[&_pre]:text-base
                           [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded text-foreground [&_code]:font-mono [&_code]:text-[0.9em]
                           [&_hr]:my-12 [&_hr]:border-border/60"
              />
            </div>

            {/* End mark */}
            <div className="text-center mt-16 mb-10">
              <span className="inline-block w-2 h-2 bg-primary rotate-45 rounded-sm" />
            </div>

            {/* Suggestions / Related Posts */}
            {related.length > 0 && (
              <aside className="mt-16 sm:mt-24 pt-12 border-t border-border/40" aria-label="Saran postingan lain">
                <div className="flex items-center justify-between gap-4 mb-8">
                  <div className="flex items-center gap-2 text-sm font-bold text-foreground uppercase tracking-widest">
                    <ArrowRight className="w-4 h-4 text-primary" /> Lanjutkan Membaca
                  </div>
                  <Link href="/blog" className="text-primary text-[10px] sm:text-xs font-bold uppercase tracking-widest hover:underline">
                    Semua Artikel
                  </Link>
                </div>

                <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 gap-5 pb-4">
                  {related.map((rp) => (
                    <Link
                      key={rp.id}
                      href={`/blog/${rp.slug || rp.id}`}
                      className="snap-start shrink-0 w-[240px] sm:w-[320px] flex flex-col group"
                    >
                      <ImageWithFallback
                        src={rp.featured_image || null}
                        alt={rp.title}
                        fallbackType="gradient"
                        fill
                        sizes="320px"
                        containerClassName="w-full aspect-[16/10] sm:aspect-video rounded-2xl overflow-hidden mb-4 shadow-sm"
                        className="transition-transform duration-500 md:group-hover:scale-105"
                      />
                      <div className="flex items-center gap-2 mb-2">
                        {rp.category && (
                          <span className="text-[10px] uppercase tracking-widest font-bold text-primary">
                            {rp.category}
                          </span>
                        )}
                        <span className="text-muted-foreground/30 text-[10px]">•</span>
                        <div className="flex items-center text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                          <Eye className="w-3 h-3 mr-1" /> {(rp.organic_views || 0) + (rp.offset_views || 0)} views
                        </div>
                      </div>
                      <h3 className="font-display text-base sm:text-lg font-bold text-foreground leading-snug line-clamp-2 md:line-clamp-3 group-hover:text-primary transition-colors text-pretty">
                        {rp.title}
                      </h3>
                      {rp.excerpt && (
                        <p className="mt-2 text-sm text-muted-foreground line-clamp-2 leading-relaxed hidden sm:block">
                          {rp.excerpt}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              </aside>
            )}
          </article>
        )}
      </header>
    </div>
  );
}
