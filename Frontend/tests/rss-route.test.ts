import { afterEach, describe, expect, test, vi } from 'vitest';
import * as rssRoute from '../src/pages/rss.xml.ts';

// The /rss.xml route: a thin wrapper that fetches the published notes and
// hands them to the pure builder (covered by the rss-feed properties).

const NOTES = [
  {
    title: 'In Pursuit of Great We Failed to Do Good',
    slug: 'in-pursuit-of-great',
    body: 'The pursuit of greatness often leads us astray.',
    tag: 'REFLECTION',
    author: 'Rakhis',
    published: true,
    published_at: '2026-08-20T10:00:00Z',
  },
];

function stubNotes(respond: () => Response | Promise<Response>) {
  vi.stubGlobal('fetch', vi.fn(async () => respond()));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('GET /rss.xml', () => {
  test('serves the feed as RSS with a short public cache', async () => {
    stubNotes(() => new Response(JSON.stringify({ notes: NOTES }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    const res = await rssRoute.GET!({} as never);
    expect(res.status).toBe(200);
    // Not application/rss+xml: browsers download that type instead of showing it.
    expect(res.headers.get('Content-Type')).toBe('application/xml; charset=utf-8');
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=600');
    const body = await res.text();
    expect(body.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(body).toContain('<rss version="2.0"');
    expect(body).toContain('/notes/in-pursuit-of-great</link>');
  });

  test('an empty but reachable CMS is still a valid, empty feed', async () => {
    stubNotes(() => new Response(JSON.stringify({ notes: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    const res = await rssRoute.GET!({} as never);
    expect(res.status).toBe(200);
    expect(await res.text()).not.toContain('<item>');
  });

  test('an unreachable CMS is a 503 with Retry-After, never an empty feed', async () => {
    stubNotes(() => {
      throw new Error('connect ECONNREFUSED');
    });
    const res = await rssRoute.GET!({} as never);
    expect(res.status).toBe(503);
    expect(res.headers.get('Retry-After')).toBe('300');
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(await res.text()).not.toContain('<rss');
  });

  test('a CMS error status is treated the same as unreachable', async () => {
    stubNotes(() => new Response('boom', { status: 500 }));
    const res = await rssRoute.GET!({} as never);
    expect(res.status).toBe(503);
  });

  test('the route is rendered per request, not at build time', () => {
    expect(rssRoute.prerender).toBe(false);
  });
});
