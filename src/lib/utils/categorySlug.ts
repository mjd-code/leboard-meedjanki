// Lightweight slug helpers shared by the category routes.
export function slugifyCategory(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

export function matchesCategorySlug(name: string | undefined, slug: string): boolean {
  if (!name) return false;
  return slugifyCategory(name) === slug.toLowerCase();
}
