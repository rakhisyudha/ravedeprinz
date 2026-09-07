import type { APIRoute } from 'astro';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getNoteById } from '../../../lib/cms';
import { absolutizeUpload, cleanDescription } from '../../../lib/seo';

// Per-note 1200x630 social card in site identity. Always renders —
// missing notes or covers degrade to the typography card, never an error.
export const prerender = false;

const WIDTH = 1200;
const HEIGHT = 630;

const RED = '#d92323';
const DARK_RED = '#732424';
const BLACK = '#0d0d0d';
const WHITE = '#ffffff';
const GRAY = '#7b7b7b';

async function loadFontFile(name: string): Promise<Buffer> {
  const candidates = [
    join(process.cwd(), 'public', 'fonts', name),
    join(process.cwd(), 'dist', 'client', 'fonts', name),
  ];
  for (const path of candidates) {
    try {
      return await readFile(path);
    } catch {
      // try next candidate
    }
  }
  throw new Error(`OG font missing: ${name}`);
}

async function embedCover(path: string | null | undefined): Promise<string | null> {
  const url = absolutizeUpload(path);
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const type = res.headers.get('content-type') ?? 'image/jpeg';
    if (!type.startsWith('image/')) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length === 0 || buffer.length > 6 * 1024 * 1024) return null;
    return `data:${type};base64,${buffer.toString('base64')}`;
  } catch {
    return null;
  }
}

export const GET: APIRoute = async ({ params }) => {
  const slug = params.slug ?? '';
  const note = await getNoteById(slug).catch(() => null);

  const tag = (note?.tag ?? 'NOTES').toUpperCase();
  const title = (note?.title ?? 'ravedeprinz').slice(0, 110);
  const excerpt = cleanDescription(note?.body, note?.subtitle, 140) || 'Short transmissions from the workbench.';
  const cover = await embedCover(note?.image_url);

  const [regular, bold] = await Promise.all([
    loadFontFile('FOT-Rodin-Pro-M.otf'),
    loadFontFile('FOT-Rodin-Pro-B.otf'),
  ]);

  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          display: 'flex',
          flexDirection: 'row',
          width: '100%',
          height: '100%',
          backgroundColor: BLACK,
          position: 'relative',
          overflow: 'hidden',
          fontFamily: 'Rodin Pro',
        },
        children: [
          { type: 'div', props: { style: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 14, backgroundColor: RED } } },
          { type: 'div', props: { style: { position: 'absolute', left: 24, top: 0, bottom: 0, width: 5, backgroundColor: DARK_RED } } },
          {
            type: 'div',
            props: {
              style: { display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1, padding: '60px 56px 52px 88px' },
              children: [
                {
                  type: 'div',
                  props: {
                    style: { display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
                    children: [
                      { type: 'div', props: { style: { color: RED, fontSize: 30, fontWeight: 800, letterSpacing: 6 }, children: tag } },
                      { type: 'div', props: { style: { color: GRAY, fontSize: 26, fontWeight: 700, letterSpacing: 5 }, children: 'NOTES' } },
                    ],
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: { display: 'flex', flexDirection: 'column' },
                    children: [
                      {
                        type: 'div',
                        props: {
                          style: { color: WHITE, fontSize: 78, fontWeight: 800, lineHeight: 1.02, height: 240, overflow: 'hidden', textTransform: 'uppercase' },
                          children: title,
                        },
                      },
                      {
                        type: 'div',
                        props: {
                          style: { color: GRAY, fontSize: 30, lineHeight: 1.4, height: 84, overflow: 'hidden', marginTop: 18 },
                          children: excerpt,
                        },
                      },
                    ],
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: { display: 'flex', flexDirection: 'row', alignItems: 'center' },
                    children: [
                      { type: 'div', props: { style: { width: 18, height: 18, backgroundColor: RED, marginRight: 16 } } },
                      { type: 'div', props: { style: { color: WHITE, fontSize: 30, fontWeight: 800, letterSpacing: 3 }, children: 'RAVEDEPRINZ' } },
                      { type: 'div', props: { style: { color: GRAY, fontSize: 24, fontWeight: 700, letterSpacing: 4, marginLeft: 18 }, children: 'PERSONAL ARCHIVE' } },
                    ],
                  },
                },
              ],
            },
          },
          ...(cover
            ? [
                {
                  type: 'div',
                  props: {
                    style: { display: 'flex', width: 430, position: 'relative', borderLeft: `4px solid ${RED}` },
                    children: [
                      {
                        type: 'img',
                        props: {
                          src: cover,
                          style: { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', objectFit: 'cover' },
                        },
                      },
                    ],
                  },
                },
              ]
            : []),
        ],
      },
    } as never,
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: [
        { name: 'Rodin Pro', data: regular, weight: 400, style: 'normal' },
        { name: 'Rodin Pro', data: bold, weight: 700, style: 'normal' },
      ],
    },
  );

  const png = new Resvg(svg, { fitTo: { mode: 'width', value: WIDTH } }).render().asPng();
  return new Response(new Uint8Array(png), {
    status: 200,
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' },
  });
};
