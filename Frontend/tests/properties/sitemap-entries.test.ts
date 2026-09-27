import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import fc from 'fast-check';
import { buildSitemapXml, STATIC_ROUTES } from '../../src/lib/sitemap';
import type { Note } from '../../src/lib/cms';
import { arbNote } from './arbitraries';

// Feature: portfolio-engagement, Property 17: Sitemap entry set
// Per-project case-study URLs are gone (no /projects/{slug} page), so the
// entry set is the static routes plus note detail pages.
const asNote = arbNote as fc.Arbitrary<Note>;

const SITES = ['https://ravedeprinz.me', 'https://staging.example.test', 'http://localhost:3100'] as const;

const arbSite = fc.constantFrom(...SITES);
const arbNotes = fc.option(fc.array(asNote, { maxLength: 10 }), { nil: null });
const NOW = new Date('2026-08-27T12:00:00.000Z');

/** The <loc> values in document order, unescaped. */
function locs(site: string, notes: Note[] | null): string[] {
  const xml = buildSitemapXml({ site, now: NOW, notes });
  return [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) =>
    match[1]!.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'),
  );
}

describe('Property 17: sitemap entry set', () => {
  test('the static routes are always present, including /projects', () => {
    fc.assert(
      fc.property(arbSite, arbNotes, (site, notes) => {
        const found = locs(site, notes);
        for (const path of STATIC_ROUTES) {
          expect(found).toContain(`${site.replace(/\/$/, '')}${path || '/'}`);
        }
      }),
      { numRuns: 300 },
    );
  });

  test('a null notes list still yields every static route', () => {
    fc.assert(
      fc.property(arbSite, (site) => {
        const found = locs(site, null);
        expect(found).toHaveLength(STATIC_ROUTES.length);
      }),
      { numRuns: 100 },
    );
  });

  test('no loc ever appears twice', () => {
    fc.assert(
      fc.property(arbSite, arbNotes, (site, notes) => {
        const found = locs(site, notes);
        expect(new Set(found).size).toBe(found.length);
      }),
      { numRuns: 300 },
    );
  });

  test('no per-project case-study URL is advertised', () => {
    fc.assert(
      fc.property(arbSite, arbNotes, (site, notes) => {
        // Nothing may sit under /projects/{slug}: there is no such page, so
        // listing it would hand crawlers a 404.
        const found = locs(site, notes);
        expect(found.filter((loc) => loc.startsWith(`${site.replace(/\/$/, '')}/projects/`))).toHaveLength(0);
        expect(found).toContain(`${site.replace(/\/$/, '')}/projects`);
      }),
      { numRuns: 300 },
    );
  });

  test('the output is a well-formed urlset document', () => {
    fc.assert(
      fc.property(arbSite, arbNotes, (site, notes) => {
        const xml = buildSitemapXml({ site, now: NOW, notes });
        expect(
          xml.startsWith(
            '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          ),
        ).toBe(true);
        expect(xml.endsWith('</urlset>')).toBe(true);
        expect((xml.match(/<url>/g) ?? []).length).toBe((xml.match(/<\/url>/g) ?? []).length);
        expect((xml.match(/<url>/g) ?? []).length).toBeGreaterThanOrEqual(STATIC_ROUTES.length);
      }),
      { numRuns: 300 },
    );
  });

  test('note entries keep their own list and coexist with the static routes', () => {
    fc.assert(
      fc.property(arbSite, arbNotes, (site, notes) => {
        const base = site.replace(/\/$/, '');
        const found = locs(site, notes);
        const noteLocs = found.filter((loc) => loc.startsWith(`${base}/notes/`));
        for (const note of notes ?? []) {
          const key = note.slug?.trim() || note.id;
          if (key) expect(noteLocs).toContain(`${base}/notes/${key}`);
        }
        expect(found.length).toBeGreaterThanOrEqual(STATIC_ROUTES.length + noteLocs.length);
      }),
      { numRuns: 300 },
    );
  });

  test('the route only fetches notes, and treats a failure as null', () => {
    const source = readFileSync(
      fileURLToPath(new URL('../../src/pages/sitemap.xml.ts', import.meta.url)),
      'utf8',
    );
    expect(source).toContain('await fetchNotes()');
    expect(source).toContain('notes: notes?.notes ?? null');
    expect(source).not.toContain('fetchProjects');
  });
});
