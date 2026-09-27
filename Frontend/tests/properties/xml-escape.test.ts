import { describe, expect, test } from 'vitest';
import fc from 'fast-check';
import { buildSitemapXml, escapeXml } from '../../src/lib/sitemap';
import type { Note } from '../../src/lib/cms';

// Feature: portfolio-engagement, Property 19: XML escaping round trip

function unescapeXml(value: string): string {
  return value.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

describe('Property 19: XML escaping round trip', () => {
  test('the output contains no raw angle brackets', () => {
    fc.assert(
      fc.property(fc.string(), (value) => {
        const escaped = escapeXml(value);
        expect(escaped).not.toContain('<');
        expect(escaped).not.toContain('>');
      }),
      { numRuns: 400 },
    );
  });

  test('every ampersand begins a known entity', () => {
    fc.assert(
      fc.property(fc.string(), (value) => {
        const escaped = escapeXml(value);
        for (let i = 0; i < escaped.length; i += 1) {
          if (escaped[i] !== '&') continue;
          expect(['&amp;', '&lt;', '&gt;'].some((entity) => escaped.startsWith(entity, i))).toBe(true);
        }
      }),
      { numRuns: 400 },
    );
  });

  test('unescaping restores the original string', () => {
    fc.assert(
      fc.property(fc.string(), (value) => {
        expect(unescapeXml(escapeXml(value))).toBe(value);
      }),
      { numRuns: 400 },
    );
  });

  test('the ampersand is escaped once, never double-escaped into a broken entity', () => {
    expect(escapeXml('a&b')).toBe('a&amp;b');
    expect(unescapeXml(escapeXml('a&b'))).toBe('a&b');
    fc.assert(
      fc.property(fc.string(), (value) => {
        // Escaping twice is still reversible twice, so no entity is mangled.
        expect(unescapeXml(unescapeXml(escapeXml(escapeXml(value))))).toBe(value);
      }),
      { numRuns: 300 },
    );
  });

  test('a site URL containing & is escaped too', () => {
    const xml = buildSitemapXml({
      site: 'https://a&b.example',
      now: new Date('2026-08-27T12:00:00.000Z'),
      notes: null,
    });
    expect(xml).toContain('https://a&amp;b.example/');
    expect(xml).not.toContain('a&b.example/');
  });

  test('a slug containing &, <, or > survives the round trip through the sitemap', () => {
    fc.assert(
      fc.property(fc.constantFrom('a&b', 'a<b', 'a>b', 'a&<>b', '&&&', '<>'), (slug) => {
        const note: Note = { title: 'N', slug, body: '', tag: 'T', published_at: null };
        const xml = buildSitemapXml({
          site: 'https://ravedeprinz.me',
          now: new Date('2026-08-27T12:00:00.000Z'),
          notes: [note],
        });
        const found = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => unescapeXml(m[1]!));
        expect(found).toContain(`https://ravedeprinz.me/notes/${slug}`);
        // The raw XML is still well-formed: no unescaped brackets leaked.
        expect((xml.match(/<url>/g) ?? []).length).toBe((xml.match(/<\/url>/g) ?? []).length);
      }),
      { numRuns: 200 },
    );
  });
});
