import { describe, expect, test } from 'vitest';
import fc from 'fast-check';
import { compareFeaturedOrder, isPublic, nextProject, resolveProjectSlug } from '../../src/lib/projects';
import type { Project } from '../../src/lib/cms';
import { arbProject } from './arbitraries';

// Feature: portfolio-engagement, Property 14: Next-project links form a single cycle

const asProject = arbProject as fc.Arbitrary<Project>;

/** Public projects with distinct resolved slugs, in Featured_Order. */
const arbPublicChain = fc
  .array(asProject, { minLength: 1, maxLength: 8 })
  .map((list) => list.filter(isPublic))
  .map((list) => {
    const seen = new Set<string>();
    return list.filter((p) => {
      const slug = resolveProjectSlug(p);
      if (seen.has(slug)) return false;
      seen.add(slug);
      return true;
    });
  })
  .map((list) => list.slice().sort(compareFeaturedOrder));

describe('Property 14: next-project links form a single cycle', () => {
  test('for n >= 2, following nextProject n times visits every project once and returns to the start', async () => {
    fc.assert(
      fc.property(arbPublicChain, (chain) => {
        const n = chain.length;
        if (n < 2) return;
        for (const start of chain) {
          const visited: string[] = [];
          let current = start;
          for (let step = 0; step < n; step += 1) {
            const next = nextProject(chain, current);
            expect(next).not.toBeNull();
            visited.push(resolveProjectSlug(next!));
            current = next!;
          }
          expect(new Set(visited).size).toBe(n);
          expect(resolveProjectSlug(current)).toBe(resolveProjectSlug(start));
        }
      }),
      { numRuns: 200 },
    );
  });

  test('nextProject walks the Featured_Order in sequence, wrapping at the end', async () => {
    fc.assert(
      fc.property(arbPublicChain, (chain) => {
        const n = chain.length;
        if (n < 2) return;
        for (let i = 0; i < n; i += 1) {
          const next = nextProject(chain, chain[i]!);
          expect(next).not.toBeNull();
          expect(resolveProjectSlug(next!)).toBe(resolveProjectSlug(chain[(i + 1) % n]!));
        }
      }),
      { numRuns: 200 },
    );
  });

  test('a single public project has no next project', async () => {
    fc.assert(
      fc.property(arbPublicChain, (chain) => {
        expect(nextProject(chain, chain[0]!)).toBe(chain.length < 2 ? null : chain[1]);
      }),
      { numRuns: 200 },
    );
  });

  test('an empty public set has no next project', async () => {
    fc.assert(
      fc.property(asProject, (stranger) => {
        expect(nextProject([], stranger)).toBeNull();
        expect(nextProject([{ ...stranger, published: false }], stranger)).toBeNull();
        expect(nextProject([{ ...stranger, visible: false }], stranger)).toBeNull();
      }),
      { numRuns: 200 },
    );
  });

  test('hidden and unpublished projects are skipped, never linked to', async () => {
    fc.assert(
      fc.property(arbPublicChain, (chain) => {
        if (chain.length < 2) return;
        const withHidden = [
          { ...chain[0]!, visible: false },
          ...chain,
          { ...chain[1]!, published: false },
        ];
        const next = nextProject(withHidden, chain[0]!);
        expect(next).not.toBeNull();
        expect(isPublic(next!)).toBe(true);
        const known = new Set(chain.map((p) => resolveProjectSlug(p)));
        expect(known.has(resolveProjectSlug(next!))).toBe(true);
      }),
      { numRuns: 200 },
    );
  });

  test('a project absent from the list has no next project', async () => {
    fc.assert(
      fc.property(arbPublicChain, asProject, (chain, stranger) => {
        const known = new Set(chain.map((p) => resolveProjectSlug(p)));
        if (!known.has(resolveProjectSlug(stranger))) {
          expect(nextProject(chain, stranger)).toBeNull();
        }
      }),
      { numRuns: 200 },
    );
  });
});
