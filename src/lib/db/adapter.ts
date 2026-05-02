// ============================================================================
// NewsRepository — the database-agnostic contract for the public News surface.
//
// Every concrete backend (Supabase, Firebase, Mock) implements this interface.
// UI / Server Components depend ONLY on this interface, never on a concrete
// adapter. To swap providers, change the factory in `./index.ts`; no UI code
// has to change.
// ============================================================================

import type {
  Article,
  ArticleListItem,
  CategoryInfo,
  ListArticlesParams,
  PaginatedArticles,
} from "./types";

export interface NewsRepository {
  /** Identifier for diagnostics / health checks. */
  readonly name: string;

  /** Cheap connectivity probe. Should never throw. */
  healthCheck(): Promise<{ ok: boolean; detail?: string }>;

  /** Paginated/filterable list. Defaults to status="published". */
  listArticles(params?: ListArticlesParams): Promise<PaginatedArticles>;

  /** Single article by slug, or null if not found / not published. */
  getArticleBySlug(slug: string): Promise<Article | null>;

  /** Top-N most-viewed published articles (raw view count, DESC). */
  getTrending(limit?: number): Promise<ArticleListItem[]>;

  /** Distinct categories with published-article counts. */
  getCategories(): Promise<CategoryInfo[]>;

  /** Related articles in the same category, excluding the given slug. */
  getRelated(slug: string, limit?: number): Promise<ArticleListItem[]>;

  /**
   * Increment view counter. Phase 4 wires the API route to this.
   * Adapters that can't persist this (e.g. Mock) may no-op silently.
   */
  incrementViews(slug: string): Promise<void>;
}
