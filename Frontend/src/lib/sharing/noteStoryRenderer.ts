// Story image renderer for an article from ravedeprinz.
//
// Output: 1080x1920 PNG Blob, local to the device, generated only when the
// user taps share. Same Canvas 2D primitive the rest of the web already
// uses — no new dependencies.
//
// Compositional principle (carried over from opengraph-image.ts and the
// .note-preview on-page card): the cover artwork fills the entire 1080x1920
// frame, blurred and darkened for depth, and a compact white reading card
// sits in the middle of the canvas with real quiet cover art visible above
// and below it. The card hugs its content (no oversized footer gap) and
// always stops well before the bottom of the canvas, leaving a clean strip
// of background visible underneath so the user can place Instagram's native
// Link sticker in that quiet zone (the image itself is intentionally NOT
// clickable inside Instagram — that is the user's manual step, like
// Medium's flow).

export type NoteShareData = {
  title: string;
  excerpt: string;
  category: string;
  coverImage?: string | null;
  readingTime?: string | null;
  publishedAt?: string | null;
  author?: string | null;
  siteName?: string | null;
};

// Brand palette. Mirrors --black/--red/--dark-red/--gray/--white in
// global.css. Canvas 2D cannot read CSS custom properties.
const PALETTE = {
  black: '#0d0d0d',
  red: '#d92323',
  darkRed: '#732424',
  gray: '#7b7b7b',
  white: '#ffffff',
} as const;

const WIDTH = 1080;
const HEIGHT = 1920;

// The composition math:
//   - The cover artwork fills the entire canvas (blurred + darkened).
//   - The white card is a centered, asymmetric, content-sized block.
//   - The card's bottom edge is anchored at max HEIGHT * 0.62 so there
//     is always at least ~38% (~730px) of clean background visible
//     beneath the card for the Instagram Link sticker zone.
//   - The card's top edge floats below HEIGHT * 0.18 so the cover art
//     also breathes above the card.
//   - cardWidth is fixed; cardHeight varies with content but is clamped
//     between a min and a max so a long title can never push the card
//     into the Link sticker area.
const CARD_SIDE_PADDING = 64;
const CARD_WIDTH = WIDTH - CARD_SIDE_PADDING * 2;
const CARD_TOP_MIN = Math.round(HEIGHT * 0.18);
const CARD_BOTTOM_MAX = Math.round(HEIGHT * 0.62); // hard cap so Link sticker zone is preserved
const CARD_CONTENT_PADDING_TOP = 56;
const CARD_CONTENT_PADDING_BOTTOM = 40;
const CARD_CONTENT_PADDING_X = 48;
const CARD_MIN_HEIGHT = 360; // tiny titles still get a meaningful card
const CARD_MAX_HEIGHT = CARD_BOTTOM_MAX - CARD_TOP_MIN;

const COVER_BLUR_PX = 28; // creates depth without obscuring the artwork beyond recognition
const COVER_DARKEN_TOP = 0.55; // upper slab (above the card)
const COVER_DARKEN_MID = 0.30; // the card-horizontal band (still visible behind the card edges / below it)
const COVER_DARKEN_BOTTOM = 0.45; // the Link-sticker zone — quieter so the eye rests, but still moody

// Typography. Rodin Pro M/B are the only OTFs the project self-hosts and
// therefore the only webfonts we can reliably embed in the canvas.
// Space Grotesk falls through to system sans (same pattern the OG card
// and the existing .mono class use).
const FONT_DISPLAY_BOLD = `'Rodin Pro', 'Space Grotesk', system-ui, sans-serif`;
const FONT_SANS = `'Space Grotesk', system-ui, sans-serif`;

const FONT_URLS = {
  regular: '/fonts/FOT-Rodin-Pro-M.otf',
  bold: '/fonts/FOT-Rodin-Pro-B.otf',
} as const;

const loadedFontFamilies = new Set<string>();

async function loadBrandFonts(): Promise<void> {
  if (typeof document === 'undefined') return;
  const tasks: Promise<void>[] = [];
  for (const [weight, url] of [
    [400, FONT_URLS.regular],
    [700, FONT_URLS.bold],
  ] as const) {
    const key = `${weight}-${url}`;
    if (loadedFontFamilies.has(key)) continue;
    loadedFontFamilies.add(key);
    try {
      const face = new FontFace('Rodin Pro', `url(${url})`, {
        weight: String(weight),
        style: 'normal',
      });
      tasks.push(
        face.load().then((loaded) => {
          document.fonts.add(loaded);
        }),
      );
    } catch {
      // FontFace API unavailable (very old browsers). Silently fall
      // through to the system sans stack.
    }
  }
  if (tasks.length) {
    await Promise.all(tasks);
    try {
      await document.fonts.ready;
    } catch {
      // ignore — fonts.ready can reject on reload mid-update
    }
  }
}

// Same-origin fetch for the cover. Going through fetch + Blob +
// createImageBitmap avoids the canvas taint that <img> crosses origin
// with. In dev the Astro proxy serves /uploads/* without CORS headers
// so <img crossorigin> would fail — fetch() does not, because Blob +
// ImageBitmap is not a CORS-sensitive path.
async function loadCoverBitmap(url: string | null | undefined): Promise<ImageBitmap | null> {
  if (!url) return null;
  if (typeof fetch === 'undefined') return null;
  try {
    const res = await fetch(url, { credentials: 'same-origin' });
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob.type.startsWith('image/')) return null;
    return await createImageBitmap(blob);
  } catch {
    return null;
  }
}

type WrapResult = { lines: string[]; truncated: boolean };

// Word-wrap using CanvasRenderingContext2D.measureText. Honours a hard
// max-line cap and reserves the last visible slot for an ellipsis when
// truncation is required. Never breaks inside a word unless the word
// itself is wider than maxWidth (rare — only for pathological URLs).
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): WrapResult {
  const input = (text ?? '').replace(/\s+/g, ' ').trim();
  if (!input) return { lines: [], truncated: false };

  const words = input.split(' ');
  const lines: string[] = [];
  let current = '';
  let truncated = false;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const probe = current ? `${current} ${word}` : word;
    if (ctx.measureText(probe).width <= maxWidth) {
      current = probe;
      continue;
    }
    if (!current && ctx.measureText(word).width > maxWidth) {
      let chunk = '';
      for (const ch of word) {
        if (ctx.measureText(chunk + ch).width > maxWidth && chunk) {
          lines.push(chunk);
          if (lines.length >= maxLines) {
            truncated = true;
            current = '';
            break;
          }
          chunk = ch;
        } else {
          chunk += ch;
        }
      }
      if (truncated) break;
      current = chunk;
      continue;
    }
    lines.push(current);
    if (lines.length >= maxLines) {
      truncated = true;
      current = '';
      break;
    }
    current = word;
  }
  if (!truncated && current) lines.push(current);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    truncated = true;
  }
  if (truncated && lines.length) {
    const last = lines[lines.length - 1];
    let trimmed = last;
    while (trimmed && ctx.measureText(`${trimmed}…`).width > maxWidth) {
      const idx = trimmed.lastIndexOf(' ');
      if (idx <= 0) {
        trimmed = trimmed.slice(0, Math.max(0, trimmed.length - 1));
      } else {
        trimmed = trimmed.slice(0, idx);
      }
    }
    lines[lines.length - 1] = `${trimmed}…`;
  }
  return { lines, truncated };
}

// Pick the largest font from a stack that fits the text within
// [maxWidth, maxLines] without truncation. Falls back to the smallest
// size if the text genuinely cannot fit any size comfortably — wrapText
// ellipsis-truncates the last line, so the rendered title never
// overflows the card width or the line cap.
function pickFittingFontSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
  lineHeightRatio: number,
  sizes: number[],
): { size: number; lines: string[] } {
  for (const size of sizes) {
    ctx.font = `700 ${size}px ${FONT_DISPLAY_BOLD}`;
    const result = wrapText(ctx, text, maxWidth, maxLines);
    if (!result.truncated) return { size, lines: result.lines };
  }
  const last = sizes[sizes.length - 1];
  ctx.font = `700 ${last}px ${FONT_DISPLAY_BOLD}`;
  const result = wrapText(ctx, text, maxWidth, maxLines);
  return { size: last, lines: result.lines };
}

// Background. Three horizontal bands of dark wash (none of them are a
// gradient — each is a flat fillRect) sit on top of the blurred cover.
// The bands lift contrast where the foreground text needs it (above
// the card and at the card's top edge) without flattening the cover
// where it's the only element on the canvas (above the slab).
function drawCoverBackground(
  ctx: CanvasRenderingContext2D,
  cover: ImageBitmap | null,
): void {
  ctx.fillStyle = PALETTE.black;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  if (cover) {
    const { width: sw, height: sh } = cover;
    // Draw the cover to a temp canvas so we can blur + crop without
    // mutating the global ctx filter for subsequent draws.
    const off = document.createElement('canvas');
    off.width = WIDTH;
    off.height = HEIGHT;
    const offCtx = off.getContext('2d');
    if (offCtx) {
      const scale = Math.max(WIDTH / sw, HEIGHT / sh);
      const dw = sw * scale;
      const dh = sh * scale;
      const dx = (WIDTH - dw) / 2;
      const dy = (HEIGHT - dh) / 2;
      offCtx.filter = `blur(${COVER_BLUR_PX}px)`;
      offCtx.drawImage(cover, dx, dy, dw, dh);
      ctx.drawImage(off, 0, 0);
    }
  } else {
    // Editorial fallback when the note has no cover: the brand's
    // dot texture (same recipe as body::before in global.css) plus a
    // chunky red "R" anchored off-center. No fake imagery, no gradient.
    drawDotTexture(ctx, 0, 0, WIDTH, HEIGHT, 14, 'rgba(255,255,255,0.07)');
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.font = `700 900px ${FONT_DISPLAY_BOLD}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText('R', WIDTH / 2, HEIGHT * 0.28);
    ctx.restore();
  }

  // Three banded dark washes. Each is a flat fillRect, not a gradient.
  // The mid band corresponds to the card's vertical span so the card's
  // white field sits on a slightly less-darkened band (helpful for
  // perceiving the cover around the card edges).
  ctx.fillStyle = `rgba(13,13,13,${COVER_DARKEN_TOP})`;
  ctx.fillRect(0, 0, WIDTH, CARD_TOP_MIN);
  ctx.fillStyle = `rgba(13,13,13,${COVER_DARKEN_MID})`;
  ctx.fillRect(0, CARD_TOP_MIN, WIDTH, CARD_BOTTOM_MAX - CARD_TOP_MIN);
  ctx.fillStyle = `rgba(13,13,13,${COVER_DARKEN_BOTTOM})`;
  ctx.fillRect(0, CARD_BOTTOM_MAX, WIDTH, HEIGHT - CARD_BOTTOM_MAX);
}

function drawDotTexture(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  tile: number,
  color: string,
): void {
  const saved = ctx.fillStyle;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = color;
  for (let py = y - tile; py < y + h + tile; py += tile) {
    for (let px = x - tile; px < x + w + tile; px += tile) {
      ctx.beginPath();
      ctx.arc(px, py, 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
  ctx.fillStyle = saved;
}

// Single piece of red structural accent on the card — matches the
// existing .panel `box-shadow: 10px 10px 0 rgba(115,36,36,.48)`
// vocabulary but rendered as a literal 6-px left edge so it works in
// a static image (no real shadows on a flat exported PNG).
const CARD_LEFT_EDGE_W = 6;
const CARD_TOP_LEFT_CUT = 36; // .cut vocabulary from global.css (28 on site; 36 reads stronger at story scale)

type CardMeasurement = {
  cardX: number;
  cardY: number;
  cardWidth: number;
  cardHeight: number;
  contentX: number;
  contentMaxX: number;
  contentY: number;
  contentMaxY: number;
};

function paintCardShell(ctx: CanvasRenderingContext2D, m: CardMeasurement): void {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(m.cardX + CARD_TOP_LEFT_CUT, m.cardY);
  ctx.lineTo(m.cardX + m.cardWidth, m.cardY);
  ctx.lineTo(m.cardX + m.cardWidth, m.cardY + m.cardHeight);
  ctx.lineTo(m.cardX, m.cardY + m.cardHeight);
  ctx.lineTo(m.cardX, m.cardY + CARD_TOP_LEFT_CUT);
  ctx.closePath();
  ctx.fillStyle = PALETTE.white;
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(m.cardX + CARD_TOP_LEFT_CUT, m.cardY);
  ctx.lineTo(m.cardX + m.cardWidth, m.cardY);
  ctx.lineTo(m.cardX + m.cardWidth, m.cardY + m.cardHeight);
  ctx.lineTo(m.cardX, m.cardY + m.cardHeight);
  ctx.lineTo(m.cardX, m.cardY + CARD_TOP_LEFT_CUT);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = PALETTE.red;
  ctx.fillRect(m.cardX, m.cardY + CARD_TOP_LEFT_CUT, CARD_LEFT_EDGE_W, m.cardHeight - CARD_TOP_LEFT_CUT);
  ctx.restore();
}

// Layout the card content top-down. Returns the y-cursor after the
// last text block (which is the start of the footer divider).
type ContentLayout = {
  measurement: CardMeasurement;
  cursorY: number;
  hasFooter: boolean;
  footerY: number;
};

function layoutCard(
  ctx: CanvasRenderingContext2D,
  data: NoteShareData,
): ContentLayout {
  const cardX = CARD_SIDE_PADDING;
  const cardY = CARD_TOP_MIN; // top is anchored at 18% so cover reads above
  const contentX = cardX + CARD_CONTENT_PADDING_X;
  const contentMaxX = cardX + CARD_WIDTH - CARD_CONTENT_PADDING_X;

  // 1. Measure: stack the content, accumulate heights, decide the
  //    card's actual height (clamped), then re-derive the cursorY that
  //    positions everything correctly inside the (now smaller) card.

  const fontsReady = (size: number, family = FONT_DISPLAY_BOLD) => {
    ctx.font = `700 ${size}px ${family}`;
  };

  // // CATEGORY eyebrow
  fontsReady(28);
  const categoryText = (data.category || 'NOTES').toUpperCase();
  const categoryEyebrowH = 28; // single line height for the eyebrow
  let y = cardY + CARD_CONTENT_PADDING_TOP + categoryEyebrowH;

  // // READING TIME eyebrow (optional)
  const readingTime = (data.readingTime ?? '').trim();
  let readingTimeH = 0;
  if (readingTime) {
    readingTimeH = 24 + 16;
    y += readingTimeH;
  }

  // Title accent stripe
  const stripeH = 6;
  const stripeGapAfter = 24;
  y += stripeH + stripeGapAfter;

  // TITLE — auto-size, auto-wrap, with hard max line count so a long
  // title can never push the card into the Link-sticker zone.
  const titleMaxWidth = contentMaxX - contentX;
  const TITLE_MAX_LINES = 4;
  const titleSizes = [88, 76, 66, 58];
  // Max-lines caps the title so it can't push the card into the
  // Link sticker zone; wrapText ellipsis-truncates the last line if
  // the title still doesn't fit at the smallest size.
  const titlePicked = pickFittingFontSize(
    ctx,
    (data.title || '').toUpperCase(),
    titleMaxWidth,
    TITLE_MAX_LINES,
    0.96,
    titleSizes,
  );
  const titleSize = titlePicked.size;
  const titleLines = titlePicked.lines;
  const titleLineHeight = titleSize * 0.96;
  const titleH = titleLines.length * titleLineHeight;
  y += titleH;

  // EXCERPT — generous line cap; truncated with ellipsis if needed.
  const excerptMaxLines = 5;
  ctx.font = `400 26px ${FONT_SANS}`;
  const excerptH = (() => {
    const r = wrapText(ctx, data.excerpt || '', titleMaxWidth, excerptMaxLines);
    return r.lines.length * 26 * 1.5;
  })();
  const excerptGapBefore = 28;
  y += excerptGapBefore + excerptH;

  // Footer: thin divider, then a single footer line (site name, with
  // optional author/date on the right). Footer sits directly under the
  // excerpt with no spacer-driven gap so the card "hugs its content".
  const footerDividerGap = 28;
  const footerLineH = 28;
  y += footerDividerGap + footerLineH; // divider (1) + padding + footer text

  // 2. Convert content height into card height, clamped between
  //    CARD_MIN_HEIGHT and CARD_MAX_HEIGHT.
  const rawContentHeight = y - cardY;
  const desiredHeight = rawContentHeight + CARD_CONTENT_PADDING_BOTTOM;
  const cardHeight = Math.max(CARD_MIN_HEIGHT, Math.min(CARD_MAX_HEIGHT, desiredHeight));

  // If the content overflowed the max, the card simply tops out at
  // CARD_MAX_HEIGHT and the footer sits at the bottom edge. The title
  // and excerpt are guaranteed not to overflow because pickFittingFontSize
  // already enforced maxLines + measureText. The footer always fits.

  // Re-derive the inner y positions given the resolved card height.
  const innerTop = cardY + CARD_CONTENT_PADDING_TOP;
  let cursorY = innerTop;
  cursorY += categoryEyebrowH; // after category
  cursorY += readingTimeH;
  cursorY += stripeH + stripeGapAfter;

  const titleTopY = cursorY;
  cursorY += titleH;

  const excerptTopY = cursorY + excerptGapBefore;
  cursorY = excerptTopY + excerptH;

  // Footer sits at cardHeight - CARD_CONTENT_PADDING_BOTTOM - footerLineH
  // so the divider stays one constant distance from the bottom edge
  // regardless of how short the excerpt was. This is the only "design
  // constant" the card uses — and it's deliberately small so a tiny
  // note still produces a tight card.
  const footerY = cardY + cardHeight - CARD_CONTENT_PADDING_BOTTOM - footerLineH;

  const measurement: CardMeasurement = {
    cardX,
    cardY,
    cardWidth: CARD_WIDTH,
    cardHeight,
    contentX,
    contentMaxX,
    contentY: innerTop,
    contentMaxY: cardY + cardHeight - CARD_CONTENT_PADDING_BOTTOM,
  };

  return {
    measurement,
    cursorY: titleTopY,
    hasFooter: true,
    footerY,
  };
}

// Draw the resolved card. The layout step pre-measured everything so
// here we just emit fills/lines at the recorded coordinates.
function drawForegroundCard(
  ctx: CanvasRenderingContext2D,
  data: NoteShareData,
  m: ContentLayout,
): void {
  paintCardShell(ctx, m.measurement);
  const { measurement } = m;
  const { contentX, contentMaxX } = measurement;

  // // CATEGORY eyebrow — same primitive as opengraph-image.ts and the
  // .eyebrow class in global.css.
  const eyebrowY = measurement.contentY;
  ctx.fillStyle = PALETTE.red;
  ctx.font = `700 28px ${FONT_DISPLAY_BOLD}`;
  ctx.textBaseline = 'middle';
  ctx.fillText('//', contentX, eyebrowY);
  const slashWidth = ctx.measureText('// ').width;
  ctx.fillStyle = PALETTE.black;
  const categoryText = (data.category || 'NOTES').toUpperCase();
  ctx.fillText(categoryText, contentX + slashWidth, eyebrowY);

  let y = eyebrowY + 28 + 16;

  // // READING TIME (optional)
  const readingTime = (data.readingTime ?? '').trim();
  if (readingTime) {
    ctx.fillStyle = PALETTE.gray;
    ctx.font = `700 22px ${FONT_DISPLAY_BOLD}`;
    ctx.textBaseline = 'middle';
    ctx.fillText(`// ${readingTime.toUpperCase()} READ`, contentX, y);
    y += 24;
  }

  // Red title accent stripe (the existing .stripe primitive, adapted
  // to image-space — no transform).
  const stripeH = 6;
  ctx.fillStyle = PALETTE.red;
  ctx.beginPath();
  ctx.moveTo(contentX, y + stripeH / 2);
  ctx.lineTo(contentX + 180, y + stripeH / 2);
  ctx.lineTo(contentX + 180 - 18, y + stripeH / 2 + stripeH);
  ctx.lineTo(contentX, y + stripeH / 2 + stripeH);
  ctx.closePath();
  ctx.fill();
  y += stripeH + 24;

  // TITLE — re-derive text metrics now that we're rendering (cheap;
  // nothing has changed) so the title here matches the one the layout
  // step measured. We deliberately don't precompute size × line arrays
  // here — re-running the same sizing passes ~2× per render is
  // negligible on a 1080×1920 canvas.
  ctx.fillStyle = PALETTE.black;
  ctx.textBaseline = 'top';
  const titleMaxWidth = contentMaxX - contentX;
  const titlePicked = pickFittingFontSize(
    ctx,
    (data.title || '').toUpperCase(),
    titleMaxWidth,
    4,
    0.96,
    [88, 76, 66, 58],
  );
  const titleSize = titlePicked.size;
  const titleLines = titlePicked.lines;
  const titleLineHeight = titleSize * 0.96;
  ctx.font = `700 ${titleSize}px ${FONT_DISPLAY_BOLD}`;
  titleLines.forEach((line, i) => {
    ctx.fillText(line, contentX, y + i * titleLineHeight);
  });

  // EXCERPT
  const excerptTopY = y + titleLines.length * titleLineHeight + 28;
  ctx.fillStyle = '#3a3a3a';
  ctx.font = `400 26px ${FONT_SANS}`;
  const r = wrapText(ctx, data.excerpt || '', titleMaxWidth, 5);
  r.lines.forEach((line, i) => {
    ctx.fillText(line, contentX, excerptTopY + i * 26 * 1.5);
  });

  // Footer divider — thin 1px line, brand black at low opacity.
  ctx.fillStyle = 'rgba(13,13,13,0.18)';
  ctx.fillRect(contentX, m.footerY - 18, contentMaxX - contentX, 1);

  // Footer text. Site name on the left, optional author/date on the
  // right. The site name is the brand anchor (matches the OG card's
  // "RAVEDEPRINZ.ME  /  NOTES" footer and the existing note-page
  // .note-preview-url microcopy).
  ctx.textBaseline = 'middle';
  ctx.font = `700 18px ${FONT_DISPLAY_BOLD}`;
  ctx.fillStyle = PALETTE.black;
  ctx.fillText(
    (data.siteName || 'RAVEDEPRINZ.ME').toUpperCase(),
    contentX,
    m.footerY + 6,
  );

  const rightBits = [data.author?.trim(), data.publishedAt?.trim()].filter(Boolean);
  if (rightBits.length) {
    ctx.font = `400 18px ${FONT_SANS}`;
    ctx.fillStyle = PALETTE.gray;
    const rightText = rightBits.join(' · ');
    const rw = ctx.measureText(rightText).width;
    ctx.fillText(rightText, contentMaxX - rw, m.footerY + 6);
  }
}

// Generates the story image. The heavy lifting (font loading, cover
// bitmap) happens here so the caller (shareNote.ts) only sees a single
// Blob. Runs only when the user taps share — never on page load.
export async function generateNoteStoryBlob(data: NoteShareData): Promise<Blob> {
  if (typeof document === 'undefined') {
    throw new Error('generateNoteStoryBlob must run in the browser');
  }
  await loadBrandFonts();

  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D not available');

  const cover = await loadCoverBitmap(data.coverImage || null);

  drawCoverBackground(ctx, cover);
  const layout = layoutCard(ctx, data);
  drawForegroundCard(ctx, data, layout);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas toBlob returned null'));
    }, 'image/png');
  });
}
