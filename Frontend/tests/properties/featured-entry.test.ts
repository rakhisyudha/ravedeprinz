import { describe, expect, test } from 'vitest';
import fc from 'fast-check';
import { projectHref, resolveProjectSlug, toFeaturedEntry } from '../../src/lib/projects';
import type { Project } from '../../src/lib/cms';
import { arbProject } from './arbitraries';

// Feature: portfolio-engagement, Property 2: Featured entries are complete, bounded, and correctly linked
const asProject = arbProject as fc.Arbitrary<Project>;

// The strip renders on one line, so the entry description is the source
// description with every whitespace run collapsed to a single space. The
// reference below is written independently of truncateLine.
const singleLine = (value: string) => value.replace(/\s+/g, ' ').trim();

describe('Property 2: featured entries are complete, bounded, and correctly linked', () => {
  test('title, year, and status equal the project values', async () => {
    fc.assert(
      fc.property(asProject, (project) => {
        const entry = toFeaturedEntry(project);
        expect(entry.title).toBe(project.title);
        expect(entry.year).toBe(project.year);
        expect(entry.status).toBe(project.status);
      }),
      { numRuns: 300 },
    );
  });

  test('the description never exceeds 140 characters', async () => {
    fc.assert(
      fc.property(asProject, (project) => {
        expect(toFeaturedEntry(project).description.length).toBeLessThanOrEqual(140);
      }),
      { numRuns: 300 },
    );
  });

  test('a description of 140 characters or fewer is passed through unchanged', async () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 140 }), asProject, (description, project) => {
        const entry = toFeaturedEntry({ ...project, description });
        expect(entry.description).toBe(singleLine(description));
        expect(entry.description.endsWith('…')).toBe(false);
      }),
      { numRuns: 300 },
    );
  });

  test('a longer description becomes a prefix of the original plus an ellipsis', async () => {
    // No whitespace in the alphabet, so the single-line form is guaranteed
    // to stay over the 140-character cap after whitespace collapsing.
    const arbLong = fc.stringMatching(/^[a-zA-Z0-9.,;:!?-]{141,300}$/);
    fc.assert(
      fc.property(arbLong, asProject, (description, project) => {
        const entry = toFeaturedEntry({ ...project, description });
        const source = singleLine(description);
        expect(entry.description.length).toBeLessThanOrEqual(140);
        expect(entry.description.endsWith('…')).toBe(true);
        const withoutEllipsis = entry.description.slice(0, -1);
        expect(source.startsWith(withoutEllipsis)).toBe(true);
        // Nothing but trailing whitespace was dropped at the cut point.
        expect(withoutEllipsis).toBe(source.slice(0, withoutEllipsis.length));
      }),
      { numRuns: 300 },
    );
  });

  test('the entry description is always a single line', async () => {
    fc.assert(
      fc.property(
        fc.string().map((value) => value.replace(/[^\S ]+/g, ' \n ')),
        asProject,
        (description, project) => {
          expect(toFeaturedEntry({ ...project, description }).description).not.toMatch(/\s\s|[\n\r\t]/);
        },
      ),
      { numRuns: 200 },
    );
  });

  test('the image is null exactly when image_url is null, empty, or whitespace', async () => {
    fc.assert(
      fc.property(
        fc.option(fc.string({ maxLength: 20 }), { nil: null }),
        asProject,
        (imageUrl, project) => {
          const entry = toFeaturedEntry({ ...project, image_url: imageUrl });
          const blank = imageUrl === null || imageUrl === undefined || imageUrl.trim() === '';
          expect(entry.image === null).toBe(blank);
          if (!blank) expect(entry.image).toBe(imageUrl!.trim());
        },
      ),
      { numRuns: 300 },
    );
  });

  test('the href is /projects/ plus the resolved slug', async () => {
    fc.assert(
      fc.property(asProject, (project) => {
        const entry = toFeaturedEntry(project);
        expect(entry.href).toBe(`/projects/${resolveProjectSlug(project)}`);
        expect(entry.href).toBe(projectHref(project));
      }),
      { numRuns: 300 },
    );
  });
});
