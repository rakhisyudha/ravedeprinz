/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import fc from 'fast-check';
import { createPageViewTracker, isExcludedPath, pageViewPath } from '../../src/lib/analytics';
import { arbHref, arbHrefSequence } from './arbitraries';

// Feature: portfolio-engagement, Property 25: Page-view tracker matches the navigation model
// The model: a hard load, then soft navigations, back, and forward. A view is
// sent for index i exactly when path(i) is public and differs from path(i-1).

/** The reference sequence model, written independently of the tracker. */
function expectedSends(hrefs: string[]): string[] {
  const sent: string[] = [];
  let last: string | undefined;
  for (const href of hrefs) {
    const path = new URL(href).pathname;
    if (isExcludedPath(path)) {
      last = path;
      continue;
    }
    if (path === last) continue;
    last = path;
    sent.push(path);
  }
  return sent;
}

beforeEach(() => {
  document.cookie = '';
  window.localStorage.clear();
  window.sessionStorage.clear();
});

afterEach(() => {
  document.cookie = '';
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe('Property 25: page-view tracker matches the navigation model', () => {
  test('a navigation sequence produces exactly the modelled page views', async () => {
    fc.assert(
      fc.property(arbHrefSequence, (hrefs) => {
        const sent: string[] = [];
        const tracker = createPageViewTracker((path) => sent.push(path));
        for (const href of hrefs) tracker.onPageLoad(href);
        expect(sent).toEqual(expectedSends(hrefs));
      }),
      { numRuns: 300 },
    );
  });

  test('the argument is always a pathname, with no query string or fragment', async () => {
    fc.assert(
      fc.property(arbHrefSequence, (hrefs) => {
        const sent: string[] = [];
        const tracker = createPageViewTracker((path) => sent.push(path));
        for (const href of hrefs) tracker.onPageLoad(href);
        for (const path of sent) {
          expect(path).not.toContain('?');
          expect(path).not.toContain('#');
          expect(path.startsWith('/')).toBe(true);
        }
      }),
      { numRuns: 300 },
    );
  });

  test('delivering the first href twice (module init plus astro:page-load) changes nothing', async () => {
    fc.assert(
      fc.property(arbHrefSequence, (hrefs) => {
        const once: string[] = [];
        const onceTracker = createPageViewTracker((path) => once.push(path));
        for (const href of hrefs) onceTracker.onPageLoad(href);

        const twice: string[] = [];
        const twiceTracker = createPageViewTracker((path) => twice.push(path));
        twiceTracker.onPageLoad(hrefs[0]!); // module init
        for (const href of hrefs) twiceTracker.onPageLoad(href); // astro:page-load

        expect(twice).toEqual(once);
      }),
      { numRuns: 300 },
    );
  });

  test('a hard load of one public page sends exactly one view', async () => {
    fc.assert(
      fc.property(arbHref, (href) => {
        const sent: string[] = [];
        const tracker = createPageViewTracker((path) => sent.push(path));
        tracker.onPageLoad(href);
        const path = new URL(href).pathname;
        expect(sent.length).toBe(isExcludedPath(path) ? 0 : 1);
      }),
      { numRuns: 300 },
    );
  });

  test('a query-string-only or fragment-only change sends nothing extra', async () => {
    const sent: string[] = [];
    const tracker = createPageViewTracker((path) => sent.push(path));
    tracker.onPageLoad('https://ravedeprinz.me/notes/example?ref=x');
    tracker.onPageLoad('https://ravedeprinz.me/notes/example');
    tracker.onPageLoad('https://ravedeprinz.me/notes/example#intro');
    tracker.onPageLoad('https://ravedeprinz.me/notes/example?ref=y#other');
    expect(sent).toEqual(['/notes/example']);
  });

  test('an excluded path is never sent, and leaving it re-sends the destination once', async () => {
    const sent: string[] = [];
    const tracker = createPageViewTracker((path) => sent.push(path));
    tracker.onPageLoad('https://ravedeprinz.me/');
    tracker.onPageLoad('https://ravedeprinz.me/login');
    tracker.onPageLoad('https://ravedeprinz.me/admin/projects');
    expect(sent).toEqual(['/']);
    tracker.onPageLoad('https://ravedeprinz.me/notes/example');
    expect(sent).toEqual(['/', '/notes/example']);
  });

  test('a back navigation to an already-visited path is counted again', async () => {
    const sent: string[] = [];
    const tracker = createPageViewTracker((path) => sent.push(path));
    for (const href of [
      'https://ravedeprinz.me/',
      'https://ravedeprinz.me/now',
      'https://ravedeprinz.me/',
    ]) {
      tracker.onPageLoad(href);
    }
    expect(sent).toEqual(['/', '/now', '/']);
  });

  test('cookies and web storage are untouched by a full run', async () => {
    const before = {
      cookie: document.cookie,
      local: JSON.stringify(window.localStorage),
      session: JSON.stringify(window.sessionStorage),
    };
    const tracker = createPageViewTracker(() => {});
    for (const href of [
      'https://ravedeprinz.me/',
      'https://ravedeprinz.me/notes/a',
      'https://ravedeprinz.me/admin',
      'https://ravedeprinz.me/now',
    ]) {
      tracker.onPageLoad(href);
    }
    expect(document.cookie).toBe(before.cookie);
    expect(JSON.stringify(window.localStorage)).toBe(before.local);
    expect(JSON.stringify(window.sessionStorage)).toBe(before.session);
  });
});

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
        const path = new URL(href).pathname;
        for (const suffix of ['', '?a=1', '#frag', '?a=1#frag', '?b=2#other']) {
          expect(pageViewPath(`${href.split(/[?#]/)[0]}${suffix}`)).toBe(path);
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
        }
      }),
      { numRuns: 300 },
    );
  });
});
