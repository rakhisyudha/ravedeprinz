import { describe, expect, test } from 'vitest';
import fc from 'fast-check';
import type { Project as RawProject } from '../../src/data/content';
import { notes as rawNotes, projects as rawProjects } from '../../src/data/content';
import { projectImages } from '../../src/data/site';
import { fallbackNoteList, fallbackProjectList, normalizeNote, normalizeProject } from '../../src/lib/fallback';
import type { Note, Project } from '../../src/lib/cms';

// Feature: portfolio-engagement, Property 27: Fallback normalization produces complete shapes

const optionalUrl = fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined });

const arbRawProject: fc.Arbitrary<RawProject> = fc.record({
  title: fc.string({ minLength: 1, maxLength: 30 }),
  type: fc.constantFrom('FINISHED', 'IN PROGRESS', 'SHELVED'),
  // Deliberately sloppy year strings: '', 'abc', '20xx4', '0'.
  year: fc.oneof(fc.constant(''), fc.constant('abc'), fc.stringMatching(/^[0-9]{1,4}$/), fc.constant('0')),
  desc: fc.string({ maxLength: 200 }),
  stack: fc.string({ maxLength: 40 }),
  accent: fc.constantFrom('cyan', 'gold', 'muted'),
  image: optionalUrl,
  link: optionalUrl,
  github: optionalUrl,
  slug: fc.option(fc.string({ maxLength: 20 }), { nil: undefined }),
  featured: fc.option(fc.boolean(), { nil: undefined }),
});

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** The reference normalization, written independently of lib/fallback.ts. */
function referenceProject(raw: RawProject, index: number): Project {
  const slug = raw.slug?.trim() || slugify(raw.title);
  return {
    title: raw.title,
    slug,
    description: raw.desc,
    year: Number(raw.year) || 0,
    status: raw.type,
    deployment_status: raw.link ? 'DEPLOYED' : 'NOT_DEPLOYED',
    stack: raw.stack,
    live_url: raw.link ?? null,
    source_url: raw.github ?? null,
    image_url: Object.hasOwn(projectImages, slug) ? projectImages[slug]! : null,
    featured: raw.featured ?? false,
    published: true,
    visible: true,
    sort_order: index,
    problem: '',
    what_built: '',
    key_decision: '',
    outcome: '',
    updated_at: null,
  };
}

describe('Property 27: fallback normalization produces complete shapes', () => {
  test('every required field is present and correctly typed', async () => {
    fc.assert(
      fc.property(fc.array(arbRawProject, { minLength: 0, maxLength: 6 }), (list) => {
        for (const project of list.map(normalizeProject)) {
          expect(typeof project.title).toBe('string');
          expect(typeof project.slug).toBe('string');
          expect(typeof project.description).toBe('string');
          expect(Number.isFinite(project.year)).toBe(true);
          expect(['FINISHED', 'IN PROGRESS', 'SHELVED']).toContain(project.status);
          expect(['DEPLOYED', 'NOT_DEPLOYED']).toContain(project.deployment_status);
          expect(typeof project.stack).toBe('string');
          expect(typeof project.featured).toBe('boolean');
          expect(typeof project.problem).toBe('string');
          expect(typeof project.what_built).toBe('string');
          expect(typeof project.key_decision).toBe('string');
          expect(typeof project.outcome).toBe('string');
          expect(typeof project.sort_order).toBe('number');
        }
      }),
      { numRuns: 300 },
    );
  });

  test('optional fields are null or empty, never undefined', async () => {
    fc.assert(
      fc.property(fc.array(arbRawProject, { minLength: 1, maxLength: 6 }), (list) => {
        for (const project of list.map(normalizeProject)) {
          for (const field of ['live_url', 'source_url', 'image_url', 'updated_at'] as const) {
            expect(project[field]).not.toBeUndefined();
            if (project[field] !== null) expect(typeof project[field]).toBe('string');
          }
          expect(project.published).toBe(true);
          expect(project.visible).toBe(true);
        }
      }),
      { numRuns: 300 },
    );
  });

  test('the normalized shape equals the reference', async () => {
    fc.assert(
      fc.property(fc.array(arbRawProject, { minLength: 0, maxLength: 6 }), (list) => {
        const actual = list.map(normalizeProject);
        const expected = list.map(referenceProject);
        expect(actual).toEqual(expected);
      }),
      { numRuns: 300 },
    );
  });

  test('the slug is the trimmed explicit slug or the slugified title', async () => {
    fc.assert(
      fc.property(arbRawProject, (raw) => {
        expect(normalizeProject(raw, 0).slug).toBe(raw.slug?.trim() || slugify(raw.title));
      }),
      { numRuns: 300 },
    );
  });

  test('a year that is not a number normalizes to 0', async () => {
    fc.assert(
      fc.property(fc.constantFrom('', 'abc', '0', ' '), (year) => {
        const raw = { ...rawProjects[0]!, year };
        expect(normalizeProject(raw, 0).year).toBe(Number(year) || 0);
      }),
      { numRuns: 100 },
    );
  });

  test('notes normalize to complete Note shapes', () => {
    for (const raw of rawNotes) {
      const note = normalizeNote(raw) as Note;
      expect(typeof note.title).toBe('string');
      expect(typeof note.slug).toBe('string');
      expect(typeof note.body).toBe('string');
      expect(typeof note.tag).toBe('string');
      expect(note.subtitle).toBeNull();
      expect(note.image_url).toBeNull();
      expect(note.created_at).toBeNull();
      expect(note.published_at).toBeNull();
      expect(note.published).toBe(true);
    }
  });

  test('the shipped fallback data normalizes without loss', () => {
    expect(fallbackProjectList()).toHaveLength(rawProjects.length);
    expect(fallbackNoteList()).toHaveLength(rawNotes.length);
    for (const project of fallbackProjectList()) {
      expect(typeof project.slug).toBe('string');
    }
  });
});
