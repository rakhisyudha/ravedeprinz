import { describe, expect, test } from 'vitest';
import fc from 'fast-check';
import { buildSitemapXml, safeDate } from '../../src/lib/sitemap';
import type { Note } from '../../src/lib/cms';
import { arbNote } from './arbitraries';

// Feature: portfolio-engagement, Property 18: Sitemap lastmod
const asNote = arbNote as fc.Arbitrary<Note>;

const NOW = new Date('2026-08-27T12:00:00.000Z');

describe('Property 18: sitemap lastmod', () => {
  test('a parseable date is used verbatim, as an ISO 8601 UTC string', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 2_000_000_000 }).map((s) => new Date(s * 1000).toISOString()),
        (value) => {
          expect(safeDate(value, NOW)).toBe(new Date(value).toISOString());
        },
      ),
      { numRuns: 300 },
    );
  });

  test('an unparseable or missing value falls back to the request time', () => {
    fc.assert(
      fc.property(
        fc.option(
          fc.oneof(
            fc.constant(''),
            fc.constant('   '),
            fc.constant('not-a-date'),
            fc.constant('yesterday'),
            fc.constant('2026-13-45T99:99:99Z'),
          ),
          { nil: null },
        ),
        (value) => {
          expect(safeDate(value, NOW)).toBe(NOW.toISOString());
        },
      ),
      { numRuns: 300 },
    );
  });

  test('the fallback is exactly the request time, not the current clock', () => {
    const other = new Date('1999-12-31T23:59:59.000Z');
    expect(safeDate(undefined, other)).toBe('1999-12-31T23:59:59.000Z');
    expect(safeDate(null, other)).toBe('1999-12-31T23:59:59.000Z');
    expect(safeDate('garbage', other)).toBe('1999-12-31T23:59:59.000Z');
  });

  test('the result always parses as a date and is always UTC', () => {
    fc.assert(
      fc.property(fc.option(asNote, { nil: null }), (note) => {
        const iso = safeDate(note?.published_at, NOW);
        expect(Number.isNaN(new Date(iso).getTime())).toBe(false);
        expect(iso.endsWith('Z')).toBe(true);
      }),
      { numRuns: 300 },
    );
  });

  test('every emitted entry is stamped from the one request time, unless the note has its own date', () => {
    fc.assert(
      fc.property(fc.array(asNote, { maxLength: 6 }), (notes) => {
        const xml = buildSitemapXml({ site: 'https://ravedeprinz.me', now: NOW, notes });
        const stamps = [...xml.matchAll(/<lastmod>(.*?)<\/lastmod>/g)].map((m) => m[1]!);
        expect(stamps.length).toBeGreaterThan(0);
        for (const stamp of stamps) {
          const own = notes.some((n) => n.published_at && safeDate(n.published_at, NOW) === stamp);
          expect(stamp === NOW.toISOString() || own).toBe(true);
        }
      }),
      { numRuns: 300 },
    );
  });

  test('safeDate never throws, whatever the value is', () => {
    fc.assert(
      fc.property(fc.anything(), (value) => {
        expect(() => safeDate(value as string, NOW)).not.toThrow();
      }),
      { numRuns: 300 },
    );
  });
});
