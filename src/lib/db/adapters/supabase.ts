// ============================================================================
// SupabaseAdapter — production NewsRepository backed by the `posts` table.
//
// Notes:
// - We treat `posts` as our news source (per Phase 1 decision).
// - `views` is an optional column. If the column doesn't exist yet, the
//   queries that select it will fail; we degrade gracefully to 0 and skip
//   the popular sort. Phase 4 adds the migration that introduces it.
// ============================================================================

import { supabase } from "@/integrations/supabase/client";
import type { NewsRepository } from "../adapter";
import type {
  Article,
  ArticleListItem,
  CategoryInfo,
  ListArticlesParams,
  PaginatedArticles,
} from "../types";
import { mapPostRowToArticle, mapPostRowToListItem } from "../mappers";

// `posts` isn't in the generated Database types yet. Cast through `any` at
// the boundary so the rest of the file stays type-safe against our domain.
const db = supabase as any;

export class SupabaseAdapter implements NewsRepository {
  readonly name = "supabase";

  async healthCheck() {
    try {
      const { error } = await db.from("posts").select("id", { head: true, count: "exact" }).limit(1);
      if (error) return { ok: false, detail: error.message };
      return { ok: true };
    } catch (e: any) {
      return { ok: false, detail: e?.message ?? String(e) };
    }
  }

  async listArticles(params: ListArticlesParams = {}): Promise<PaginatedArticles> {
    const {
      category,
      tag,
      search,
      sort = "newest",
      limit = 12,
      offset = 0,
      status = "published",
    } = params;

    let q = db.from("posts").select("*", { count: "exact" }).eq("status", status);

    if (category) q = q.eq("category", category);
    if (tag) q = q.contains("tags", [tag]);
    if (search) q = q.or(`title.ilike.%${search}%,excerpt.ilike.%${search}%`);

    if (sort === "popular") q = q.order("views", { ascending: false, nullsFirst: false });
    else if (sort === "oldest") q = q.order("published_at", { ascending: true, nullsFirst: false });
    else q = q.order("published_at", { ascending: false, nullsFirst: false });

    q = q.range(offset, offset + limit - 1);

    const { data, error, count } = await q;
    if (error) throw new Error(`SupabaseAdapter.listArticles: ${error.message}`);

    return {
      items: (data ?? []).map(mapPostRowToListItem),
      total: count ?? 0,
      limit,
      offset,
    };
  }

  async getArticleBySlug(slug: string): Promise<Article | null> {
    const { data, error } = await db
      .from("posts")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();
    if (error) throw new Error(`SupabaseAdapter.getArticleBySlug: ${error.message}`);
    return data ? mapPostRowToArticle(data) : null;
  }

  async getTrending(limit = 5): Promise<ArticleListItem[]> {
    const { data, error } = await db
      .from("posts")
      .select("*")
      .eq("status", "published")
      .order("views", { ascending: false, nullsFirst: false })
      .limit(limit);
    if (error) {
      // Likely cause: `views` column not yet present. Degrade to newest.
      const fallback = await this.listArticles({ sort: "newest", limit });
      return fallback.items;
    }
    return (data ?? []).map(mapPostRowToListItem);
  }

  async getCategories(): Promise<CategoryInfo[]> {
    const { data, error } = await db
      .from("posts")
      .select("category")
      .eq("status", "published");
    if (error) throw new Error(`SupabaseAdapter.getCategories: ${error.message}`);
    const counts = new Map<string, number>();
    for (const row of data ?? []) {
      const name = (row.category ?? "Umum") as string;
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([name, count]) => ({
      slug: slugify(name),
      name,
      count,
    }));
  }

  async getRelated(slug: string, limit = 3): Promise<ArticleListItem[]> {
    const article = await this.getArticleBySlug(slug);
    if (!article) return [];
    const { data, error } = await db
      .from("posts")
      .select("*")
      .eq("status", "published")
      .eq("category", article.category)
      .neq("slug", slug)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(limit);
    if (error) throw new Error(`SupabaseAdapter.getRelated: ${error.message}`);
    return (data ?? []).map(mapPostRowToListItem);
  }

  async incrementViews(slug: string): Promise<void> {
    // Best-effort. If `views` column doesn't exist yet, this just no-ops.
    try {
      const { data, error: readErr } = await db
        .from("posts")
        .select("id, views")
        .eq("slug", slug)
        .maybeSingle();
      if (readErr || !data) return;
      const next = Number(data.views ?? 0) + 1;
      await db.from("posts").update({ views: next }).eq("id", data.id);
    } catch {
      /* swallow — Phase 4 introduces the column + an RPC for atomic inc */
    }
  }
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}
