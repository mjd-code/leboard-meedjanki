# `src/lib/db/` — Database-Agnostic News Layer (Phase 1)

UI code **must not** import Supabase, Firebase, or any adapter directly.
It imports the repository interface and a factory:

```ts
import { getNewsRepo } from "@/lib/db";

const repo = getNewsRepo();
const { items } = await repo.listArticles({ sort: "newest", limit: 6 });
```

## Files

| File | Role |
|---|---|
| `types.ts` | Domain types (`Article`, `ArticleListItem`, `CategoryInfo`, …). UI consumes only these. |
| `adapter.ts` | The `NewsRepository` interface — the contract every backend must satisfy. |
| `mappers.ts` | Row → domain mapping helpers shared by adapters. |
| `adapters/supabase.ts` | **Default.** Backed by the existing `posts` table. |
| `adapters/firebase.ts` | Scaffolded stub — methods throw until wired. |
| `adapters/mock.ts` | In-memory fixtures for local dev / tests / Storybook. |
| `index.ts` | Factory (`getNewsRepo`) + re-exports. The only public entry point. |
| `example.server.tsx` | Reference Server Component (not routed). |

## Switching backends

Set in `.env.local`:

```
NEXT_PUBLIC_DB_PROVIDER=supabase   # default
# or
NEXT_PUBLIC_DB_PROVIDER=firebase
NEXT_PUBLIC_DB_PROVIDER=mock
```

The factory caches one instance per provider per process. No UI code changes.

## Adding a new adapter

1. Create `src/lib/db/adapters/<name>.ts` that `implements NewsRepository`.
2. Register it in `index.ts` inside the `switch`.
3. Done — every page that uses `getNewsRepo()` now supports it.

## Trending

Phase 1 uses **raw `views DESC`**. The Supabase adapter degrades gracefully
to `newest` if the `views` column doesn't exist yet — Phase 4 will add the
column and the `/api/track-view` writer.
