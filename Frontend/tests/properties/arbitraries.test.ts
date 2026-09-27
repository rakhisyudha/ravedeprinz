import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { arbAnalyticsEnv, arbNote, arbProject, arbHrefSequence } from './arbitraries';

// Guard rail for the shared generators: if a generator stops producing the
// awkward shapes the properties rely on, those properties quietly become
// vacuous. Reachability is checked by sampling rather than by asserting
// inside a property, so it does not depend on random luck.
function sample<T>(arb: fc.Arbitrary<T>, runs = 400): T[] {
  return fc.sample(arb, { numRuns: runs, seed: 20260827 });
}

describe('shared arbitraries', () => {
  it('arbProject covers blank slugs, duplicate orders, and hidden/unpublished rows', () => {
    const list = sample(fc.array(arbProject, { minLength: 4, maxLength: 12 })).flat();
    const slugs = list.map((p) => p.slug);
    expect(slugs).toContain(null);
    expect(slugs.some((s) => s === '' || (s !== null && s.trim() === ''))).toBe(true);
    expect(slugs.some((s) => s !== null && s !== s.trim())).toBe(true);
    expect(new Set(list.map((p) => p.sort_order)).size).toBeLessThan(list.length);
    expect(list.some((p) => !p.published)).toBe(true);
    expect(list.some((p) => !p.visible)).toBe(true);
  });

  it('arbNote covers null and unparseable dates on both date fields', () => {
    const list = sample(fc.array(arbNote, { minLength: 1, maxLength: 8 })).flat();
    const dates = list.flatMap((n) => [n.created_at, n.published_at]);
    expect(dates).toContain(null);
    expect(dates.some((d) => typeof d === 'string' && Number.isNaN(new Date(d).getTime()))).toBe(true);
    expect(list.some((n) => !n.published)).toBe(true);
  });

  it('arbAnalyticsEnv covers unset, mixed-case providers, and non-https URLs', () => {
    const envs = sample(arbAnalyticsEnv);
    expect(envs.some((e) => e.PUBLIC_ANALYTICS_PROVIDER === undefined)).toBe(true);
    expect(envs.some((e) => e.PUBLIC_ANALYTICS_PROVIDER === 'Plausible')).toBe(true);
    expect(envs.some((e) => e.PUBLIC_ANALYTICS_PROVIDER === 'plausible')).toBe(true);
    expect(envs.some((e) => (e.PUBLIC_ANALYTICS_SCRIPT_URL ?? '').startsWith('http://'))).toBe(true);
    expect(envs.some((e) => (e.PUBLIC_ANALYTICS_SCRIPT_URL ?? '').startsWith('https://'))).toBe(true);
  });

  it('arbHrefSequence covers public, excluded, and query/fragment-only repeats', () => {
    const sequences = sample(arbHrefSequence);
    const all = sequences.flat();
    expect(new Set(all).size).toBeLessThan(all.length);
    expect(all.some((h) => h.includes('/login') || h.includes('/admin'))).toBe(true);
    expect(all.some((h) => h.includes('?') || h.includes('#'))).toBe(true);
    expect(all.every((h) => h.startsWith('https://ravedeprinz.me'))).toBe(true);
  });
});
