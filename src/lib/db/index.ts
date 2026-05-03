// ============================================================================
// Repository factory — single seam for switching backends.
//
// Selection order:
//   1. NEXT_PUBLIC_DB_PROVIDER env var ("firebase" | "mock")
//   2. Defaults to "firebase"
//
// Server Components & Route Handlers should call `getNewsRepo()` rather than
// importing a concrete adapter. This keeps UI code 100% backend-agnostic.
// ============================================================================

import type { NewsRepository } from "./adapter";
import { FirebaseAdapter } from "./adapters/firebase";
import { MockAdapter } from "./adapters/mock";

export type DbProvider = "firebase" | "mock";

let cached: NewsRepository | null = null;
let cachedProvider: DbProvider | null = null;

function resolveProvider(): DbProvider {
  const raw = (process.env.NEXT_PUBLIC_DB_PROVIDER ?? "firebase").toLowerCase();
  if (raw === "firebase" || raw === "mock") return raw as DbProvider;
  return "firebase";
}

export function getNewsRepo(override?: DbProvider): NewsRepository {
  const provider = override ?? resolveProvider();
  if (cached && cachedProvider === provider) return cached;
  switch (provider) {
    case "mock":     cached = new MockAdapter(); break;
    case "firebase":
    default:         cached = new FirebaseAdapter(); break;
  }
  cachedProvider = provider;
  return cached;
}

// Re-exports so callers only ever import from "@/lib/db".
export type { NewsRepository } from "./adapter";
export type {
  Article,
  ArticleListItem,
  ArticleSort,
  ArticleStatus,
  CategoryInfo,
  ListArticlesParams,
  PaginatedArticles,
} from "./types";
