import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { getNoteById } from './cms';
import { absolutizeUpload, cleanDescription } from './seo';

// Shared per-note 1200x630 social card renderer (server-only: satori +
// resvg + sharp never reach the browser). Both public endpoints — the
// legacy extensionless route and the `.jpg` route referenced by og:image —
// render through here, so there is exactly one card implementation. The
// right panel renders the cover artwork untouched. The left panel is laid
// out like a crop of the site's note detail page: small // tag eyebrow,
// the title as a single dominant anchor, an excerpt that breathes
// underneath, and a thin site-name line at the bottom. No decorative
// borders, no fake metadata, no clipped accent shapes.
//
// Type scale is tuned for SMALL PREVIEW READABILITY (WhatsApp/Discord/
// messaging link previews render this at thumbnail size): the title
// stays the dominant anchor but yields a little room so the excerpt
// and footer survive reduction. Hierarchy: title > excerpt > footer > tag.

const WIDTH = 1200;
const HEIGHT = 630;

const RED = '#d92323';
const BLACK = '#0d0d0d';
const WHITE = '#ffffff';
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

export async function renderNoteCardPng(slug: string): Promise<Buffer> {
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
                // Small but legible at thumbnail scale; never larger
                // than the excerpt above the title.
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
                            fontSize: 20,
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
                            fontSize: 20,
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
                // still fits the panel with comfortable margins. 84px
                // keeps it clearly dominant while freeing vertical room
                // for a readable excerpt.
                {
                  type: 'div',
                  props: {
                    style: {
                      marginTop: 48,
                      maxWidth: 620,
                      color: WHITE,
                      fontSize: 84,
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
                // for lede paragraphs. Sized up so it survives thumbnail
                // rendering as a clear secondary hierarchy under the
                // title, hard-clamped to two lines with a clean ellipsis
                // so a long paragraph can never consume the composition.
                {
                  type: 'div',
                  props: {
                    style: {
                      marginTop: 32,
                      maxWidth: 600,
                      color: MUTED,
                      fontSize: 34,
                      fontWeight: 400,
                      lineHeight: 1.5,
                      lineClamp: 2,
                      display: 'flex',
                    },
                    children: excerpt,
                  },
                },
                // Site-name footer — the only element that anchors the
                // bottom of the panel. Small-medium and clearly readable
                // at thumbnail scale (lifted from GRAY to MUTED for
                // contrast) while staying far below the excerpt in
                // visual weight.
                {
                  type: 'div',
                  props: {
                    style: {
                      marginTop: 'auto',
                      color: MUTED,
                      fontSize: 20,
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
  return Buffer.from(png);
}

// WhatsApp-sized variant: messaging crawlers cap preview images well
// below what PNG photographs cost (~550KB here vs their ~300KB budget),
// so the referenced card is JPEG. Same pixels, same composition.
export async function renderNoteCardJpeg(slug: string, quality = 82): Promise<Buffer> {
  const png = await renderNoteCardPng(slug);
  return sharp(png).jpeg({ quality }).toBuffer();
}
