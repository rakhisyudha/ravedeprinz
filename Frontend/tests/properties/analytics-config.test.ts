import { describe, expect, test } from 'vitest';
import fc from 'fast-check';
import { ANALYTICS_PROVIDERS, parseAnalyticsConfig, type AnalyticsConfig } from '../../src/lib/analytics';
import { arbAnalyticsEnv, type ArbAnalyticsEnv } from './arbitraries';

// Feature: portfolio-engagement, Property 22: Analytics config parsing

/** The reference model from the design, written independently. */
function referenceValid(env: ArbAnalyticsEnv): boolean {
  const provider = (env.PUBLIC_ANALYTICS_PROVIDER ?? '').trim();
  if (provider !== 'plausible' && provider !== 'umami' && provider !== 'goatcounter') return false;
  const scriptUrl = (env.PUBLIC_ANALYTICS_SCRIPT_URL ?? '').trim();
  if (scriptUrl === '') return false;
  let parsed: URL;
  try {
    parsed = new URL(scriptUrl);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:') return false;
  return (env.PUBLIC_ANALYTICS_SITE_ID ?? '').trim() !== '';
}

describe('Property 22: analytics config parsing', () => {
  test('a config is returned exactly when the reference says the env is valid', async () => {
    fc.assert(
      fc.property(arbAnalyticsEnv, (env) => {
        const config = parseAnalyticsConfig(env);
        expect(config !== null).toBe(referenceValid(env));
      }),
      { numRuns: 500 },
    );
  });

  test('a returned config carries the trimmed values verbatim', async () => {
    fc.assert(
      fc.property(arbAnalyticsEnv, (env) => {
        const config = parseAnalyticsConfig(env);
        if (!config) return;
        expect(config.provider).toBe((env.PUBLIC_ANALYTICS_PROVIDER ?? '').trim());
        expect(config.scriptUrl).toBe((env.PUBLIC_ANALYTICS_SCRIPT_URL ?? '').trim());
        expect(config.siteId).toBe((env.PUBLIC_ANALYTICS_SITE_ID ?? '').trim());
        expect(ANALYTICS_PROVIDERS).toContain(config.provider);
        expect(new URL(config.scriptUrl).protocol).toBe('https:');
      }),
      { numRuns: 400 },
    );
  });

  test('the provider match is case-sensitive, after trimming', () => {
    for (const bad of ['Plausible', 'PLAUSIBLE', 'Umami', 'GoatCounter', 'plausibl', 'plausibleX']) {
      expect(
        parseAnalyticsConfig({
          PUBLIC_ANALYTICS_PROVIDER: bad,
          PUBLIC_ANALYTICS_SCRIPT_URL: 'https://cdn.example/s.js',
          PUBLIC_ANALYTICS_SITE_ID: 'site',
        }),
      ).toBeNull();
    }
    // Whitespace around an exact name is trimmed away, not rejected.
    expect(
      parseAnalyticsConfig({
        PUBLIC_ANALYTICS_PROVIDER: '  plausible\t',
        PUBLIC_ANALYTICS_SCRIPT_URL: 'https://cdn.example/s.js',
        PUBLIC_ANALYTICS_SITE_ID: 'site',
      }),
    ).toEqual({ provider: 'plausible', scriptUrl: 'https://cdn.example/s.js', siteId: 'site' });
  });

  test('a non-https or relative script URL is rejected', () => {
    const base = { PUBLIC_ANALYTICS_PROVIDER: 'umami', PUBLIC_ANALYTICS_SITE_ID: 'site' };
    for (const url of ['http://cdn.example/s.js', '//cdn.example/s.js', '/s.js', 's.js', 'not a url', '']) {
      expect(parseAnalyticsConfig({ ...base, PUBLIC_ANALYTICS_SCRIPT_URL: url })).toBeNull();
    }
    expect(
      parseAnalyticsConfig({ ...base, PUBLIC_ANALYTICS_SCRIPT_URL: 'https://cdn.example/s.js' }),
    ).toEqual<AnalyticsConfig>({ provider: 'umami', scriptUrl: 'https://cdn.example/s.js', siteId: 'site' });
  });

  test('a missing or blank value disables the snippet', () => {
    const base = {
      PUBLIC_ANALYTICS_PROVIDER: 'plausible',
      PUBLIC_ANALYTICS_SCRIPT_URL: 'https://cdn.example/s.js',
    };
    for (const id of [undefined, '', '   ']) {
      expect(parseAnalyticsConfig({ ...base, PUBLIC_ANALYTICS_SITE_ID: id })).toBeNull();
    }
    expect(parseAnalyticsConfig({})).toBeNull();
    expect(parseAnalyticsConfig({ PUBLIC_ANALYTICS_PROVIDER: 'plausible' })).toBeNull();
  });

  test('a space-padded but otherwise valid triple is accepted', () => {
    expect(
      parseAnalyticsConfig({
        PUBLIC_ANALYTICS_PROVIDER: '  goatcounter ',
        PUBLIC_ANALYTICS_SCRIPT_URL: ' https://cdn.example/c.js ',
        PUBLIC_ANALYTICS_SITE_ID: ' my-site ',
      }),
    ).toEqual({ provider: 'goatcounter', scriptUrl: 'https://cdn.example/c.js', siteId: 'my-site' });
  });
});
