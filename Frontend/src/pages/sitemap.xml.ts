import type { APIRoute } from 'astro';
import { fetchNotes } from '../lib/cms';
import { getSiteUrl } from '../lib/seo';
import { buildSitemapXml } from '../lib/sitemap';

export const prerender = false;

// Only the notes fetch is needed now that there are no per-project pages. It
// may fail, and the builder still emits every static route either way.
export const GET: APIRoute = async () => {
  const notes = await fetchNotes();
  const xml = buildSitemapXml({
    site: getSiteUrl(),
    now: new Date(),
    notes: notes?.notes ?? null,
  });
  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
};
