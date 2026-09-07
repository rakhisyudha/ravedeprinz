import type { APIRoute } from 'astro';
import { getSiteUrl } from '../lib/seo';

export const prerender = false;

export const GET: APIRoute = async () => {
  const body = ['User-agent: *', 'Allow: /', 'Disallow: /admin', 'Disallow: /login', 'Disallow: /api/', '', `Sitemap: ${getSiteUrl()}/sitemap.xml`, ''].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain' } });
};
