import { describe, expect, test } from 'vitest';
import fc from 'fast-check';
import { cached, type CmsLocals } from '../../src/lib/requestCache';

// Feature: portfolio-engagement, Property 9: Request cache invokes each fetcher once per request
const arbKey = fc.string({ minLength: 1, maxLength: 8 });

/** Call `cached` with a key sequence and report which fetchers ran. */
function runCalls(keys: string[], locals: CmsLocals = {}) {
  const calls: string[] = [];
  const promises = keys.map((key) =>
    cached(locals, key, () => {
      calls.push(key);
      return Promise.resolve(key.toUpperCase());
    }),
  );
  return { calls, promises };
}

describe('Property 9: request cache invokes each fetcher once per request', () => {
  test('each distinct key runs its fetcher exactly once', () =>
    fc.assert(
      fc.asyncProperty(fc.array(arbKey, { minLength: 1, maxLength: 20 }), async (keys) => {
        const { calls } = runCalls(keys);
        const distinct = new Set(keys);
        expect(calls.length).toBe(distinct.size);
        for (const key of distinct) {
          expect(calls.filter((c) => c === key)).toHaveLength(1);
        }
      }),
      { numRuns: 200 },
    ));

  test('every call with the same key receives the identical promise', () =>
    fc.assert(
      fc.asyncProperty(fc.array(arbKey, { minLength: 1, maxLength: 20 }), async (keys) => {
        const { promises } = runCalls(keys);
        const first = new Map<string, Promise<unknown>>();
        keys.forEach((key, index) => {
          const seen = first.get(key);
          if (seen) expect(promises[index]).toBe(seen);
          else first.set(key, promises[index]!);
        });
      }),
      { numRuns: 200 },
    ));

  test('repeats after the first resolve still reuse the cached promise', () =>
    fc.assert(
      fc.asyncProperty(fc.array(arbKey, { minLength: 1, maxLength: 8 }), async (keys) => {
        const locals: CmsLocals = {};
        let invocations = 0;
        const fetch = () => {
          invocations += 1;
          return Promise.resolve('value');
        };
        for (const key of keys) await cached(locals, key, fetch);
        for (const key of keys) await cached(locals, key, fetch);
        expect(invocations).toBe(new Set(keys).size);
      }),
      { numRuns: 200 },
    ));

  test('a rejected fetcher is cached too, so the request does not retry the CMS', async () => {
    const locals: CmsLocals = {};
    let invocations = 0;
    const failing = () => {
      invocations += 1;
      return Promise.reject(new Error('CMS unreachable'));
    };
    await expect(cached(locals, 'home', failing)).rejects.toThrow('CMS unreachable');
    await expect(cached(locals, 'home', failing)).rejects.toThrow('CMS unreachable');
    expect(invocations).toBe(1);
  });

  test('two requests never share a cache', () => {
    const first: CmsLocals = {};
    runCalls(['home'], first);
    const { calls: callsB } = runCalls(['home'], {});
    expect(callsB).toEqual(['home']);
    expect(first.cmsCache).toBeInstanceOf(Map);
  });

  test('a fresh map is created when locals has no cache yet', () => {
    const locals: CmsLocals = {};
    expect(locals.cmsCache).toBeUndefined();
    void cached(locals, 'k', () => Promise.resolve(1));
    expect(locals.cmsCache).toBeInstanceOf(Map);
  });
});
