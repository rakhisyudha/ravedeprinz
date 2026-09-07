import type { APIRoute } from 'astro';
import { fetchNotes } from '../lib/cms';
import { getSiteUrl } from '../lib/seo';

export const prerender = false;

function safeDate(value?: string | null): string {
  const parsed = value ? new Date(value) : new Date();
  const safe = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  return safe.toISOString();
}

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export const GET: APIRoute = async () => {
  const site = getSiteUrl();
  const pages = ['', '/about', '/work', '/projects', '/notes', '/now'];
  const urls = pages.map(
    (path) => `  <url><loc>${escapeXml(`${site}${path || '/'}`)}</loc><lastmod>${safeDate()}</lastmod></url>`,
  );

  try {
    const content = await fetchNotes();
    for (const note of content?.notes ?? []) {
      const key = note.slug?.trim() || note.id;
      if (!key) continue;
      urls.push(
        `  <url><loc>${escapeXml(`${site}/notes/${key}`)}</loc><lastmod>${safeDate(note.published_at)}</lastmod></url>`,
      );
    }
  } catch {
    // CMS unreachable: still serve the static routes.
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
};
