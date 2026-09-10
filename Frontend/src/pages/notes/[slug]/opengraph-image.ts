import type { APIRoute } from 'astro';
import { renderNoteCardPng } from '../../../lib/ogCard';

// Legacy extensionless route: kept serving (same card, PNG) so older
// references never break. New shares link the `.jpg` variant instead.
export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const png = await renderNoteCardPng(params.slug ?? '');
  return new Response(new Uint8Array(png), {
    status: 200,
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' },
  });
};
