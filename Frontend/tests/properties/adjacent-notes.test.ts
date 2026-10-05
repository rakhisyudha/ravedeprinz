import { describe, expect, test } from 'vitest';
import fc from 'fast-check';
import { adjacentNotes } from '../../src/lib/noteNav';
import { noteSlug, sortNewestFirst } from '../../src/lib/notesPreview';
import type { Note } from '../../src/lib/cms';

// Feature: notes-reading-tools, Property 1: Previous/next links form a single newest-first chain

const DATES = [
  null,
  undefined,
  '',
  'not-a-date',
  '2020-01-01T00:00:00.000Z',
  '2024-06-06T06:06:06.000Z',
  '2026-12-31T23:59:59.000Z',
] as const;

/** Notes with unique slugs (`n0`, `n1`, ...) and deliberately clashing dates. */
const arbNotes = fc
  .array(
    fc.record({
      published: fc.constantFrom(true, true, true, false, undefined, null),
      published_at: fc.constantFrom(...DATES),
      created_at: fc.constantFrom(...DATES),
    }),
    { minLength: 0, maxLength: 12 },
  )
  .map(
    (rows) =>
      rows.map((row, index) => ({
        ...row,
        title: `Note ${index}`,
        slug: `n${index}`,
        id: `id-${index}`,
        body: '',
        tag: 'T',
      })) as Note[],
  );

function time(value?: string | null): number {
  if (!value) return Number.NEGATIVE_INFINITY;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
}

/** Independent reference for the order, written without sortNewestFirst. */
function referenceOrder(notes: Note[]): string[] {
  return notes
    .filter((n) => n.published !== false)
    .map((note, index) => ({ note, index }))
    .sort((a, b) => {
      const byPublished = time(b.note.published_at) - time(a.note.published_at);
      if (byPublished !== 0) return byPublished;
      const byCreated = time(b.note.created_at) - time(a.note.created_at);
      if (byCreated !== 0) return byCreated;
      return a.index - b.index;
    })
    .map((entry) => entry.note.slug);
}

describe('Property 1: previous/next links form a single newest-first chain', () => {
  test('following older from the newest note visits every published note once, in order', () => {
    fc.assert(
      fc.property(arbNotes, (notes) => {
        const order = referenceOrder(notes);
        if (order.length === 0) return;

        const visited: string[] = [];
        let current: string | undefined = order[0];
        while (current !== undefined) {
          visited.push(current);
          const next: Note | null = adjacentNotes(notes, current).older;
          current = next?.slug;
          expect(visited.length).toBeLessThanOrEqual(order.length);
        }
        expect(visited).toEqual(order);
      }),
      { numRuns: 300 },
    );
  });

  test('newer is the inverse of older', () => {
    fc.assert(
      fc.property(arbNotes, (notes) => {
        for (const slug of referenceOrder(notes)) {
          const { older } = adjacentNotes(notes, slug);
          if (older) expect(adjacentNotes(notes, older.slug).newer?.slug).toBe(slug);
          const { newer } = adjacentNotes(notes, slug);
          if (newer) expect(adjacentNotes(notes, newer.slug).older?.slug).toBe(slug);
        }
      }),
      { numRuns: 300 },
    );
  });

  test('the newest note has no newer note and the oldest has no older note', () => {
    fc.assert(
      fc.property(arbNotes, (notes) => {
        const order = referenceOrder(notes);
        if (order.length === 0) return;
        expect(adjacentNotes(notes, order[0]!).newer).toBeNull();
        expect(adjacentNotes(notes, order[order.length - 1]!).older).toBeNull();
      }),
      { numRuns: 300 },
    );
  });

  test('neighbours are never unpublished and never the note itself', () => {
    fc.assert(
      fc.property(arbNotes, (notes) => {
        for (const slug of referenceOrder(notes)) {
          const { newer, older } = adjacentNotes(notes, slug);
          for (const neighbour of [newer, older]) {
            if (!neighbour) continue;
            expect(neighbour.published).not.toBe(false);
            expect(neighbour.slug).not.toBe(slug);
          }
        }
      }),
      { numRuns: 300 },
    );
  });

  test('an unknown key, or an unpublished note, has no neighbours', () => {
    fc.assert(
      fc.property(arbNotes, fc.string(), (notes, key) => {
        const known = new Set(notes.flatMap((n) => [n.slug, n.id ?? '']));
        fc.pre(!known.has(key));
        expect(adjacentNotes(notes, key)).toEqual({ newer: null, older: null });
      }),
      { numRuns: 200 },
    );
    const notes = [
      { title: 'A', slug: 'a', body: '', tag: 'T', published: true, published_at: '2026-01-02T00:00:00.000Z' },
      { title: 'B', slug: 'b', body: '', tag: 'T', published: false, published_at: '2026-01-01T00:00:00.000Z' },
    ] as Note[];
    expect(adjacentNotes(notes, 'b')).toEqual({ newer: null, older: null });
  });

  test('a note is found by its id as well as by its slug', () => {
    const notes = [
      { id: 'u1', title: 'New', slug: 'new', body: '', tag: 'T', published_at: '2026-02-01T00:00:00.000Z' },
      { id: 'u2', title: 'Old', slug: 'old', body: '', tag: 'T', published_at: '2026-01-01T00:00:00.000Z' },
    ] as Note[];
    expect(adjacentNotes(notes, 'u1').older?.slug).toBe('old');
    expect(adjacentNotes(notes, 'u2').newer?.slug).toBe('new');
  });

  test('notes without a stored slug are found by their title slug', () => {
    const notes = [
      { title: 'Second Note', slug: '', body: '', tag: 'T', published_at: '2026-02-01T00:00:00.000Z' },
      { title: 'First Note', slug: '', body: '', tag: 'T', published_at: '2026-01-01T00:00:00.000Z' },
    ] as Note[];
    expect(noteSlug(notes[0]!)).toBe('second-note');
    expect(adjacentNotes(notes, 'second-note').older?.title).toBe('First Note');
  });

  test('undated notes keep array order, so fallback notes chain in the order they are listed', () => {
    const notes = ['a', 'b', 'c'].map((slug) => ({ title: slug, slug, body: '', tag: 'T' })) as Note[];
    expect(sortNewestFirst(notes).map((n) => n.slug)).toEqual(['a', 'b', 'c']);
    expect(adjacentNotes(notes, 'b')).toMatchObject({ newer: { slug: 'a' }, older: { slug: 'c' } });
  });
});
