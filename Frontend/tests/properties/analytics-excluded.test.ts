import { describe, expect, test } from 'vitest';
import fc from 'fast-check';
import {
  isExcludedPath,
  shouldRenderSnippet,
  type AnalyticsConfig,
} from '../../src/lib/analytics';

// Feature: portfolio-engagement, Property 24: Excluded paths never render the snippet
const CONFIG: AnalyticsConfig = {
  provider: 'plausible',
  scriptUrl: 'https://cdn.example/script.js',
  siteId: 'ravedeprinz.me',
};

const arbPathname = fc.oneof(
  fc.constantFrom(
    '/',
    '/login',
    '/admin',
    '/admin/',
    '/admin/projects',
    '/admin/settings',
    '/about',
    '/work',
    '/projects',
    '/notes',
    '/now',
    '/administrator',
    '/logins',
    '/login/extra',
    '/Login',
  ),
  fc.stringMatching(/^\/[a-z/-]{0,20}$/),
);

describe('Property 24: excluded paths never render the snippet', () => {
  test('shouldRenderSnippet is false exactly on /login and /admin/*', async () => {
    fc.assert(
      fc.property(arbPathname, (pathname) => {
        const expectedExcluded = pathname === '/login' || pathname.startsWith('/admin');
        expect(isExcludedPath(pathname)).toBe(expectedExcluded);
        expect(shouldRenderSnippet(pathname, CONFIG)).toBe(!expectedExcluded);
      }),
      { numRuns: 400 },
    );
  });

  test('a null config never renders the snippet on any path', () => {
    fc.assert(
      fc.property(arbPathname, (pathname) => {
        expect(shouldRenderSnippet(pathname, null)).toBe(false);
      }),
      { numRuns: 400 },
    );
  });

  test('public paths render, excluded paths do not', () => {
    for (const path of ['/', '/about', '/work', '/projects', '/notes', '/now']) {
      expect(shouldRenderSnippet(path, CONFIG)).toBe(true);
    }
    for (const path of ['/login', '/admin', '/admin/', '/admin/projects', '/admin/settings']) {
      expect(shouldRenderSnippet(path, CONFIG)).toBe(false);
    }
  });

  test('the rule is a literal prefix match, not a substring match', () => {
    // These are public: the excluded names appear after the first segment, so
    // the path does not start with them.
    for (const path of ['/logins', '/notes/login', '/projects/admin', '/a/admin']) {
      expect(isExcludedPath(path)).toBe(false);
      expect(shouldRenderSnippet(path, CONFIG)).toBe(true);
    }
    // A path whose first segment merely begins with "admin" is excluded,
    // which is the literal reading of "starts with /admin".
    expect(isExcludedPath('/administrator')).toBe(true);
  });

  test('the component emits the script only when the rule allows it', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const source = readFileSync(
      fileURLToPath(new URL('../../src/components/AnalyticsSnippet.astro', import.meta.url)),
      'utf8',
    );
    expect(source).toContain('shouldRenderSnippet(Astro.url.pathname, config)');
    expect(source).toContain('snippetAttributes(config)');
    expect(source).toContain('enabled && (');
    expect(source).toContain('<script {...attributes} />');
  });
});
