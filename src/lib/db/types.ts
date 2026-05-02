// ============================================================================
// Database-agnostic domain types for the public News surface.
//
// These types are what UI components (Server & Client) consume. Adapters are
// responsible for mapping their backend-specific row shapes into these types.
// Never import Supabase/Firebase types into UI code — only these.
// ============================================================================

export type ArticleStatus = "draft" | "published";

export interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string;
  category: string;
  tags: string[];
  authorId: string;
  status: ArticleStatus;
  views: number;
  publishedAt: string | null;
  updatedAt: string;
  createdAt: string;
  metaTitle?: string;
  metaDescription?: string;
}

export interface ArticleListItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string;
  category: string;
  tags: string[];
  views: number;
  publishedAt: string | null;
  createdAt: string;
}

export interface CategoryInfo {
  slug: string;
  name: string;
  count: number;
}

export type ArticleSort = "newest" | "oldest" | "popular";

export interface ListArticlesParams {
  category?: string;
  tag?: string;
  search?: string;
  sort?: ArticleSort;
  limit?: number;
  offset?: number;
  status?: ArticleStatus; // defaults to "published" in adapters
}

export interface PaginatedArticles {
  items: ArticleListItem[];
  total: number;
  limit: number;
  offset: number;
}
