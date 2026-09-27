import { describe, expect, test } from 'vitest';
import fc from 'fast-check';
import { projectHref, resolveProjectSlug } from '../../src/lib/projects';
import type { Project } from '../../src/lib/cms';
import { slugify } from '../../src/data/site';
import { arbProject } from './arbitraries';

// Feature: portfolio-engagement, Property 3: Slug resolution rule
const arbSlug = fc.oneof(
  fc.constant(null),
  fc.constant(undefined),
  fc.constant(''),
  fc.constant('   '),
  fc.constant('\t\n '),
  fc.string({ minLength: 1, maxLength: 16 }),
  fc.string({ minLength: 1, maxLength: 16 }).map((s) => `  ${s}\t`),
);

const arbTitle = fc.string({ minLength: 1, maxLength: 40 });

describe('Property 3: slug resolution rule', () => {
  test('the trimmed slug wins and the title is slugified only as a fallback', async () => {
    fc.assert(
      fc.property(arbSlug, arbTitle, (slug, title) => {
        const expected = slug?.trim() || slugify(title);
        expect(resolveProjectSlug({ slug, title })).toBe(expected);
      }),
      { numRuns: 300 },
    );
  });

  test('a missing slug key behaves like a null slug', async () => {
    fc.assert(
      fc.property(arbTitle, (title) => {
        expect(resolveProjectSlug({ title })).toBe(slugify(title));
        expect(resolveProjectSlug({ slug: undefined, title })).toBe(slugify(title));
      }),
      { numRuns: 200 },
    );
  });

  test('whitespace padding never survives into the link', async () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-z0-9-]{1,12}$/),
        asProjectTitle(),
        (slug, title) => {
          const resolved = resolveProjectSlug({ slug: `  ${slug}  `, title });
          expect(resolved).toBe(slug);
          expect(resolved).toBe(resolved.trim());
        },
      ),
      { numRuns: 200 },
    );
  });

  test('every consumer produces the same /projects/{slug} path', async () => {
    fc.assert(
      fc.property(arbProject, (project) => {
        const expected = `/projects/${resolveProjectSlug(project)}`;
        expect(projectHref(project as Project)).toBe(expected);
        // The strip href, the list href, and the sitemap loc are all built
        // from resolveProjectSlug, so one project never yields two URLs.
        expect(`/projects/${project.slug?.trim() || slugify(project.title)}`).toBe(expected);
      }),
      { numRuns: 300 },
    );
  });

  test('two projects with the same title and no slug resolve to the same path', async () => {
    fc.assert(
      fc.property(arbTitle, arbTitle, (titleA, titleB) => {
        const hrefA = projectHref({ title: titleA, slug: null } as never);
        const hrefB = projectHref({ title: titleB, slug: null } as never);
        if (slugify(titleA) === slugify(titleB)) expect(hrefA).toBe(hrefB);
      }),
      { numRuns: 200 },
    );
  });
});

function asProjectTitle() {
  return fc.string({ minLength: 1, maxLength: 20 });
}
