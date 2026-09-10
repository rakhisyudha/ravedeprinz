import type { APIRoute } from 'astro';
import { renderNoteCardJpeg } from '../../../lib/ogCard';

// Canonical social card referenced by og:image / twitter:image:
// `/notes/<slug>/opengraph-image.jpg` — JPEG stays comfortably inside
// messaging crawlers' preview-image size budget, and the file extension
// keeps strict parsers from rejecting the URL.
export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const jpeg = await renderNoteCardJpeg(params.slug ?? '');
  return new Response(new Uint8Array(jpeg), {
    status: 200,
    headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=3600' },
  });
};
