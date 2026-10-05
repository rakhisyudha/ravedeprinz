/**
 * @vitest-environment jsdom
 */
import { describe, expect, test } from 'vitest';
import fc from 'fast-check';
import {
  RSS_ITEM_LIMIT,
  buildRssXml,
  escapeAttr,
  escapeText,
  stripInvalidXmlChars,
  toRfc822,
} from '../../src/lib/rss';
import type { Note } from '../../src/lib/cms';

// Feature: notes-reading-tools, Property 4: The feed is always well-formed XML
// Feature: notes-reading-tools, Property 5: Feed items match the reference model
// Feature: notes-reading-tools, Property 6: Dates appear only when they are real

const SITE = 'https://ravedeprinz.me';
const NOW = new Date('2026-10-05T12:00:00.000Z');

const DATES = [
  null,
  undefined,
  '',
  'not-a-date',
  '2020-01-01T00:00:00.000Z',
  '2024-06-06T06:06:06.000Z',
  '2026-12-31T23:59:59.000Z',
] as const;

/** Text with every awkward character: markup, control characters, lone surrogates. */
const arbText = fc.string({ unit: 'binary', minLength: 0, maxLength: 30 });

const arbNote = fc.record({
  id: fc.option(fc.uuid(), { nil: undefined }),
  // Few distinct slugs, so duplicates and blanks are common rather than rare.
  slug: fc.constantFrom('a', 'b', 'c', ' a ', 'd e', '', '   '),
  title: arbText,
  body: arbText,
  tag: fc.oneof(arbText, fc.constantFrom('REFLECTION', 'LOG', '')),
  author: fc.option(arbText, { nil: null }),
  subtitle: fc.option(arbText, { nil: null }),
  published: fc.constantFrom(true, true, true, false, undefined, null),
  published_at: fc.constantFrom(...DATES),
  created_at: fc.constantFrom(...DATES),
}) as fc.Arbitrary<Note>;

const arbNotes = fc.array(arbNote, { minLength: 0, maxLength: 12 });

function parse(xml: string): Document {
  return new DOMParser().parseFromString(xml, 'application/xml');
}

function items(doc: Document): Element[] {
  return [...doc.getElementsByTagName('item')];
}

const text = (el: Element, name: string): string | null =>
  el.getElementsByTagName(name)[0]?.textContent ?? null;

/** Independent of the implementation: drop what XML 1.0 forbids, by code point. */
function refStrip(value: string): string {
  let out = '';
  for (const ch of value) {
    const c = ch.codePointAt(0)!;
    const bad = (c < 0x20 && c !== 9 && c !== 10 && c !== 13) || (c >= 0xd800 && c <= 0xdfff) || c === 0xfffe || c === 0xffff;
    if (!bad) out += ch;
  }
  return out;
}

function time(value?: string | null): number {
  if (!value) return Number.NEGATIVE_INFINITY;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
}

/** The expected links, written out longhand from the requirements. */
function referenceLinks(notes: Note[]): string[] {
  const sorted = notes
    .filter((n) => n.published !== false)
    .map((note, index) => ({ note, index }))
    .sort((a, b) => {
      const byPublished = time(b.note.published_at) - time(a.note.published_at);
      if (byPublished !== 0) return byPublished;
      const byCreated = time(b.note.created_at) - time(a.note.created_at);
      if (byCreated !== 0) return byCreated;
      return a.index - b.index;
    })
    .map((entry) => entry.note);
  const seen = new Set<string>();
  const links: string[] = [];
  for (const note of sorted) {
    const key = refStrip(note.slug?.trim() || note.id || '');
    if (!key || seen.has(key)) continue;
    seen.add(key);
    links.push(`${SITE}/notes/${encodeURIComponent(key)}`);
  }
  return links.slice(0, RSS_ITEM_LIMIT);
}

describe('Property 4: the feed is always well-formed XML', () => {
  test('any notes, including control characters and markup, parse without error', () => {
    fc.assert(
      fc.property(arbNotes, (notes) => {
        const doc = parse(buildRssXml({ site: SITE, now: NOW, notes }));
        expect(doc.getElementsByTagName('parsererror')).toHaveLength(0);
        expect(doc.documentElement.nodeName).toBe('rss');
      }),
      { numRuns: 300 },
    );
  });

  test('the parse check is not vacuous: malformed XML and a raw control character are caught', () => {
    expect(parse('<rss><channel></rss>').getElementsByTagName('parsererror').length).toBeGreaterThan(0);
    expect(parse('<rss>\u0001</rss>').getElementsByTagName('parsererror').length).toBeGreaterThan(0);
  });

  test('a site URL containing & or a quote is escaped too', () => {
    const doc = parse(buildRssXml({ site: 'https://a&b.example/"x"', now: NOW, notes: [] }));
    expect(doc.getElementsByTagName('parsererror')).toHaveLength(0);
    expect(doc.getElementsByTagName('atom:link')[0]?.getAttribute('href')).toBe('https://a&b.example/"x"/rss.xml');
  });

  test('the channel has the fields a reader needs', () => {
    const doc = parse(buildRssXml({ site: `${SITE}/`, now: NOW, notes: [] }));
    const channel = doc.getElementsByTagName('channel')[0]!;
    expect(text(channel, 'title')).toBe('ravedeprinz // Notes');
    expect(channel.getElementsByTagName('link')[0]?.textContent).toBe(`${SITE}/notes`);
    expect(text(channel, 'language')).toBe('en');
    const self = doc.getElementsByTagName('atom:link')[0]!;
    expect(self.getAttribute('rel')).toBe('self');
    expect(self.getAttribute('type')).toBe('application/rss+xml');
    expect(self.getAttribute('href')).toBe(`${SITE}/rss.xml`);
    expect(items(doc)).toHaveLength(0);
    // With no dated item the build time stands in, as a valid RFC 822 date.
    expect(text(channel, 'lastBuildDate')).toBe(NOW.toUTCString());
  });

  test('text survives escaping: the parsed title is the original minus forbidden characters', () => {
    fc.assert(
      fc.property(arbText, (title) => {
        const note = { title, slug: 'only', body: '', tag: 'T', published: true } as Note;
        const doc = parse(buildRssXml({ site: SITE, now: NOW, notes: [note] }));
        const expected = refStrip(title).trim() || 'only';
        expect(text(items(doc)[0]!, 'title')).toBe(expected);
      }),
      { numRuns: 300 },
    );
  });

  test('no forbidden character ever reaches the output', () => {
    fc.assert(
      fc.property(arbText, (value) => {
        expect(stripInvalidXmlChars(value)).toBe(refStrip(value));
        expect(escapeText(value)).toBe(escapeText(refStrip(value)));
        expect(escapeAttr(value)).not.toContain('"');
        expect(escapeText(value)).not.toMatch(/[<>]/);
      }),
      { numRuns: 400 },
    );
  });

  test('a carriage return is kept as a character reference so it round-trips', () => {
    const note = { title: 'a\r\nb', slug: 's', body: '', tag: 'T' } as Note;
    const doc = parse(buildRssXml({ site: SITE, now: NOW, notes: [note] }));
    expect(text(items(doc)[0]!, 'title')).toBe('a\r\nb');
  });
});

describe('Property 5: feed items match the reference model', () => {
  test('the links equal the reference: published only, newest first, unique, capped', () => {
    fc.assert(
      fc.property(arbNotes, (notes) => {
        const links = items(parse(buildRssXml({ site: SITE, now: NOW, notes }))).map((item) => text(item, 'link'));
        expect(links).toEqual(referenceLinks(notes));
        expect(new Set(links).size).toBe(links.length);
      }),
      { numRuns: 300 },
    );
  });

  test('guid is the same permalink as link', () => {
    fc.assert(
      fc.property(arbNotes, (notes) => {
        for (const item of items(parse(buildRssXml({ site: SITE, now: NOW, notes })))) {
          const guid = item.getElementsByTagName('guid')[0]!;
          expect(guid.getAttribute('isPermaLink')).toBe('true');
          expect(guid.textContent).toBe(text(item, 'link'));
        }
      }),
      { numRuns: 200 },
    );
  });

  test('only the newest RSS_ITEM_LIMIT notes are included when there are more', () => {
    const notes = Array.from({ length: 40 }, (_, i) => ({
      title: `Note ${i}`,
      slug: `n${i}`,
      body: '',
      tag: 'T',
      published: true,
      // n39 is the newest.
      published_at: new Date(Date.UTC(2026, 0, 1 + i)).toISOString(),
    })) as Note[];
    const links = items(parse(buildRssXml({ site: SITE, now: NOW, notes }))).map((item) => text(item, 'link'));
    expect(links).toHaveLength(RSS_ITEM_LIMIT);
    expect(links[0]).toBe(`${SITE}/notes/n39`);
    expect(links[RSS_ITEM_LIMIT - 1]).toBe(`${SITE}/notes/n${40 - RSS_ITEM_LIMIT}`);
  });

  test('tag, author and excerpt appear when present and are omitted when blank', () => {
    const full = {
      title: 'Full',
      slug: 'full',
      body: 'Some **body** text that is long enough to be a teaser.',
      tag: 'REFLECTION',
      author: 'Rakhis',
      published: true,
    } as Note;
    const bare = { title: 'Bare', slug: 'bare', body: '', tag: '  ', author: null, subtitle: null, published: true } as Note;
    const [first, second] = items(parse(buildRssXml({ site: SITE, now: NOW, notes: [full, bare] })));
    expect(text(first!, 'category')).toBe('REFLECTION');
    expect(text(first!, 'dc:creator')).toBe('Rakhis');
    expect(text(first!, 'description')).toContain('body');
    expect(text(second!, 'category')).toBeNull();
    expect(text(second!, 'dc:creator')).toBeNull();
    expect(text(second!, 'description')).toBeNull();
  });

  test('a note with several tags gets one category per tag, in order, normalized', () => {
    const note = {
      title: 'Multi',
      slug: 'multi',
      body: '',
      tag: 'memoir',
      tags: ['memoir', ' Dev   Log ', 'reflection'],
      published: true,
    } as Note;
    const [item] = items(parse(buildRssXml({ site: SITE, now: NOW, notes: [note] })));
    const categories = [...item!.getElementsByTagName('category')].map((el) => el.textContent);
    expect(categories).toEqual(['MEMOIR', 'DEV LOG', 'REFLECTION']);
  });

  test('a note that only has the single tag still gets exactly one category', () => {
    const note = { title: 'Old', slug: 'old', body: '', tag: 'log', published: true } as Note;
    const [item] = items(parse(buildRssXml({ site: SITE, now: NOW, notes: [note] })));
    expect([...item!.getElementsByTagName('category')].map((el) => el.textContent)).toEqual(['LOG']);
  });

  test('categories never repeat and never exceed the note tag list, whatever the text', () => {
    fc.assert(
      fc.property(fc.array(arbText, { maxLength: 5 }), (tags) => {
        const note = { title: 'T', slug: 't', body: '', tag: 'X', tags, published: true } as Note;
        const doc = parse(buildRssXml({ site: SITE, now: NOW, notes: [note] }));
        expect(doc.getElementsByTagName('parsererror')).toHaveLength(0);
        const categories = [...doc.getElementsByTagName('category')].map((el) => el.textContent);
        expect(new Set(categories).size).toBe(categories.length);
        for (const category of categories) expect(category).toBe(category!.replace(/\s+/g, ' ').trim());
      }),
      { numRuns: 200 },
    );
  });
  test('an unpublished note never appears, whatever its date', () => {
    const draft = { title: 'Draft', slug: 'draft', body: '', tag: 'T', published: false, published_at: '2026-12-31T00:00:00.000Z' } as Note;
    const xml = buildRssXml({ site: SITE, now: NOW, notes: [draft] });
    expect(xml).not.toContain('/notes/draft');
    expect(items(parse(xml))).toHaveLength(0);
  });
});

describe('Property 6: dates appear only when they are real', () => {
  test('pubDate is present exactly when a date parses, and names the same second', () => {
    fc.assert(
      fc.property(fc.constantFrom(...DATES), fc.constantFrom(...DATES), (publishedAt, createdAt) => {
        const note = { title: 'N', slug: 'n', body: '', tag: 'T', published_at: publishedAt, created_at: createdAt } as Note;
        const item = items(parse(buildRssXml({ site: SITE, now: NOW, notes: [note] })))[0]!;
        const pubDate = text(item, 'pubDate');
        const source = [publishedAt, createdAt].find((value) => typeof value === 'string' && !Number.isNaN(Date.parse(value)));
        if (source === undefined) {
          expect(pubDate).toBeNull();
          return;
        }
        expect(pubDate).not.toBeNull();
        expect(Date.parse(pubDate!)).toBe(Math.floor(Date.parse(source) / 1000) * 1000);
      }),
      { numRuns: 200 },
    );
  });

  test('toRfc822 is an RFC 822 date for real timestamps and null otherwise', () => {
    fc.assert(
      fc.property(fc.date({ min: new Date('1990-01-01'), max: new Date('2100-01-01'), noInvalidDate: true }), (date) => {
        const value = toRfc822(date.toISOString());
        expect(value).toMatch(/^[A-Z][a-z]{2}, \d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} GMT$/);
        expect(Date.parse(value!)).toBe(Math.floor(date.getTime() / 1000) * 1000);
      }),
      { numRuns: 200 },
    );
    for (const bad of [null, undefined, '', 'not-a-date']) expect(toRfc822(bad)).toBeNull();
  });

  test('lastBuildDate is the newest item date, not the request time', () => {
    const notes = [
      { title: 'Old', slug: 'old', body: '', tag: 'T', published_at: '2024-06-06T06:06:06.000Z' },
      { title: 'New', slug: 'new', body: '', tag: 'T', published_at: '2026-12-31T23:59:59.000Z' },
    ] as Note[];
    const doc = parse(buildRssXml({ site: SITE, now: NOW, notes }));
    expect(text(doc.getElementsByTagName('channel')[0]!, 'lastBuildDate')).toBe('Thu, 31 Dec 2026 23:59:59 GMT');
  });
});
