/**
 * Tiny fuzzy subsequence matcher used by suggesters and the command palette.
 * Returns null when the query does not match, otherwise a score (higher = better).
 */
export function fuzzyScore(query: string, target: string): number | null {
  if (!query) return 0;
  const q = query.toLowerCase();
  const t = target.toLowerCase();

  if (t === q) return 1000;
  if (t.startsWith(q)) return 800 - t.length;

  let score = 0;
  let ti = 0;
  let streak = 0;

  for (let qi = 0; qi < q.length; qi++) {
    const found = t.indexOf(q[qi], ti);
    if (found === -1) return null;
    if (found === ti && qi > 0) {
      streak += 1;
      score += 10 + streak * 2;
    } else {
      streak = 0;
      score += 4;
      // Bonus for matching at a word boundary
      if (found === 0 || /[\s/_\-.]/.test(t[found - 1])) score += 8;
    }
    ti = found + 1;
  }

  return score - t.length * 0.1;
}

export function fuzzyFilter<T>(
  query: string,
  items: T[],
  getText: (item: T) => string,
  limit = 20
): Array<T & { score: number }> {
  const scored: Array<T & { score: number }> = [];
  for (const item of items) {
    const score = fuzzyScore(query, getText(item));
    if (score !== null) scored.push({ ...(item as object), score } as T & { score: number });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}
