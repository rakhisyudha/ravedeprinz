import { afterEach, describe, expect, test, vi } from 'vitest';
import sharp from 'sharp';
import { renderNoteCardJpeg } from '../src/lib/ogCard';
import * as noteOgRoute from '../src/pages/notes/[slug]/opengraph-image.jpg';
import type { Note } from '../src/lib/cms';

// Smoke test for the OG endpoint. It renders real pixels with satori + resvg
// + sharp, so it proves the shared renderer still produces a complete
// 1200x630 card after the per-project card was removed from the site.

function mockCms(payload: Record<string, unknown>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(payload), { status: 200 })),
  );
}

function mockCmsDown() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      throw new Error('CMS unreachable');
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

async function expectCard(body: Uint8Array, contentType: string | null, cacheControl: string | null) {
  const metadata = await sharp(Buffer.from(body)).metadata();
  expect(metadata.format).toBe('jpeg');
  expect(metadata.width).toBe(1200);
  expect(metadata.height).toBe(630);
  expect(contentType).toBe('image/jpeg');
  expect(cacheControl).toBe('public, max-age=3600');
}

describe('note OG route', () => {
  test('a published note renders a 1200x630 JPEG', async () => {
    const note: Note = {
      title: 'To Grieve Deeply Is to Have Loved Fully',
      slug: 'to-grieve-deeply',
      body: 'The culmination of love is grief, and yet we love.',
      tag: 'REFLECTION',
    };
    mockCms(note);
    const res = await noteOgRoute.GET!({ params: { slug: 'to-grieve-deeply' } } as never);
    expect(res.status).toBe(200);
    await expectCard(
      new Uint8Array(await res.arrayBuffer()),
      res.headers.get('Content-Type'),
      res.headers.get('Cache-Control'),
    );
  });

  test('an unknown note still renders a complete card rather than erroring', async () => {
    mockCmsDown();
    const res = await noteOgRoute.GET!({ params: { slug: 'nope' } } as never);
    expect(res.status).toBe(200);
    const body = new Uint8Array(await res.arrayBuffer());
    expect((await sharp(Buffer.from(body)).metadata()).width).toBe(1200);
  });

  test('an unreachable CMS still renders a complete card', async () => {
    mockCmsDown();
    const jpeg = await renderNoteCardJpeg('anything');
    const metadata = await sharp(jpeg).metadata();
    expect(metadata.width).toBe(1200);
    expect(metadata.height).toBe(630);
    expect(jpeg.byteLength).toBeGreaterThan(1000);
  });

  test('a note with an unreadable cover still yields a full-size card', async () => {
    mockCms({ title: 'C', slug: 'c', body: 'b', tag: 'LOG', image_url: '/uploads/missing.png' });
    mockCmsDown(); // the cover fetch itself fails
    const jpeg = await renderNoteCardJpeg('c');
    const metadata = await sharp(jpeg).metadata();
    expect(metadata.width).toBe(1200);
    expect(metadata.height).toBe(630);
  });
});
