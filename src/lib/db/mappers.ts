// Shared row → domain mappers. Adapters call these so that field-naming
// conventions (snake_case in SQL, camelCase in domain) live in one place.

import type { Article, ArticleListItem } from "./types";

export function mapPostRowToArticle(r: any): Article {
  return {
    id: String(r.id),
    title: r.title ?? "",
    slug: r.slug ?? String(r.id),
    excerpt: r.excerpt ?? "",
    content: r.content ?? "",
    coverImage: r.featured_image ?? r.coverImage ?? "",
    category: r.category ?? "Umum",
    tags: Array.isArray(r.tags) ? r.tags : [],
    authorId: r.author_id ?? r.authorId ?? "",
    status: (r.status === "published" ? "published" : "draft"),
    views: Number(r.views ?? 0),
    publishedAt: r.published_at ?? r.publishedAt ?? null,
    updatedAt: r.updated_at ?? r.updatedAt ?? new Date(0).toISOString(),
    createdAt: r.created_at ?? r.createdAt ?? new Date(0).toISOString(),
    metaTitle: r.meta_title ?? undefined,
    metaDescription: r.meta_description ?? undefined,
  };
}

export function mapPostRowToListItem(r: any): ArticleListItem {
  const a = mapPostRowToArticle(r);
  return {
    id: a.id,
    title: a.title,
    slug: a.slug,
    excerpt: a.excerpt,
    coverImage: a.coverImage,
    category: a.category,
    tags: a.tags,
    views: a.views,
    publishedAt: a.publishedAt,
    createdAt: a.createdAt,
  };
}
