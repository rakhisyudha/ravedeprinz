import { describe, expect, test } from 'vitest';
import fc from 'fast-check';
import { noteDateLabel, noteSlug, readLabel, selectLatestNotes } from '../../src/lib/notesPreview';
import { slugify } from '../../src/data/site';
import { readingMinutes } from '../../src/lib/readingTime';
import type { Note } from '../../src/lib/cms';
import { arbNote } from './arbitraries';

// Feature: portfolio-engagement, Property 5: Note labels and hrefs match the notes list page
// The list page and the home strip call the same helpers, so these
// properties pin the helpers to the format the list page renders.

const DATES = [
  null,
  undefined,
  '',
  'not-a-date',
  '2021-03-04T05:06:07.000Z',
  '2026-12-31T23:59:59.000Z',
] as const;

const arbDatedNote = fc.record({
  created_at: fc.constantFrom(...DATES),
  published_at: fc.constantFrom(...DATES),
}) as fc.Arbitrary<Pick<Note, 'created_at' | 'published_at'>>;

function parses(value?: string | null): boolean {
  return Boolean(value) && !Number.isNaN(new Date(value!).getTime());
}

describe('Property 5: note labels and hrefs match the notes list page', () => {
  test('the date label is empty exactly when neither date parses', async () => {
    fc.assert(
      fc.property(arbDatedNote, ({ created_at, published_at }) => {
        const expectedEmpty = !parses(created_at) && !parses(published_at);
        expect(noteDateLabel(created_at, published_at) === '').toBe(expectedEmpty);
      }),
      { numRuns: 300 },
    );
  });

  test('a non-empty date label is an uppercase two-digit day plus short month', async () => {
    fc.assert(
      fc.property(arbDatedNote, ({ created_at, published_at }) => {
        const label = noteDateLabel(created_at, published_at);
        if (label === '') return;
        expect(label).toMatch(/^\d{2} [A-Z]{3}$/);
      }),
      { numRuns: 300 },
    );
  });

  test('the date comes from created_at whenever that parses', async () => {
    fc.assert(
      fc.property(arbDatedNote, ({ created_at, published_at }) => {
        if (!parses(created_at)) return;
        const parsed = new Date(created_at!);
        const expected = parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase();
        expect(noteDateLabel(created_at, published_at)).toBe(expected);
      }),
      { numRuns: 300 },
    );
  });

  test('published_at is used only when created_at is absent', async () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_700_000_000 }),
        fc.integer({ min: 0, max: 1_700_000_000 }),
        fc.boolean(),
        (created, published, useCreated) => {
          const createdAt = new Date(created * 1000).toISOString();
          const publishedAt = new Date(published * 1000).toISOString();
          const label = noteDateLabel(useCreated ? createdAt : null, publishedAt);
          const source = useCreated ? createdAt : publishedAt;
          expect(label).toBe(
            new Date(source).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase(),
          );
        },
      ),
      { numRuns: 200 },
    );
  });

  test('the reading-time label is READ NN MIN with at least two digits', async () => {
    fc.assert(
      fc.property(arbNote as fc.Arbitrary<Note>, (note) => {
        const label = readLabel(note);
        expect(label).toMatch(/^READ \d{2,} MIN$/);
        const minutes = readingMinutes(note.body ?? '', note.image_url);
        expect(label).toBe(`READ ${String(minutes).padStart(2, '0')} MIN`);
      }),
      { numRuns: 300 },
    );
  });

  test('the href is /notes/ plus the trimmed slug or the slugified title', async () => {
    fc.assert(
      fc.property(
        fc.record({
          slug: fc.oneof(fc.constant(''), fc.constant('  '), fc.string({ maxLength: 16 })),
          title: fc.string({ minLength: 1, maxLength: 24 }),
        }),
        (note) => {
          const href = `/notes/${noteSlug(note)}`;
          expect(href).toBe(`/notes/${note.slug.trim() || slugify(note.title)}`);
        },
      ),
      { numRuns: 300 },
    );
  });

  test('the strip entries use exactly the list page label and href helpers', async () => {
    fc.assert(
      fc.property(
        fc.array(arbNote as fc.Arbitrary<Note>, { minLength: 1, maxLength: 6 }),
        (notes) => {
          for (const note of selectLatestNotes(notes)) {
            expect(noteDateLabel(note.created_at, note.published_at)).toBeTypeOf('string');
            expect(readLabel(note)).toMatch(/^READ \d{2,} MIN$/);
            expect(`/notes/${noteSlug(note)}`).toBe(`/notes/${note.slug?.trim() || slugify(note.title)}`);
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});
