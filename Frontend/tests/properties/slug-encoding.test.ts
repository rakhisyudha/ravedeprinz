import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import fc from 'fast-check';
import { getProjectBySlug, getProjectBySlugResult } from '../../src/lib/cms';

// Feature: portfolio-engagement, Property 10: Project slug request encoding round trip
const capturedUrls: string[] = [];

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function stubFetch(handler: () => Promise<Response>): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      capturedUrls.push(typeof input === 'string' ? input : input.toString());
      return handler();
    }),
  );
}

beforeEach(() => {
  capturedUrls.length = 0;
  stubFetch(async () => jsonResponse({ title: 'T', slug: 's' }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const arbSlug = fc.oneof(
  fc.string({ minLength: 1, maxLength: 24 }),
  fc.string({ minLength: 1, maxLength: 12 }).map((s) => `  ${s}  `),
  fc.constantFrom('a/b', 'a?b', 'a#b', 'a&b', 'a%b', 'ünïcode', '日本語', 'a+b', "quote'", 'sp ace'),
  fc.constantFrom('%', '%2F', '%zz', 'a%20b'),
);

// The raw request string, not a reparsed URL: `new URL()` collapses a ".."
// segment, which is URL resolution rather than an encoding defect. The
// assertion below reads the string the fetcher actually receives.
const PREFIX = '/api/content/projects/';

function lastSegment(url: string): string {
  return url.slice(url.indexOf(PREFIX)).slice(PREFIX.length);
}

describe('Property 10: project slug request encoding round trip', () => {
  test('exactly one request is issued and the segment decodes back to the slug', () =>
    fc.assert(
      fc.asyncProperty(arbSlug, async (slug) => {
        capturedUrls.length = 0;
        await getProjectBySlug(slug);
        expect(capturedUrls).toHaveLength(1);
        const segment = lastSegment(capturedUrls[0]!);
        expect(decodeURIComponent(segment)).toBe(slug);
        expect(segment).not.toContain('/');
        expect(segment).not.toContain('?');
        expect(segment).not.toContain('#');
      }),
      { numRuns: 200 },
    ));

  test('the raw result helper encodes identically', () =>
    fc.assert(
      fc.asyncProperty(arbSlug, async (slug) => {
        capturedUrls.length = 0;
        const res = await getProjectBySlugResult(slug);
        expect(res.status).toBe('ok');
        expect(capturedUrls).toHaveLength(1);
        expect(decodeURIComponent(lastSegment(capturedUrls[0]!))).toBe(slug);
      }),
      { numRuns: 200 },
    ));

  test('a 404 returns null without throwing', async () => {
    stubFetch(async () => jsonResponse({ error: 'Not found' }, 404));
    await expect(getProjectBySlug('missing')).resolves.toBeNull();
  });

  test('an unreachable CMS returns null without throwing', async () => {
    stubFetch(async () => {
      throw new Error('connect ECONNREFUSED');
    });
    await expect(getProjectBySlug('anything')).resolves.toBeNull();
    const res = await getProjectBySlugResult('anything');
    expect(res.status).toBe('unavailable');
  });

  test('a 200 with no title returns null', async () => {
    stubFetch(async () => jsonResponse({ slug: 'x' }));
    await expect(getProjectBySlug('x')).resolves.toBeNull();
  });
});
