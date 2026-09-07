import type { APIRoute } from 'astro';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getNoteById } from '../../../lib/cms';
import { absolutizeUpload, cleanDescription } from '../../../lib/seo';

// Per-note 1200x630 social card in site identity. Always renders —
// missing notes or covers degrade to the typography card, never an error.
// Left panel reuses the website's visual primitives: skewed red stripe,
// dot texture, // eyebrow + numbered route, asymmetric title with the
// second line offset and a clipped red punctuation slab. Right panel
// (cover artwork) is untouched.
export const prerender = false;

const WIDTH = 1200;
const HEIGHT = 630;

const RED = '#d92323';
const DARK_RED = '#732424';
const BLACK = '#0d0d0d';
const WHITE = '#ffffff';
const GRAY = '#7b7b7b';
const MUTED = '#b3b3b3';

// Same subtle dot texture the body uses — sits behind everything
// without competing with type.
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
          'radial-gradient(rgba(255,255,255,0.06) 0.55px, transparent 0.55px)',
        backgroundSize: '7px 7px',
      },
    },
  };
}

// Skewed red stripe along the bottom — mirrors the .site-header::after
// divider, .stripe, and .home-rule-label i rules on the actual site.
function bottomStripe() {
  return {
    type: 'div',
    props: {
      style: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 4,
        backgroundColor: RED,
        transform: 'skewX(-30deg)',
        transformOrigin: 'left bottom',
      },
    },
  };
}

// Vertical thin red guide — a structural accent, not decoration.
// Echoes the .home-record::before left rule on the home list.
function leftRule() {
  return {
    type: 'div',
    props: {
      style: {
        position: 'absolute',
        left: 64,
        top: 56,
        bottom: 56,
        width: 2,
        backgroundColor: RED,
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

// Format a publish date as `07 SEP 2026` for the eyebrow row.
function formatStamp(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const months = [
    'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
    'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
  ];
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = months[d.getUTCMonth()] ?? 'JAN';
  const year = d.getUTCFullYear();
  return `${day} ${month} ${year}`;
}

// Derive a 3-digit route number from the slug or id so the metadata
// row says `NOTES / 024` instead of inventing fake content.
function routeNumber(note: { id?: string; slug?: string } | null): string {
  const source = (note?.id ?? note?.slug ?? '').replace(/[^a-zA-Z0-9]/g, '');
  if (!source) return '000';
  let hash = 0;
  for (let i = 0; i < source.length; i++) {
    hash = (hash * 31 + source.charCodeAt(i)) >>> 0;
  }
  return String(hash % 1000).padStart(3, '0');
}

// Split the title into two halves so the second line can be offset,
// weighted differently, and have its terminal punctuation clipped in
// red past the panel edge.
function splitTitle(raw: string): { line1: string; line2: string } {
  const trimmed = raw.trim();
  const words = trimmed.split(/\s+/).slice(0, 6);
  if (words.length <= 2) {
    return { line1: '', line2: words.join(' ') || trimmed };
  }
  const mid = Math.ceil(words.length / 2);
  return {
    line1: words.slice(0, mid).join(' '),
    line2: words.slice(mid).join(' '),
  };
}

export const GET: APIRoute = async ({ params }) => {
  const slug = params.slug ?? '';
  const note = await getNoteById(slug).catch(() => null);

  const tag = (note?.tag ?? 'NOTES').toUpperCase();
  const rawTitle = (note?.title ?? 'ravedeprinz').slice(0, 80);
  const { line1, line2 } = splitTitle(rawTitle);
  const excerpt =
    cleanDescription(note?.body, note?.subtitle, 120) ||
    'Short transmissions from the workbench.';
  const cover = await embedCover(note?.image_url);
  const stamp = formatStamp(note?.published_at);
  const route = routeNumber(note);

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
          bottomStripe(),
          leftRule(),
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                padding: '54px 48px 56px 88px',
                position: 'relative',
              },
              children: [
                // Eyebrow row — // NOTES  left, date stamp right.
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    },
                    children: [
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
                                  fontSize: 22,
                                  fontWeight: 700,
                                  marginRight: 6,
                                },
                                children: '//',
                              },
                            },
                            {
                              type: 'div',
                              props: {
                                style: {
                                  color: WHITE,
                                  fontSize: 22,
                                  fontWeight: 700,
                                  letterSpacing: 5,
                                },
                                children: tag,
                              },
                            },
                            {
                              type: 'div',
                              props: {
                                style: {
                                  width: 28,
                                  height: 2,
                                  backgroundColor: RED,
                                  marginLeft: 14,
                                  transform: 'skewX(-30deg)',
                                },
                              },
                            },
                          ],
                        },
                      },
                      {
                        type: 'div',
                        props: {
                          style: {
                            display: 'flex',
                            color: GRAY,
                            fontSize: 20,
                            fontWeight: 700,
                            letterSpacing: 4,
                          },
                          children: stamp,
                        },
                      },
                    ],
                  },
                },
                // Title block — asymmetric. Line 1 sits tight to the
                // left rule; line 2 is offset right and heavier, with
                // a red slab clipped past the right edge as the
                // visual punctuation of the card.
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      flexDirection: 'column',
                      marginTop: 60,
                      position: 'relative',
                    },
                    children: [
                      line1
                        ? {
                            type: 'div',
                            props: {
                              style: {
                                color: WHITE,
                                fontSize: 70,
                                fontWeight: 700,
                                lineHeight: 0.95,
                                letterSpacing: 1,
                                textTransform: 'uppercase',
                                whiteSpace: 'nowrap',
                              },
                              children: line1,
                            },
                          }
                        : null,
                      {
                        type: 'div',
                        props: {
                          style: {
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'flex-start',
                            marginTop: 4,
                            marginLeft: line1 ? 110 : 0,
                          },
                          children: [
                            {
                              type: 'div',
                              props: {
                                style: {
                                  color: WHITE,
                                  fontSize: 92,
                                  fontWeight: 700,
                                  lineHeight: 0.92,
                                  letterSpacing: 1,
                                  textTransform: 'uppercase',
                                  whiteSpace: 'nowrap',
                                },
                                children: line2,
                              },
                            },
                            {
                              type: 'div',
                              props: {
                                style: {
                                  width: 56,
                                  height: 86,
                                  backgroundColor: RED,
                                  marginLeft: -4,
                                  marginTop: 6,
                                  transform: 'translateX(28px)',
                                },
                              },
                            },
                          ],
                        },
                      },
                    ].filter(Boolean),
                  },
                },
                // Excerpt — muted, tight, supporting copy.
                {
                  type: 'div',
                  props: {
                    style: {
                      marginTop: 32,
                      marginLeft: 8,
                      maxWidth: 520,
                      color: MUTED,
                      fontSize: 22,
                      fontWeight: 400,
                      lineHeight: 1.45,
                      overflow: 'hidden',
                      display: 'flex',
                    },
                    children: excerpt,
                  },
                },
                // Bottom metadata — route indicator on the left,
                // brand mark on the right, separated by a thin
                // horizontal rule that runs the panel.
                {
                  type: 'div',
                  props: {
                    style: {
                      marginTop: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                    },
                    children: [
                      {
                        type: 'div',
                        props: {
                          style: {
                            height: 1,
                            backgroundColor: 'rgba(255,255,255,0.18)',
                            marginBottom: 16,
                          },
                        },
                      },
                      {
                        type: 'div',
                        props: {
                          style: {
                            display: 'flex',
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          },
                          children: [
                            {
                              type: 'div',
                              props: {
                                style: {
                                  display: 'flex',
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  color: GRAY,
                                  fontSize: 18,
                                  fontWeight: 700,
                                  letterSpacing: 4,
                                },
                                children: [
                                  {
                                    type: 'div',
                                    props: {
                                      style: { color: WHITE, marginRight: 12 },
                                      children: tag,
                                    },
                                  },
                                  {
                                    type: 'div',
                                    props: { style: { color: RED }, children: '/' },
                                  },
                                  {
                                    type: 'div',
                                    props: {
                                      style: { marginLeft: 12, color: WHITE },
                                      children: route,
                                    },
                                  },
                                ],
                              },
                            },
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
                                        color: WHITE,
                                        fontSize: 20,
                                        fontWeight: 700,
                                        letterSpacing: 3,
                                      },
                                      children: 'RAVEDEPRINZ',
                                    },
                                  },
                                  {
                                    type: 'div',
                                    props: {
                                      style: {
                                        width: 14,
                                        height: 2,
                                        backgroundColor: RED,
                                        marginLeft: 12,
                                        marginRight: 12,
                                        transform: 'skewX(-30deg)',
                                      },
                                    },
                                  },
                                  {
                                    type: 'div',
                                    props: {
                                      style: {
                                        color: GRAY,
                                        fontSize: 16,
                                        fontWeight: 700,
                                        letterSpacing: 4,
                                      },
                                      children: 'PERSONAL ARCHIVE',
                                    },
                                  },
                                ],
                              },
                            },
                          ],
                        },
                      },
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
                    style: {
                      display: 'flex',
                      width: 430,
                      position: 'relative',
                      borderLeft: `4px solid ${RED}`,
                    },
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
