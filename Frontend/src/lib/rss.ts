// RSS 2.0 feed assembly for the notes. Pure, like lib/sitemap.ts, so the
// entry set, the ordering and the escaping can be property-tested without
// HTTP or a CMS; pages/rss.xml.ts only supplies the inputs.

import type { Note } from './cms';
import { sortNewestFirst } from './notesPreview';
import { noteTagList } from './noteTags';
import { cleanDescription } from './seo';
import { escapeXml } from './sitemap';

/** Items in the feed. Enough for a reader to catch up, small enough to stay light. */
export const RSS_ITEM_LIMIT = 20;

/** Excerpt length. The feed carries a teaser and a link, not the full note. */
export const RSS_EXCERPT_MAX = 300;

export const RSS_TITLE = 'ravedeprinz // Notes';
export const RSS_DESCRIPTION =
  'Short transmissions from the workbench. Mostly unfinished thoughts, left legible on purpose.';

// Characters XML 1.0 cannot carry at all, not even as a character reference:
// C0 controls other than tab/LF/CR, U+FFFE/U+FFFF, and lone surrogates. One
// pasted control character in a note would otherwise make the whole feed
// unparseable, and readers then drop every item, not just the bad one.
const INVALID_XML_CHARS =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

export function stripInvalidXmlChars(value: string): string {
  return value.replace(INVALID_XML_CHARS, '');
}

/**
 * Element text: invalid characters removed, then &, < and > escaped. A carriage
 * return becomes a character reference, because a parser would otherwise
 * normalize it to a line feed and the text would not round-trip.
 */
export function escapeText(value: string): string {
  return escapeXml(stripInvalidXmlChars(value)).replace(/\r/g, '&#13;');
}

/** Attribute value: everything escapeText does, plus the quote that delimits it. */
export function escapeAttr(value: string): string {
  return escapeText(value).replace(/"/g, '&quot;').replace(/\n/g, '&#10;').replace(/\t/g, '&#9;');
}

/**
 * An RFC 822 date (the format RSS 2.0 requires) for a parseable timestamp, or
 * null for anything else. Null is deliberate: an item with no pubDate is valid,
 * whereas inventing one makes readers treat the item as new on every poll.
 */
export function toRfc822(value: string | null | undefined): string | null {
  if (typeof value !== 'string' || value === '') return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toUTCString();
}

function itemDate(note: Note): string | null {
  // Same precedence as the sort: published_at first, created_at as the fallback.
  return toRfc822(note.published_at) ?? toRfc822(note.created_at);
}

export type RssInput = {
  site: string;
  now: Date;
  notes: Note[];
};

/**
 * One <item> per published note, newest first, at most RSS_ITEM_LIMIT. Links
 * follow the sitemap's rule (stored slug, else id) and are deduplicated, so a
 * note can never appear twice and never links somewhere the sitemap does not.
 */
export function buildRssXml({ site, now, notes }: RssInput): string {
  const base = site.replace(/\/$/, '');

  const seen = new Set<string>();
  const items: string[] = [];
  let newest: string | null = null;

  for (const note of sortNewestFirst(notes.filter((n) => n.published !== false))) {
    if (items.length >= RSS_ITEM_LIMIT) break;
    const key = stripInvalidXmlChars(note.slug?.trim() || note.id || '');
    if (!key || seen.has(key)) continue;
    seen.add(key);

    const link = `${base}/notes/${encodeURIComponent(key)}`;
    const date = itemDate(note);
    newest ??= date;
    const title = stripInvalidXmlChars(note.title ?? '').trim() || key;
    const excerpt = cleanDescription(note.body, note.subtitle, RSS_EXCERPT_MAX);
    const tags = noteTagList(note);
    const author = note.author?.trim();

    items.push(
      [
        '    <item>',
        `      <title>${escapeText(title)}</title>`,
        `      <link>${escapeText(link)}</link>`,
        `      <guid isPermaLink="true">${escapeText(link)}</guid>`,
        date ? `      <pubDate>${date}</pubDate>` : null,
        // One <category> per tag, which is how RSS 2.0 expresses several.
        ...tags.map((tag) => `      <category>${escapeText(tag)}</category>`),
        author ? `      <dc:creator>${escapeText(author)}</dc:creator>` : null,
        excerpt ? `      <description>${escapeText(excerpt)}</description>` : null,
        '    </item>',
      ]
        .filter((line): line is string => line !== null)
        .join('\n'),
    );
  }

  const channel = [
    `    <title>${escapeText(RSS_TITLE)}</title>`,
    `    <link>${escapeText(`${base}/notes`)}</link>`,
    `    <description>${escapeText(RSS_DESCRIPTION)}</description>`,
    '    <language>en</language>',
    `    <lastBuildDate>${newest ?? now.toUTCString()}</lastBuildDate>`,
    `    <atom:link href="${escapeAttr(`${base}/rss.xml`)}" rel="self" type="application/rss+xml" />`,
    ...items,
  ].join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">\n  <channel>\n${channel}\n  </channel>\n</rss>\n`;
}
