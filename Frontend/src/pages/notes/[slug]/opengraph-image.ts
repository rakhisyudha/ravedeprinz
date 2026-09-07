import type { APIRoute } from 'astro';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getNoteById } from '../../../lib/cms';
import { absolutizeUpload, cleanDescription } from '../../../lib/seo';

// Per-note 1200x630 social card. The right panel renders the cover
// artwork untouched. The left panel is laid out like a crop of the
// site's note detail page: small // tag eyebrow, the title as a single
// dominant anchor, an excerpt that breathes underneath, and a thin
// site-name line at the bottom. No decorative borders, no fake metadata,
// no clipped accent shapes.
export const prerender = false;

const WIDTH = 1200;
const HEIGHT = 630;

const RED = '#d92323';
const BLACK = '#0d0d0d';
const WHITE = '#ffffff';
const GRAY = '#7b7b7b';
const MUTED = '#a8a8a8';

// Same dot texture the body uses — sits behind everything.
function dotTexture() {
  return {
    type: 'div',
    props: {
      style: {
        position: 'absolute',
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        backgroundImage:
          'radial-gradient(rgba(255,255,255,0.05) 0.55px, transparent 0.55px)',
        backgroundSize: '7px 7px',
      },
    },
  };
}

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
  const title = (note?.title ?? 'ravedeprinz').slice(0, 80);
  const excerpt =
    cleanDescription(note?.body, note?.subtitle, 160) ||
    'Short transmissions from the workbench.';
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
          dotTexture(),
          // Thin red edge along the boundary between the left panel
          // and the right artwork — the only red shape on the card.
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                top: 0,
                bottom: 0,
                right: 430,
                width: 1,
                backgroundColor: 'rgba(217,35,35,0.55)',
              },
            },
          },
          // Left panel — laid out like a fragment of the note detail
          // page: eyebrow, dominant title, excerpt, site-name footer.
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                padding: '64px 72px 56px 72px',
                position: 'relative',
              },
              children: [
                // // TAG — same primitive as .eyebrow on the site.
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                    },
                    children: [
                      {
                        type: 'div',
                        props: {
                          style: {
                            color: RED,
                            fontSize: 18,
                            fontWeight: 700,
                            marginRight: 8,
                          },
                          children: '//',
                        },
                      },
                      {
                        type: 'div',
                        props: {
                          style: {
                            color: WHITE,
                            fontSize: 18,
                            fontWeight: 700,
                            letterSpacing: 4,
                          },
                          children: tag,
                        },
                      },
                    ],
                  },
                },
                // Title — the anchor. Left-aligned, large, single block.
                // The display font on the site goes up to ~150px on the
                // detail page; here we set it where the longest word
                // still fits the panel with comfortable margins.
                {
                  type: 'div',
                  props: {
                    style: {
                      marginTop: 56,
                      maxWidth: 600,
                      color: WHITE,
                      fontSize: 96,
                      fontWeight: 700,
                      lineHeight: 0.96,
                      letterSpacing: 1,
                      textTransform: 'uppercase',
                      display: 'flex',
                    },
                    children: title,
                  },
                },
                // Excerpt — the same muted reading copy the site uses
                // for lede paragraphs. Generous max-width so it breathes.
                {
                  type: 'div',
                  props: {
                    style: {
                      marginTop: 40,
                      maxWidth: 560,
                      color: MUTED,
                      fontSize: 24,
                      fontWeight: 400,
                      lineHeight: 1.55,
                      display: 'flex',
                    },
                    children: excerpt,
                  },
                },
                // Site-name footer — tiny, far from the title, the only
                // element that anchors the bottom of the panel.
                {
                  type: 'div',
                  props: {
                    style: {
                      marginTop: 'auto',
                      color: GRAY,
                      fontSize: 14,
                      fontWeight: 700,
                      letterSpacing: 4,
                      display: 'flex',
                    },
                    children: 'RAVEDEPRINZ.ME  /  NOTES',
                  },
                },
              ],
            },
          },
          // Right panel — cover artwork, untouched.
          ...(cover
            ? [
                {
                  type: 'div',
                  props: {
                    style: { display: 'flex', width: 430, position: 'relative' },
                    children: [
                      {
                        type: 'img',
                        props: {
                          src: cover,
                          style: {
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          },
                        },
                      },
                    ],
                  },
                },
              ]
            : []),
        ].filter(Boolean),
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
