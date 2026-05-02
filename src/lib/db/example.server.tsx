// ============================================================================
// REFERENCE Server Component — demonstrates how the rest of the app will
// fetch news through the adapter. Not yet routed; Phase 3 will replace
// `app/blog/page.tsx` (or add `app/beranda/page.tsx`) using this pattern.
//
// Key points:
//  - `import { getNewsRepo } from "@/lib/db"` — UI never names a concrete
//    adapter. Switch backends via NEXT_PUBLIC_DB_PROVIDER.
//  - `export const revalidate = 60` — Next.js ISR. Page is statically
//    generated, then refreshed at most once per minute. Phase 1 baseline;
//    tune per-route in Phase 3.
//  - All data fetching happens server-side. Zero client JS for the shell.
// ============================================================================

import { getNewsRepo } from "@/lib/db";

export const revalidate = 60;

export default async function NewsServerExample() {
  const repo = getNewsRepo();

  // Parallel fetch — RSC can await multiple repo calls without waterfalls.
  const [latest, trending, categories] = await Promise.all([
    repo.listArticles({ sort: "newest", limit: 6 }),
    repo.getTrending(5),
    repo.getCategories(),
  ]);

  return (
    <main className="container mx-auto py-8">
      <section>
        <h1 className="text-2xl font-bold mb-4">Latest ({latest.total})</h1>
        <ul className="grid gap-4 md:grid-cols-3">
          {latest.items.map((a) => (
            <li key={a.id} className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">{a.category}</p>
              <h2 className="font-semibold">{a.title}</h2>
              <p className="text-sm text-muted-foreground line-clamp-2">{a.excerpt}</p>
            </li>
          ))}
        </ul>
      </section>

      <aside className="mt-8">
        <h2 className="text-lg font-bold mb-2">Terpopuler</h2>
        <ol className="list-decimal pl-6 space-y-1">
          {trending.map((a) => (
            <li key={a.id}>{a.title} <span className="text-muted-foreground text-xs">({a.views})</span></li>
          ))}
        </ol>

        <h3 className="mt-6 font-semibold">Kategori</h3>
        <ul className="text-sm">
          {categories.map((c) => (
            <li key={c.slug}>{c.name} ({c.count})</li>
          ))}
        </ul>
      </aside>
    </main>
  );
}
