import { describe, expect, test } from 'vitest';
import fc from 'fast-check';
import type { Project } from '../../src/lib/cms';
import { compareFeaturedOrder, isPublic, selectFeaturedProjects } from '../../src/lib/projects';
import { arbProject } from './arbitraries';

// Feature: portfolio-engagement, Property 1: Featured selection matches the reference model

/** The naive reference from the design, written independently of the source. */
function referenceFeatured(all: Project[], limit: number): Project[] {
  const ordered = all
    .filter((p) => p.published !== false && p.visible !== false)
    .map((p, index) => ({ p, index }))
    .sort((a, b) => {
      const order = (a.p.sort_order ?? 0) - (b.p.sort_order ?? 0);
      if (order !== 0) return order;
      const year = (b.p.year ?? 0) - (a.p.year ?? 0);
      if (year !== 0) return year;
      return a.index - b.index; // stable
    })
    .map((entry) => entry.p);
  const featured = ordered.filter((p) => p.featured);
  return (featured.length > 0 ? featured : ordered).slice(0, limit);
}

const arbList = fc.array(arbProject as fc.Arbitrary<Project>, { minLength: 0, maxLength: 15 });
const arbLimit = fc.integer({ min: 1, max: 6 });

describe('Property 1: featured selection matches the reference model', () => {
  test('selectFeaturedProjects equals the reference for the default limit', async () => {
    fc.assert(
      fc.property(arbList, (list) => {
        const actual = selectFeaturedProjects(list);
        expect(actual.map((p) => p.title)).toEqual(referenceFeatured(list, 3).map((p) => p.title));
      }),
      { numRuns: 200 },
    );
  });

  test('selectFeaturedProjects equals the reference for any limit', async () => {
    fc.assert(
      fc.property(arbList, arbLimit, (list, limit) => {
        const actual = selectFeaturedProjects(list, limit);
        expect(actual.map((p) => p.title)).toEqual(referenceFeatured(list, limit).map((p) => p.title));
      }),
      { numRuns: 200 },
    );
  });

  test('the result never contains a hidden or unpublished project and is at most 3 long', async () => {
    fc.assert(
      fc.property(arbList, (list) => {
        const actual = selectFeaturedProjects(list);
        expect(actual.length).toBeLessThanOrEqual(3);
        for (const project of actual) {
          expect(isPublic(project)).toBe(true);
          expect(project.published).not.toBe(false);
          expect(project.visible).not.toBe(false);
        }
      }),
      { numRuns: 200 },
    );
  });

  test('the result is non-empty exactly when a public project exists', async () => {
    fc.assert(
      fc.property(arbList, (list) => {
        const publicCount = list.filter(isPublic).length;
        expect(selectFeaturedProjects(list).length > 0).toBe(publicCount > 0);
      }),
      { numRuns: 200 },
    );
  });

  test('the result is a prefix of the public Featured_Order', async () => {
    fc.assert(
      fc.property(arbList, (list) => {
        const ordered = list.filter(isPublic).slice().sort(compareFeaturedOrder);
        const actual = selectFeaturedProjects(list);
        let cursor = 0;
        for (const project of actual) {
          const index = ordered.indexOf(project, cursor);
          expect(index).toBeGreaterThanOrEqual(0);
          cursor = index + 1;
        }
      }),
      { numRuns: 200 },
    );
  });

  test('when nothing is featured the first public projects are used', async () => {
    fc.assert(
      fc.property(
        arbList.map((list) => list.map((p) => ({ ...p, featured: false }))),
        (list) => {
          const ordered = list.filter(isPublic).slice().sort(compareFeaturedOrder);
          expect(selectFeaturedProjects(list).map((p) => p.title)).toEqual(
            ordered.slice(0, 3).map((p) => p.title),
          );
        },
      ),
      { numRuns: 200 },
    );
  });
});
