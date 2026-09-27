// Sitemap assembly. Pure so the entry set and the lastmod rule can be
// property-tested without HTTP or a CMS; pages/sitemap.xml.ts only supplies
// the inputs.

import type { Note } from './cms';

export function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * A parseable date, or the request time. Any value that is missing, blank, or
 * unparseable resolves to `now` — never to the wall clock, so the whole
 * document is stamped from one instant.
 */
export function safeDate(value: string | null | undefined, now: Date): string {
  // Total by construction: only a string can parse, so every other value —
  // including a number, an object, or a symbol straight off a malformed CMS
  // payload — falls back to the request time instead of throwing.
  if (typeof value === 'string' && value !== '') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return now.toISOString();
}

export const STATIC_ROUTES = ['', '/about', '/work', '/projects', '/notes', '/now'] as const;

export type SitemapInput = {
  site: string;
  now: Date;
  notes: Note[] | null;
};

/**
 * Static routes plus note detail pages.
 *
 * Per-project case-study URLs are deliberately absent: there is no
 * `/projects/{slug}` page, so listing them would advertise 404s to crawlers.
 * Add them back here together with the page that serves them.
 */
export function buildSitemapXml({ site, now, notes }: SitemapInput): string {
  const base = site.replace(/\/$/, '');
  const urls: string[] = STATIC_ROUTES.map(
    (path) => `  <url><loc>${escapeXml(`${base}${path || '/'}`)}</loc><lastmod>${safeDate(undefined, now)}</lastmod></url>`,
  );

  // Static routes are always emitted, so a failed fetch only costs its own
  // entries — never the whole document. Note slugs are deduplicated: two notes
  // resolving to the same slug must produce one <loc>, not two.
  const seen = new Set<string>();
  for (const note of notes ?? []) {
    const key = note.slug?.trim() || note.id;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    urls.push(
      `  <url><loc>${escapeXml(`${base}/notes/${key}`)}</loc><lastmod>${safeDate(note.published_at, now)}</lastmod></url>`,
    );
  }

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`;
}
