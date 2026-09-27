import { describe, expect, test } from 'vitest';
import fc from 'fast-check';
import { noteSlug } from '../../src/lib/notesPreview';
import { findFallbackNote, findFallbackProject, fallbackNoteList, fallbackProjectList } from '../../src/lib/fallback';
import { projectHref, resolveProjectSlug } from '../../src/lib/projects';
import { slugify } from '../../src/data/site';

// Feature: portfolio-engagement, Property 28: Fallback link/lookup round trip
// Requesting the href the list page renders must resolve back to the same
// item, for projects and for notes.

describe('Property 28: fallback link/lookup round trip', () => {
  test('every project href resolves back to the same project', () => {
    for (const project of fallbackProjectList()) {
      const href = projectHref(project);
      const slug = href.slice('/projects/'.length);
      expect(findFallbackProject(slug)).toEqual(project);
    }
  });

  test('every note href resolves back to the same note', () => {
    for (const note of fallbackNoteList()) {
      const slug = noteSlug(note);
      expect(findFallbackNote(slug)).toEqual(note);
    }
  });

  test('an unknown slug resolves to null on both lookups', () => {
    expect(findFallbackProject('definitely-not-a-project')).toBeNull();
    expect(findFallbackNote('definitely-not-a-note')).toBeNull();
  });

  test('the round trip holds for any slug the resolver can produce', async () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            slug: fc.oneof(fc.constant(null), fc.constant(''), fc.constant('  '), fc.string({ maxLength: 12 })),
            title: fc.string({ minLength: 1, maxLength: 20 }),
          }),
          { minLength: 1, maxLength: 5 },
        ),
        (shapes) => {
          for (const shape of shapes) {
            const href = `/projects/${resolveProjectSlug(shape)}`;
            const slug = href.slice('/projects/'.length);
            expect(slug).toBe(shape.slug?.trim() || slugify(shape.title));
            // Trimming, and nothing more, separates the stored value.
            expect(slug).toBe(slug.trim());
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  test('a note href is /notes/ plus the trimmed slug or the slugified title', async () => {
    fc.assert(
      fc.property(
        fc.record({
          slug: fc.oneof(fc.constant(''), fc.constant('   '), fc.string({ maxLength: 14 })),
          title: fc.string({ minLength: 1, maxLength: 24 }),
        }),
        (note) => {
          expect(noteSlug(note)).toBe(note.slug.trim() || slugify(note.title));
        },
      ),
      { numRuns: 200 },
    );
  });
});
