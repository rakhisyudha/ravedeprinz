// Slug helpers.
//
// Single source of truth for note-slug shape across the codebase:
// admin client, seed, and the createNote service all call the same
// `slugify` function so slugs are deterministic regardless of who
// generates them.
//
// `slugify` follows the project's existing convention established by
// Backend/src/seed.ts and AdminNotes.svelte before this migration:
//   - lowercase
//   - non-[a-z0-9] runs collapse to a single dash
//   - leading/trailing dashes trimmed
//
// Unicode is left intact on letters and digits that already fall in
// [a-z0-9] after lowercasing. We deliberately do NOT transliterate
// non-ASCII (the existing convention doesn't) so that slugifying
// "Indonesian text" yields the same predictable ASCII form as the
// prior code path — collision handling only sees `-what-now`,
// `-what-now-2`, etc., not unpredictable unicode folds.

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Returns a slug that does not collide with any entry returned by
// `exists`. The base slug is tried first, then `-2`, `-3`, ... as
// long as `exists` keeps saying yes. The existence check is callback-
// based so the caller decides whether to query by slug, by some
// derived path, or to keep an in-memory set during seeding.
//
// This is the canonical implementation referenced by both createNote
// in the admin service and the canonical-seed path going forward.
export async function ensureUniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean> | boolean,
): Promise<string> {
  // Empty title or all-punctuation title → empty slug. Fall back to a
  // generic prefix so we always satisfy the NOT NULL unique constraint
  // and so a note never accidentally inherits a slug like "-".
  const seed = base || 'note';
  if (!(await exists(seed))) return seed;
  for (let i = 2; i < 1000; i++) {
    const candidate = `${seed}-${i}`;
    if (!(await exists(candidate))) return candidate;
  }
  // Vanishingly unlikely — only reachable if a previous bug seeded
  // thousands of `note-2`/`note-3`/... rows. Throw so the failure is
  // visible to the admin instead of silently truncating.
  throw new Error(`Unable to allocate unique slug for "${seed}"`);
}
