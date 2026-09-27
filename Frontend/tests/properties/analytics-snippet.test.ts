import { describe, expect, test } from 'vitest';
import fc from 'fast-check';
import { ANALYTICS_PROVIDERS, snippetAttributes, type AnalyticsConfig } from '../../src/lib/analytics';

// Feature: portfolio-engagement, Property 23: Snippet attributes per provider
const SITE_IDS = [
  'ravedeprinz.me',
  'my-site',
  'https://stats.example/count',
  'http://insecure.example/count',
  'not a url',
  ' spaced ',
] as const;

const arbConfig = fc.record({
  provider: fc.constantFrom(...ANALYTICS_PROVIDERS),
  scriptUrl: fc.constantFrom('https://cdn.example/script.js', 'https://cdn.example/js/script.manual.js'),
  siteId: fc.constantFrom(...SITE_IDS),
}) as fc.Arbitrary<AnalyticsConfig>;

const ID_ATTRIBUTES = ['data-domain', 'data-website-id', 'data-goatcounter'];

function httpsOrRaw(value: string): string {
  try {
    return new URL(value).protocol === 'https:' ? value : `https://${value}.goatcounter.com/count`;
  } catch {
    return `https://${value}.goatcounter.com/count`;
  }
}

describe('Property 23: snippet attributes per provider', () => {
  test('the script src and the defer flag are always present', async () => {
    fc.assert(
      fc.property(arbConfig, (config) => {
        const attributes = snippetAttributes(config);
        expect(attributes.src).toBe(config.scriptUrl);
        expect(attributes.defer).toBe(true);
        expect(attributes['data-analytics-provider']).toBe(config.provider);
      }),
      { numRuns: 300 },
    );
  });

  test('exactly one provider id attribute is set, and it matches the provider', async () => {
    fc.assert(
      fc.property(arbConfig, (config) => {
        const attributes = snippetAttributes(config);
        const present = ID_ATTRIBUTES.filter((name) => name in attributes);
        expect(present).toHaveLength(1);
        const expectedName = {
          plausible: 'data-domain',
          umami: 'data-website-id',
          goatcounter: 'data-goatcounter',
        }[config.provider];
        expect(present[0]).toBe(expectedName);
      }),
      { numRuns: 300 },
    );
  });

  test('the id attribute equals the site id, except a non-https goatcounter id', async () => {
    fc.assert(
      fc.property(arbConfig, (config) => {
        const attributes = snippetAttributes(config);
        const value = String(attributes['data-domain'] ?? attributes['data-website-id'] ?? attributes['data-goatcounter']);
        if (config.provider === 'goatcounter') {
          expect(value).toBe(httpsOrRaw(config.siteId));
        } else {
          expect(value).toBe(config.siteId);
        }
      }),
      { numRuns: 300 },
    );
  });

  test('provider auto-tracking is switched off in every manual mode', async () => {
    fc.assert(
      fc.property(arbConfig, (config) => {
        const attributes = snippetAttributes(config);
        if (config.provider === 'umami') expect(attributes['data-auto-track']).toBe('false');
        else expect('data-auto-track' in attributes).toBe(false);

        if (config.provider === 'goatcounter') {
          expect(String(attributes['data-goatcounter-settings'])).toContain('no_onload');
        } else {
          expect('data-goatcounter-settings' in attributes).toBe(false);
        }
      }),
      { numRuns: 300 },
    );
  });

  test('plausible gets no umami or goatcounter attributes', () => {
    const attributes = snippetAttributes({
      provider: 'plausible',
      scriptUrl: 'https://cdn.example/s.js',
      siteId: 'site',
    });
    expect(attributes).toEqual({
      src: 'https://cdn.example/s.js',
      defer: true,
      'data-analytics-provider': 'plausible',
      'data-domain': 'site',
    });
  });

  test('a bare goatcounter id becomes the canonical counter URL', () => {
    expect(
      snippetAttributes({
        provider: 'goatcounter',
        scriptUrl: 'https://cdn.example/c.js',
        siteId: 'my-site',
      })['data-goatcounter'],
    ).toBe('https://my-site.goatcounter.com/count');
  });

  test('a full https goatcounter URL is used unchanged', () => {
    expect(
      snippetAttributes({
        provider: 'goatcounter',
        scriptUrl: 'https://cdn.example/c.js',
        siteId: 'https://stats.example/count',
      })['data-goatcounter'],
    ).toBe('https://stats.example/count');
  });

  test('a non-https goatcounter id falls back to the documented template', () => {
    // Requirement 14.7 is literal: anything that is not an absolute https:
    // URL is treated as a counter name and expanded to the canonical form.
    // The site owner is expected to pass either a bare name or an https: URL.
    expect(
      snippetAttributes({
        provider: 'goatcounter',
        scriptUrl: 'https://cdn.example/c.js',
        siteId: 'http://insecure.example/count',
      })['data-goatcounter'],
    ).toBe('https://http://insecure.example/count.goatcounter.com/count');
  });
});
