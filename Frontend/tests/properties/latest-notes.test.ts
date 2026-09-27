import { describe, expect, test } from 'vitest';
import fc from 'fast-check';
import { selectLatestNotes } from '../../src/lib/notesPreview';
import type { Note } from '../../src/lib/cms';
import { arbNote } from './arbitraries';

// Feature: portfolio-engagement, Property 4: Latest-notes selection matches the reference model

const DATES = [
  null,
  undefined,
  '',
  'not-a-date',
  '2020-01-01T00:00:00.000Z',
  '2024-06-06T06:06:06.000Z',
  '2026-12-31T23:59:59.000Z',
] as const;

const arbDatedNote = fc.record({
  title: fc.string({ minLength: 1, maxLength: 16 }),
  published: fc.oneof(fc.constant(false), fc.constant(true), fc.constant(undefined), fc.constant(null)),
  published_at: fc.constantFrom(...DATES),
  created_at: fc.constantFrom(...DATES),
}) as fc.Arbitrary<Note>;

function time(value?: string | null): number {
  if (!value) return Number.NEGATIVE_INFINITY;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
}

/** The naive reference from the design, written independently. */
function referenceLatest(notes: Note[], limit: number): Note[] {
  const published = notes.filter((n) => n.published !== false);
  const sorted = published
    .map((note, index) => ({ note, index }))
    .sort((a, b) => {
      const byPublished = time(b.note.published_at) - time(a.note.published_at);
      if (byPublished !== 0) return byPublished;
      const byCreated = time(b.note.created_at) - time(a.note.created_at);
      if (byCreated !== 0) return byCreated;
      return a.index - b.index;
    })
    .map((entry) => entry.note);
  return sorted.slice(0, limit);
}

const arbList = fc.array(arbDatedNote, { minLength: 0, maxLength: 12 });

describe('Property 4: latest-notes selection matches the reference model', () => {
  test('the result equals the reference for the default limit', async () => {
    fc.assert(
      fc.property(arbList, (notes) => {
        expect(selectLatestNotes(notes).map((n) => n.title)).toEqual(
          referenceLatest(notes, 3).map((n) => n.title),
        );
      }),
      { numRuns: 300 },
    );
  });

  test('the result equals the reference for any limit', async () => {
    fc.assert(
      fc.property(arbList, fc.integer({ min: 1, max: 6 }), (notes, limit) => {
        expect(selectLatestNotes(notes, limit).map((n) => n.title)).toEqual(
          referenceLatest(notes, limit).map((n) => n.title),
        );
      }),
      { numRuns: 300 },
    );
  });

  test('the result holds at most 3 notes, and never an unpublished one', async () => {
    fc.assert(
      fc.property(arbNote as fc.Arbitrary<Note>, (note) => {
        const selected = selectLatestNotes([note]);
        expect(selected.length).toBeLessThanOrEqual(3);
        for (const entry of selected) expect(entry.published).not.toBe(false);
      }),
      { numRuns: 300 },
    );
  });

  test('the length is min(3, published count)', async () => {
    fc.assert(
      fc.property(arbList, (notes) => {
        const publishedCount = notes.filter((n) => n.published !== false).length;
        expect(selectLatestNotes(notes).length).toBe(Math.min(3, publishedCount));
      }),
      { numRuns: 300 },
    );
  });

  test('unparseable and missing dates count as oldest', async () => {
    // Values that never yield a timestamp, against a note that always does.
    const UNPARSEABLE = [null, undefined, '', 'not-a-date'] as const;
    fc.assert(
      fc.property(fc.constantFrom(...UNPARSEABLE), (undated) => {
        const dated: Note = {
          title: 'dated',
          slug: 'dated',
          body: '',
          tag: 'T',
          published_at: '2026-01-01T00:00:00.000Z',
          created_at: '2026-01-01T00:00:00.000Z',
        };
        const stale: Note = { title: 'stale', slug: 'stale', body: '', tag: 'T', published_at: undated };
        expect(selectLatestNotes([stale, dated]).map((n) => n.title)).toEqual(['dated', 'stale']);
        expect(selectLatestNotes([dated, stale]).map((n) => n.title)).toEqual(['dated', 'stale']);
      }),
      { numRuns: 200 },
    );
  });

  test('equal published_at ties are broken by created_at descending', async () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_700_000_000 }),
        fc.boolean(),
        (seconds, flip) => {
          const published = new Date(seconds * 1000).toISOString();
          const early = new Date(seconds * 1000 - 60_000).toISOString();
          const late = new Date(seconds * 1000 + 60_000).toISOString();
          const first: Note = { title: 'first', slug: 'first', body: '', tag: 'T', published_at: published, created_at: early };
          const second: Note = { title: 'second', slug: 'second', body: '', tag: 'T', published_at: published, created_at: late };
          const notes = flip ? [first, second] : [second, first];
          expect(selectLatestNotes(notes).map((n) => n.title)).toEqual(['second', 'first']);
        },
      ),
      { numRuns: 200 },
    );
  });
});
