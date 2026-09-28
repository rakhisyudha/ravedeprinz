import { afterEach, describe, expect, test, vi } from 'vitest';
import * as cvRoute from '../src/pages/cv.ts';
import { serverApiBase } from '../src/lib/api';
import { getSiteUrl } from '../src/lib/seo';

// The /cv route: a stable public URL for the CV that serves the stored bytes
// under a clean filename. Uploads keep their hashed names on disk; only the
// name the browser saves changes.

const PDF_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a]);

const locals = () => ({ cmsCache: new Map<string, Promise<unknown>>() }) as never;

type Site = { site_name: string; cv_url: string | null };

/** Answers the site-settings fetch, then the upload fetch. */
function stub(site: Site | null, upload: () => Response) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/api/content/site')) {
        return new Response(JSON.stringify(site), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return upload();
    }),
  );
}

function pdfResponse() {
  return new Response(PDF_BYTES, {
    status: 200,
    headers: { 'Content-Type': 'application/pdf' },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('GET /cv', () => {
  test('serves the stored PDF as an attachment with the clean filename', async () => {
    stub({ site_name: 'ravedeprinz', cv_url: '/uploads/1790518686676_abc123.pdf' }, pdfResponse);
    const res = await cvRoute.GET!({ locals: locals() } as never);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
    expect(res.headers.get('Content-Disposition')).toBe(
      'attachment; filename="Rakhis-de-Yudha-CV.pdf"',
    );
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(PDF_BYTES);
  });

  test('proxies the bytes from the API origin, not the public /uploads path', async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input.toString();
        calls.push(url);
        if (url.includes('/api/content/site')) {
          return new Response(JSON.stringify({ site_name: 'ravedeprinz', cv_url: '/uploads/abc.pdf' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return pdfResponse();
      }),
    );
    await cvRoute.GET!({ locals: locals() } as never);
    // Fetching the public path would be a round trip to ourselves in
    // production, where nginx sends /uploads/* to Bun.
    const apiBase = serverApiBase().replace(/\/$/, '');
    const uploadCall = calls.find((url) => url.includes('/uploads/'))!;
    expect(uploadCall).toBe(`${apiBase}/uploads/abc.pdf`);
    expect(uploadCall).not.toBe(`${getSiteUrl()}/uploads/abc.pdf`);
  });

  test('a 404 when no CV is set', async () => {
    stub({ site_name: 'ravedeprinz', cv_url: null }, pdfResponse);
    const res = await cvRoute.GET!({ locals: locals() } as never);
    expect(res.status).toBe(404);
  });

  test('a 404 when the stored path is not a single upload filename', async () => {
    for (const stored of [
      'https://example.com/evil.pdf',
      '/uploads/../../etc/passwd',
      '/uploads/nested/dir/file.pdf',
      '/uploads/file.exe',
      '/api/content/site',
      'not-a-path',
      '',
    ]) {
      stub({ site_name: 'ravedeprinz', cv_url: stored }, pdfResponse);
      const res = await cvRoute.GET!({ locals: locals() } as never);
      expect(res.status, `expected 404 for ${stored}`).toBe(404);
    }
  });

  test('a 404 when the upload is missing upstream', async () => {
    stub({ site_name: 'ravedeprinz', cv_url: '/uploads/gone.pdf' }, () => new Response('', { status: 404 }));
    expect((await cvRoute.GET!({ locals: locals() } as never)).status).toBe(404);
  });

  test('a 404 when the CMS or the upload request throws', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('CMS unreachable');
      }),
    );
    expect((await cvRoute.GET!({ locals: locals() } as never)).status).toBe(404);
  });

  test('the filename is never taken from the stored upload name', async () => {
    stub({ site_name: 'ravedeprinz', cv_url: '/uploads/1790518686676_abc123.pdf' }, pdfResponse);
    const res = await cvRoute.GET!({ locals: locals() } as never);
    const disposition = res.headers.get('Content-Disposition')!;
    expect(disposition).not.toContain('1790518686676');
    expect(disposition).not.toContain('abc123');
  });

  test('the route is server-rendered per request, not prerendered', () => {
    // cv_url changes when the owner re-uploads, so the route must re-read it.
    expect(cvRoute.prerender).toBe(false);
  });
});
