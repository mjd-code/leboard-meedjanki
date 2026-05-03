// ============================================================================
// FirebaseAdapter — STUBBED implementation of NewsRepository.
//
// Wiring is intentionally deferred: the project doesn't ship a Firebase SDK
// initialisation here. To activate, install `firebase`, init an app in
// `src/lib/firebaseClient.ts`, then replace the stub bodies below with real
// Firestore queries. The interface contract guarantees swap-in compatibility.
// ============================================================================

import type { NewsRepository } from "../adapter";
import type {
  Article,
  ArticleListItem,
  CategoryInfo,
  ListArticlesParams,
  PaginatedArticles,
} from "../types";

const NOT_IMPLEMENTED = "FirebaseAdapter is scaffolded but not yet wired. " +
  "Set NEXT_PUBLIC_DB_PROVIDER to 'firebase' or 'mock', or implement this adapter.";

export class FirebaseAdapter implements NewsRepository {
  readonly name = "firebase";

  async healthCheck() {
    return { ok: false, detail: NOT_IMPLEMENTED };
  }

  async listArticles(_params?: ListArticlesParams): Promise<PaginatedArticles> {
    throw new Error(NOT_IMPLEMENTED);
  }

  async getArticleBySlug(_slug: string): Promise<Article | null> {
    throw new Error(NOT_IMPLEMENTED);
  }

  async getTrending(_limit?: number): Promise<ArticleListItem[]> {
    throw new Error(NOT_IMPLEMENTED);
  }

  async getCategories(): Promise<CategoryInfo[]> {
    throw new Error(NOT_IMPLEMENTED);
  }

  async getRelated(_slug: string, _limit?: number): Promise<ArticleListItem[]> {
    throw new Error(NOT_IMPLEMENTED);
  }

  async incrementViews(_slug: string): Promise<void> {
    /* no-op until wired */
  }
}
