// ============================================================================
// MockAdapter — in-memory NewsRepository for local dev, Storybook, and tests.
// Deterministic fixtures; safe to import from Server Components.
// ============================================================================

import type { NewsRepository } from "../adapter";
import type {
  Article,
  ArticleListItem,
  CategoryInfo,
  ListArticlesParams,
  PaginatedArticles,
} from "../types";

const now = () => new Date().toISOString();

const FIXTURES: Article[] = [
  {
    id: "1",
    title: "Pesantren Modern Membuka Era Digital Pendidikan Islam",
    slug: "pesantren-modern-era-digital",
    excerpt: "Transformasi digital di pesantren tidak menggantikan nilai tradisi, melainkan memperluas jangkauannya.",
    content: "<p>Konten artikel mock untuk demo UI.</p>",
    coverImage: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200",
    category: "Pesantren News",
    tags: ["digital", "pendidikan"],
    authorId: "mock-author-1",
    status: "published",
    views: 1820,
    publishedAt: now(),
    updatedAt: now(),
    createdAt: now(),
  },
  {
    id: "2",
    title: "Santri Raih Juara 1 Olimpiade Sains Tingkat Nasional",
    slug: "santri-juara-olimpiade-sains",
    excerpt: "Prestasi membanggakan dari santri yang membuktikan ilmu agama dan sains dapat berjalan beriringan.",
    content: "<p>Konten artikel mock untuk demo UI.</p>",
    coverImage: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1200",
    category: "Prestasi",
    tags: ["sains", "lomba"],
    authorId: "mock-author-2",
    status: "published",
    views: 940,
    publishedAt: now(),
    updatedAt: now(),
    createdAt: now(),
  },
  {
    id: "3",
    title: "Opini: Membangun Karakter Santri di Tengah Gelombang Informasi",
    slug: "opini-karakter-santri-informasi",
    excerpt: "Literasi digital adalah benteng pertama untuk menjaga akhlak di era media sosial.",
    content: "<p>Konten artikel mock untuk demo UI.</p>",
    coverImage: "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=1200",
    category: "Opini",
    tags: ["literasi"],
    authorId: "mock-author-3",
    status: "published",
    views: 612,
    publishedAt: now(),
    updatedAt: now(),
    createdAt: now(),
  },
  {
    id: "4",
    title: "Program Beasiswa Tahfidz Dibuka untuk 200 Santri Berprestasi",
    slug: "beasiswa-tahfidz-2026",
    excerpt: "Pendaftaran terbuka hingga akhir bulan; seleksi mencakup hafalan, akademik, dan wawancara.",
    content: "<p>Konten artikel mock untuk demo UI.</p>",
    coverImage: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=1200",
    category: "Pesantren News",
    tags: ["beasiswa", "tahfidz"],
    authorId: "mock-author-1",
    status: "published",
    views: 2310,
    publishedAt: now(),
    updatedAt: now(),
    createdAt: now(),
  },
];

function toListItem(a: Article): ArticleListItem {
  return {
    id: a.id, title: a.title, slug: a.slug, excerpt: a.excerpt,
    coverImage: a.coverImage, category: a.category, tags: a.tags,
    views: a.views, publishedAt: a.publishedAt, createdAt: a.createdAt,
  };
}

export class MockAdapter implements NewsRepository {
  readonly name = "mock";
  private store: Article[] = [...FIXTURES];

  async healthCheck() { return { ok: true }; }

  async listArticles(params: ListArticlesParams = {}): Promise<PaginatedArticles> {
    const { category, tag, search, sort = "newest", limit = 12, offset = 0, status = "published" } = params;
    let rows = this.store.filter((a) => a.status === status);
    if (category) rows = rows.filter((a) => a.category === category);
    if (tag) rows = rows.filter((a) => a.tags.includes(tag));
    if (search) {
      const s = search.toLowerCase();
      rows = rows.filter((a) => a.title.toLowerCase().includes(s) || a.excerpt.toLowerCase().includes(s));
    }
    rows.sort((a, b) => {
      if (sort === "popular") return b.views - a.views;
      const da = new Date(a.publishedAt ?? a.createdAt).getTime();
      const db = new Date(b.publishedAt ?? b.createdAt).getTime();
      return sort === "oldest" ? da - db : db - da;
    });
    const total = rows.length;
    return { items: rows.slice(offset, offset + limit).map(toListItem), total, limit, offset };
  }

  async getArticleBySlug(slug: string) {
    return this.store.find((a) => a.slug === slug && a.status === "published") ?? null;
  }

  async getTrending(limit = 5) {
    return [...this.store]
      .filter((a) => a.status === "published")
      .sort((a, b) => b.views - a.views)
      .slice(0, limit)
      .map(toListItem);
  }

  async getCategories(): Promise<CategoryInfo[]> {
    const counts = new Map<string, number>();
    for (const a of this.store) {
      if (a.status !== "published") continue;
      counts.set(a.category, (counts.get(a.category) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([name, count]) => ({
      slug: name.toLowerCase().replace(/\s+/g, "-"),
      name,
      count,
    }));
  }

  async getRelated(slug: string, limit = 3) {
    const article = await this.getArticleBySlug(slug);
    if (!article) return [];
    return this.store
      .filter((a) => a.status === "published" && a.category === article.category && a.slug !== slug)
      .slice(0, limit)
      .map(toListItem);
  }

  async incrementViews(slug: string) {
    const a = this.store.find((x) => x.slug === slug);
    if (a) a.views += 1;
  }
}
