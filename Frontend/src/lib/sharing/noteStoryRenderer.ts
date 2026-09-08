// Story image renderer for an article from ravedeprinz.
//
// Output: 1080x1920 PNG Blob, local to the device, generated only when the
// user taps share. Same Canvas 2D primitive the rest of the web already
// uses — no new dependencies.
//
// Compositional principle (carried over from opengraph-image.ts and the
// .note-preview on-page card): the cover artwork fills the canvas and is
// darkened for readable foreground; the white reading card sits in the
// lower portion of the frame, asymmetrically clipped on the top-left;
// the title is the anchor; the excerpt breathes underneath; the site
// name closes the bottom. Red is a single structural accent (the title
// stripe), the rest of the composition is type and whitespace.

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

// The brand palette. Mirrors --black/--red/--dark-red/--gray/--white in
// global.css. Defined here as constants because Canvas 2D cannot read
// CSS custom properties.
const PALETTE = {
  black: '#0d0d0d',
  red: '#d92323',
  darkRed: '#732424',
  gray: '#7b7b7b',
  white: '#ffffff',
  muted: '#a8a8a8',
} as const;

const WIDTH = 1080;
const HEIGHT = 1920;
// The composition: the cover artwork fills the entire 1080x1920 frame
// under a flat dark wash, and the white reading card occupies the
// lower ~72% of the canvas, leaving the upper ~28% as a "artwork
// slab" where the cropped cover reads as the article's atmosphere.
// Asymmetric in the sense that the card's top-left corner is clipped
// (the .cut vocabulary from global.css) so the card slides under the
// wash rather than floating flat.
const CARD_HORIZONTAL_PADDING = 56;
const CARD_TOP_PADDING = 96;
const CARD_BOTTOM_PADDING = 88;
const CARD_TOP_OFFSET = Math.round(HEIGHT * 0.28); // y where the card's flat top sits (background visible above)
const CARD_BOTTOM_PADDING_VERTICAL = 56;

// Typography. Rodin Pro M/B are the only OTFs the project self-hosts
// and therefore the only webfonts we can reliably embed in the canvas.
// Space Grotesk isn't self-hosted anywhere in the project, so we let
// it fall through to system sans (same pattern the OG card uses for
// body copy and the way .mono already works in global.css).
const FONT_DISPLAY_BOLD = `'Rodin Pro', 'Space Grotesk', system-ui, sans-serif`;
const FONT_SANS = `'Space Grotesk', system-ui, sans-serif`;

// Font URLs available same-origin. Reused by both the page chrome
// (global.css @font-face) and this renderer.
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
      // FontFace API unavailable (very old browsers). The renderer
      // silently falls through to the system sans stack.
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

// Same-origin fetch for the cover. Going through fetch + Blob + createImageBitmap
// avoids the canvas taint that <img> crosses origin with. In dev the
// Astro proxy serves /uploads/* without CORS headers so <img crossorigin>
// would fail — fetch() does not, because Blob/ImageBitmap is not a CORS-
// sensitive path.
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

// Word-wrap using CanvasRenderingContext2D.measureText. Honours an
// optional max-line cap and reserves the last visible slot for an
// ellipsis when truncation is required.
type WrapResult = { lines: string[]; truncated: boolean };

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
    // Word itself wider than maxWidth: hard-break inside the word.
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
    // Drop the trailing word if it overflows with the ellipsis.
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

// Pick the largest font size from a stack that fits a piece of text
// within [maxWidth, maxLines] without truncation.
function pickFittingFontSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxHeight: number,
  lineHeightRatio: number,
  sizes: number[],
): { size: number; lines: string[] } {
  for (const size of sizes) {
    ctx.font = `700 ${size}px ${FONT_DISPLAY_BOLD}`;
    const result = wrapText(ctx, text, maxWidth, 9999);
    const totalHeight = result.lines.length * size * lineHeightRatio;
    // Pick the first size where the body comfortably fits.
    if (totalHeight <= maxHeight && result.lines.every((l) => ctx.measureText(l).width <= maxWidth)) {
      return { size, lines: result.lines };
    }
  }
  const last = sizes[sizes.length - 1];
  ctx.font = `700 ${last}px ${FONT_DISPLAY_BOLD}`;
  const result = wrapText(ctx, text, maxWidth, Math.max(1, Math.floor(maxHeight / (last * lineHeightRatio))));
  return { size: last, lines: result.lines };
}

// Background layer that fills the canvas with the cover. Matches the
// existing .note-preview-image style (object-fit: cover, centered crop)
// and adds the site's standard 60% dark wash so the foreground card
// stays legible on any cover.
function drawCoverBackground(
  ctx: CanvasRenderingContext2D,
  cover: ImageBitmap | null,
): void {
  ctx.fillStyle = PALETTE.black;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  if (cover) {
    const { width: sw, height: sh } = cover;
    const scale = Math.max(WIDTH / sw, HEIGHT / sh);
    const dw = sw * scale;
    const dh = sh * scale;
    const dx = (WIDTH - dw) / 2;
    const dy = (HEIGHT - dh) / 2;
    ctx.drawImage(cover, dx, dy, dw, dh);
  } else {
    // Editorial fallback when the note has no cover: the brand's
    // 7px dot texture (same recipe as body::before in global.css)
    // scaled up for the story canvas, plus a chunky red "R" anchored
    // off-center. No fake imagery, no gradient.
    drawDotTexture(ctx, 0, 0, WIDTH, HEIGHT, 14, 'rgba(255,255,255,0.07)');
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.font = `700 ${900}px ${FONT_DISPLAY_BOLD}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText('R', WIDTH / 2, HEIGHT * 0.28);
    ctx.restore();
  }

  // Dark wash. A single flat layer (no gradient) at 0.35 of the brand
  // black lets the cover breathe in the upper slab while still giving
  // the white card enough contrast when it sits on top. The heavier
  // 0.65 wash is reserved for the visible upper strip so the crop
  // reads as the site's atmospheric black/red artwork rather than
  // a generic dark photo.
  ctx.fillStyle = 'rgba(13,13,13,0.65)';
  ctx.fillRect(0, 0, WIDTH, CARD_TOP_OFFSET);
  ctx.fillStyle = 'rgba(13,13,13,0.35)';
  ctx.fillRect(0, CARD_TOP_OFFSET, WIDTH, HEIGHT - CARD_TOP_OFFSET);
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

// The white reading card. Anchored to the lower portion of the canvas
// with asymmetric padding — same anti-centered framing the on-page
// .note-preview uses — and given a clipped top-left corner (the .cut
// vocabulary from global.css) so the card visually slides under the
// background instead of floating in it.
function drawForegroundCard(
  ctx: CanvasRenderingContext2D,
  data: NoteShareData,
): void {
  const cardX = CARD_HORIZONTAL_PADDING;
  const cardY = CARD_TOP_OFFSET; // card's flat top — above this, the cover slab shows through
  const cardWidth = WIDTH - CARD_HORIZONTAL_PADDING * 2;
  const cardHeight = HEIGHT - cardY - CARD_BOTTOM_PADDING_VERTICAL;

  const cut = 36; // top-left clip — same vocabulary as .cut (.cut uses 28px on the site)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cardX + cut, cardY);
  ctx.lineTo(cardX + cardWidth, cardY);
  ctx.lineTo(cardX + cardWidth, cardY + cardHeight);
  ctx.lineTo(cardX, cardY + cardHeight);
  ctx.lineTo(cardX, cardY + cut);
  ctx.closePath();
  ctx.fillStyle = PALETTE.white;
  ctx.fill();

  // 6px red left edge — the single structural accent on the card.
  // Matches the .panel `box-shadow: 10px 10px 0 rgba(115,36,36,.48)`
  // idea in miniature, but rendered as a literal edge instead of
  // shadow so it works on a static image.
  ctx.fillStyle = PALETTE.red;
  ctx.fillRect(cardX, cardY + cut, 6, cardHeight - cut);

  ctx.restore();

  // Card content layout. The same content stack opens with a small
  // // CATEGORY eyebrow (matching the OG card eyebrow in
  // opengraph-image.ts), then the reading time, then the title
  // anchor, then the excerpt, then the footer site-name + author.
  const contentX = cardX + 64; // inner indent beyond the red edge
  const contentMaxX = cardX + cardWidth - 56;
  let cursorY = cardY + CARD_TOP_PADDING;
  const safeMaxY = cardY + cardHeight - CARD_BOTTOM_PADDING;

  const mid = (text: string, x: number, y: number) => {
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
  };

  // // CATEGORY eyebrow
  ctx.fillStyle = PALETTE.red;
  ctx.font = `700 26px ${FONT_DISPLAY_BOLD}`;
  mid(`//`, contentX, cursorY + 14);
  ctx.fillStyle = PALETTE.black;
  ctx.font = `700 26px ${FONT_DISPLAY_BOLD}`;
  const categoryText = (data.category || 'NOTES').toUpperCase();
  mid(categoryText, contentX + ctx.measureText('// ').width, cursorY + 14);
  cursorY += 28 + 24;

  // Reading time (optional). The page passes a plain "03 MIN" string;
  // the renderer composes the on-card label so the textual treatment
  // stays consistent if the source format ever changes.
  const readingTime = (data.readingTime ?? '').trim();
  if (readingTime) {
    ctx.fillStyle = PALETTE.gray;
    ctx.font = `700 22px ${FONT_DISPLAY_BOLD}`;
    mid(`// ${readingTime.toUpperCase()} READ`, contentX, cursorY + 12);
    cursorY += 24 + 20;
  }

  // Red title accent stripe. Sits just above the title and matches the
  // existing .stripe primitive (`height:2px; background:var(--red);
  // transform:skewX(-30deg)`).
  const stripeH = 6;
  ctx.fillStyle = PALETTE.red;
  ctx.beginPath();
  ctx.moveTo(contentX, cursorY + stripeH / 2);
  ctx.lineTo(contentX + 220, cursorY + stripeH / 2);
  ctx.lineTo(contentX + 220 - 18, cursorY + stripeH / 2 + stripeH);
  ctx.lineTo(contentX, cursorY + stripeH / 2 + stripeH);
  ctx.closePath();
  ctx.fill();
  cursorY += stripeH + 26;

  // Title — pick a font size that fits, then wrap to the available height.
  const titleMaxWidth = contentMaxX - contentX;
  const titleHeightBudget = Math.min(620, safeMaxY - cursorY - 80);
  const titlePicked = pickFittingFontSize(
    ctx,
    (data.title || '').toUpperCase(),
    titleMaxWidth,
    titleHeightBudget,
    0.96,
    [96, 84, 72, 64],
  );
  const titleSize = titlePicked.size;
  const titleLines = titlePicked.lines;
  const titleLineHeight = titleSize * 0.96;
  ctx.fillStyle = PALETTE.black;
  ctx.font = `700 ${titleSize}px ${FONT_DISPLAY_BOLD}`;
  ctx.textBaseline = 'top';
  titleLines.forEach((line, i) => {
    ctx.fillText(line, contentX, cursorY + i * titleLineHeight);
  });
  cursorY += titleLines.length * titleLineHeight + 28;

  // Excerpt — sans serif, generous leading, gray for editorial weight.
  const excerptMaxHeight = Math.min(360, safeMaxY - cursorY - 200);
  const excerptMaxLines = Math.max(3, Math.floor(excerptMaxHeight / (30 * 1.5)));
  ctx.fillStyle = '#3a3a3a';
  ctx.font = `400 30px ${FONT_SANS}`;
  const excerpt = wrapText(ctx, data.excerpt || '', contentMaxX - contentX, excerptMaxLines);
  const excerptLineHeight = 30 * 1.5;
  excerpt.lines.forEach((line, i) => {
    ctx.fillText(line, contentX, cursorY + i * excerptLineHeight);
  });
  cursorY += excerpt.lines.length * excerptLineHeight;

  // Spacer pushes the footer row down to the bottom of the card.
  const spacer = Math.max(40, safeMaxY - cursorY - 80);
  cursorY += spacer;

  // Divider above the footer.
  ctx.fillStyle = 'rgba(13,13,13,0.18)';
  ctx.fillRect(contentX, cursorY, contentMaxX - contentX, 1);
  cursorY += 24;

  // Footer: site name on the left, author/date on the right.
  ctx.textBaseline = 'middle';
  ctx.font = `700 18px ${FONT_DISPLAY_BOLD}`;
  ctx.fillStyle = PALETTE.black;
  mid((data.siteName || 'RAVEDEPRINZ.ME').toUpperCase(), contentX, cursorY + 12);

  const rightBits = [data.author?.trim(), data.publishedAt?.trim()].filter(Boolean);
  if (rightBits.length) {
    ctx.font = `400 18px ${FONT_SANS}`;
    ctx.fillStyle = PALETTE.gray;
    const rightText = rightBits.join(' · ');
    const rw = ctx.measureText(rightText).width;
    ctx.fillText(rightText, contentMaxX - rw, cursorY + 12);
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
  drawForegroundCard(ctx, data);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas toBlob returned null'));
    }, 'image/png');
  });
}
