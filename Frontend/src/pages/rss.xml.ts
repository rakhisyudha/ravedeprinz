import type { APIRoute } from 'astro';
import { fetchNotes } from '../lib/cms';
import { buildRssXml } from '../lib/rss';
import { getSiteUrl } from '../lib/seo';

export const prerender = false;

// RSS 2.0 feed of the published notes.
//
// Served as application/xml rather than application/rss+xml. Feed readers
// parse the body whatever the type, but browsers save an rss+xml response to
// disk, so clicking the feed link downloaded a file instead of showing it.
// Autodiscovery is unaffected: the <link type="application/rss+xml"> in the
// page head describes the link, not this response.
//
// When the CMS cannot be reached the answer is 503, not an empty feed and not
// the static fallback notes: a feed reader that receives a valid feed with no
// items may conclude the notes were deleted, whereas a 503 with Retry-After
// just makes it try again later and keep what it already has.
export const GET: APIRoute = async () => {
  const result = await fetchNotes();
  if (!result) {
    return new Response('The feed is temporarily unavailable.', {
      status: 503,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Retry-After': '300',
        'Cache-Control': 'no-store',
      },
    });
  }

  const xml = buildRssXml({ site: getSiteUrl(), now: new Date(), notes: result.notes });
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=600',
    },
  });
};
