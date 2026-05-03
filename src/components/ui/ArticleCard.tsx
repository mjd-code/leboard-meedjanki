'use client';

import React from 'react';
import Link from 'next/link';
import { Clock, TrendingUp } from 'lucide-react';
import type { Post } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ImageWithFallback } from './ImageWithFallback';

function formatDate(d?: string | null) {
  return d
    ? new Date(d).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })
    : '-';
}

/**
 * ArticleCard — compact editorial card used inside horizontal rails and grids.
 */
export function ArticleCard({
  post,
  showViews = false,
  className,
}: {
  post: Post;
  showViews?: boolean;
  className?: string;
}) {
  const views = (post as any).views as number | undefined;
  return (
    <Link
      href={`/blog/${post.slug || post.id}`}
      className={cn('group block h-full', className)}
    >
      <ImageWithFallback
        src={post.featured_image || null}
        alt={post.title}
        fallbackType="gradient"
        fill
        sizes="(max-width: 640px) 80vw, (max-width: 1024px) 40vw, 320px"
        containerClassName="w-full aspect-[4/3] rounded-sm mb-3"
        className="transition-transform duration-700 group-hover:scale-[1.04]"
      />
      {post.category && (
        <span className="inline-block text-[10px] uppercase tracking-[0.3em] font-bold text-primary mb-2">
          {post.category}
        </span>
      )}
      <h3 className="font-display text-lg sm:text-xl font-bold text-foreground leading-tight group-hover:text-primary transition-colors line-clamp-3">
        {post.title}
      </h3>
      {post.excerpt && (
        <p className="font-serif-body text-sm text-foreground/70 mt-2 leading-relaxed line-clamp-2">
          {post.excerpt}
        </p>
      )}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
        <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">
          <Clock className="w-3 h-3" /> {formatDate(post.published_at)}
        </span>
        {showViews && (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <TrendingUp className="w-3 h-3" /> {views ?? 0}
          </span>
        )}
      </div>
    </Link>
  );
}
