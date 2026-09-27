import { describe, expect, test } from 'vitest';
import fc from 'fast-check';
import { pageViewPath } from '../../src/lib/analytics';
import { arbHref, arbHrefSequence } from './arbitraries';

// Feature: portfolio-engagement, Property 26: Page-view path normalization
// Kept in its own suite so the jsdom-backed tracker test file stays focused on
// the navigation model.

describe('Property 26: page-view path normalization', () => {
  test('pageViewPath equals the URL pathname for any input', async () => {
    fc.assert(
      fc.property(arbHref, (href) => {
        expect(pageViewPath(href)).toBe(new URL(href).pathname);
      }),
      { numRuns: 400 },
    );
  });

  test('two URLs differing only in query or fragment normalize to the same path', async () => {
    fc.assert(
      fc.property(arbHref, (href) => {
        const base = href.split(/[?#]/)[0]!;
        const path = new URL(href).pathname;
        for (const suffix of ['', '?a=1', '#frag', '?a=1#frag', '?b=2#other']) {
          expect(pageViewPath(`${base}${suffix}`)).toBe(path);
        }
      }),
      { numRuns: 400 },
    );
  });

  test('a normalized path never contains a query or fragment marker', async () => {
    fc.assert(
      fc.property(arbHrefSequence, (hrefs) => {
        for (const href of hrefs) {
          const path = pageViewPath(href);
          expect(path).not.toContain('?');
          expect(path).not.toContain('#');
          expect(path.startsWith('/')).toBe(true);
        }
      }),
      { numRuns: 300 },
    );
  });

  test('an already-bare path is returned unchanged', () => {
    for (const path of ['/', '/notes', '/projects/online-marketplace', '/now']) {
      expect(pageViewPath(`https://ravedeprinz.me${path}`)).toBe(path);
    }
  });
});
