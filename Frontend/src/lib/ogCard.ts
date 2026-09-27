import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { getNoteById, type Note } from './cms';
import { absolutizeUpload, cleanDescription } from './seo';

// Shared 1200x630 social card renderer (server-only: satori + resvg + sharp
// never reach the browser). One satori tree and one set of geometry, colour,
// and font constants, so a second card kind can be added by supplying a
// different model rather than a second renderer.
//
// The right panel renders the cover artwork untouched. The left panel is laid
// out like a crop of the site's detail page: small // tag eyebrow, the title
// as a single dominant anchor, an excerpt that breathes underneath, and a
// thin site-name line at the bottom. No decorative borders, no fake
// metadata, no clipped accent shapes.
//
// Type scale is tuned for SMALL PREVIEW READABILITY (WhatsApp/Discord/
// messaging link previews render this at thumbnail size): the title stays
// the dominant anchor but yields a little room so the excerpt and footer
// survive reduction. Hierarchy: title > excerpt > footer > tag.

// Every geometry, colour, and font constant lives here and is referenced by
// both renderers, so a project card can never drift from a note card.
export const CARD = {
  WIDTH: 1200,
  HEIGHT: 630,
  RED: '#d92323',
  BLACK: '#0d0d0d',
  WHITE: '#ffffff',
  MUTED: '#a8a8a8',
  FONTS: ['FOT-Rodin-Pro-M.otf', 'FOT-Rodin-Pro-B.otf'] as const,
  TYPE: {
    eyebrow: 20,
    title: 84,
    excerpt: 34,
    footer: 20,
    tracking: 4,
    titleTracking: 1,
    titleLineHeight: 0.96,
    excerptLineHeight: 1.5,
    eyebrowLetterSpacing: 4,
  },
  SPACING: {
    padding: '64px 72px 56px 72px',
    eyebrowGap: 8,
    titleMarginTop: 48,
    titleMaxWidth: 620,
    excerptMarginTop: 32,
    excerptMaxWidth: 600,
    imagePanelWidth: 430,
  },
} as const;

export const CARD_FOOTER = 'RAVEDEPRINZ.ME  /  NOTES';

export type CardModel = {
  eyebrow: string;
  title: string;
  excerpt: string;
  footer: string;
  imageUrl: string | null;
};

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

/** The one satori tree, parameterised by the model. */
async function renderCardPng(model: CardModel): Promise<Buffer> {
  const [regular, bold] = await Promise.all([
    loadFontFile(CARD.FONTS[0]),
    loadFontFile(CARD.FONTS[1]),
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
          backgroundColor: CARD.BLACK,
          position: 'relative',
          overflow: 'hidden',
          fontFamily: 'Rodin Pro',
        },
        children: [
          dotTexture(),
          // Thin red edge along the boundary between the left panel and the
          // right artwork — the only red shape on the card.
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                top: 0,
                bottom: 0,
                right: CARD.SPACING.imagePanelWidth,
                width: 1,
                backgroundColor: 'rgba(217,35,35,0.55)',
              },
            },
          },
          // Left panel — eyebrow, dominant title, excerpt, site-name footer.
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                padding: CARD.SPACING.padding,
                position: 'relative',
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
                            color: CARD.RED,
                            fontSize: CARD.TYPE.eyebrow,
                            fontWeight: 700,
                            marginRight: CARD.SPACING.eyebrowGap,
                          },
                          children: '//',
                        },
                      },
                      {
                        type: 'div',
                        props: {
                          style: {
                            color: CARD.WHITE,
                            fontSize: CARD.TYPE.eyebrow,
                            fontWeight: 700,
                            letterSpacing: CARD.TYPE.eyebrowLetterSpacing,
                          },
                          children: model.eyebrow,
                        },
                      },
                    ],
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: {
                      marginTop: CARD.SPACING.titleMarginTop,
                      maxWidth: CARD.SPACING.titleMaxWidth,
                      color: CARD.WHITE,
                      fontSize: CARD.TYPE.title,
                      fontWeight: 700,
                      lineHeight: CARD.TYPE.titleLineHeight,
                      letterSpacing: CARD.TYPE.titleTracking,
                      textTransform: 'uppercase',
                      display: 'flex',
                    },
                    children: model.title,
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: {
                      marginTop: CARD.SPACING.excerptMarginTop,
                      maxWidth: CARD.SPACING.excerptMaxWidth,
                      color: CARD.MUTED,
                      fontSize: CARD.TYPE.excerpt,
                      fontWeight: 400,
                      lineHeight: CARD.TYPE.excerptLineHeight,
                      lineClamp: 2,
                      display: 'flex',
                    },
                    children: model.excerpt,
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: {
                      marginTop: 'auto',
                      color: CARD.MUTED,
                      fontSize: CARD.TYPE.footer,
                      fontWeight: 700,
                      letterSpacing: CARD.TYPE.tracking,
                      display: 'flex',
                    },
                    children: model.footer,
                  },
                },
              ],
            },
          },
          // Right panel — cover artwork, untouched.
          ...(model.imageUrl
            ? await (async () => {
                const cover = await embedCover(model.imageUrl);
                return cover
                  ? [
                      {
                        type: 'div',
                        props: {
                          style: {
                            display: 'flex',
                            width: CARD.SPACING.imagePanelWidth,
                            position: 'relative',
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
                  : [];
              })()
            : []),
        ].filter(Boolean),
      },
    } as never,
    {
      width: CARD.WIDTH,
      height: CARD.HEIGHT,
      fonts: [
        { name: 'Rodin Pro', data: regular, weight: 400, style: 'normal' },
        { name: 'Rodin Pro', data: bold, weight: 700, style: 'normal' },
      ],
    },
  );

  const png = new Resvg(svg, { fitTo: { mode: 'width', value: CARD.WIDTH } }).render().asPng();
  return Buffer.from(png);
}

// --- Note card -------------------------------------------------------------

/** The pre-refactor note card model, unchanged. */
export function buildNoteCardModel(note: Note | null): CardModel {
  return {
    eyebrow: (note?.tag ?? 'NOTES').toUpperCase(),
    title: (note?.title ?? 'ravedeprinz').slice(0, 80),
    excerpt: cleanDescription(note?.body, note?.subtitle, 160) || 'Short transmissions from the workbench.',
    footer: CARD_FOOTER,
    imageUrl: note?.image_url ?? null,
  };
}

export async function renderNoteCardPng(slug: string): Promise<Buffer> {
  const note = await getNoteById(slug).catch(() => null);
  return renderCardPng(buildNoteCardModel(note));
}

// WhatsApp-sized variant: messaging crawlers cap preview images well below
// what PNG photographs cost, so the referenced card is JPEG. Same pixels,
// same composition.
export async function renderNoteCardJpeg(slug: string, quality = 82): Promise<Buffer> {
  const png = await renderNoteCardPng(slug);
  return sharp(png).jpeg({ quality }).toBuffer();
}
