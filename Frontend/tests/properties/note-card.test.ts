import { describe, expect, test } from 'vitest';
import fc from 'fast-check';
import { buildNoteCardModel } from '../../src/lib/ogCard';
import { buildNoteCardReference } from '../fixtures/noteCardReference';
import type { Note } from '../../src/lib/cms';
import { arbNote } from './arbitraries';

// Feature: portfolio-engagement, Property 16: Note card model is unchanged by the refactor
// The reference in tests/fixtures/noteCardReference.ts is the pre-refactor
// inline computation, frozen as an oracle. Any drift in the shared renderer
// shows up here as a model mismatch.
const asNote = arbNote as fc.Arbitrary<Note>;

describe('Property 16: note card model is unchanged by the refactor', () => {
  test('the model equals the frozen pre-refactor computation for any note', async () => {
    fc.assert(
      fc.property(asNote, (note) => {
        expect(buildNoteCardModel(note)).toEqual(buildNoteCardReference(note));
      }),
      { numRuns: 300 },
    );
  });

  test('a null note yields the same generic note card as before', () => {
    expect(buildNoteCardModel(null)).toEqual(buildNoteCardReference(null));
    expect(buildNoteCardModel(null)).toEqual({
      eyebrow: 'NOTES',
      title: 'ravedeprinz',
      excerpt: 'Short transmissions from the workbench.',
      footer: 'RAVEDEPRINZ.ME  /  NOTES',
      imageUrl: null,
    });
  });

  test('a note with no body or subtitle keeps the generic excerpt', () => {
    const bare: Note = { title: 'Bare', slug: 'bare', body: '', tag: 'LOG' };
    expect(buildNoteCardModel(bare)).toEqual(buildNoteCardReference(bare));
    expect(buildNoteCardModel(bare).excerpt).toBe('Short transmissions from the workbench.');
  });

  test('a subtitle still wins over the body, as before', () => {
    const note: Note = {
      title: 'T',
      slug: 't',
      body: 'a much longer body that would otherwise become the excerpt',
      tag: 'LOG',
      subtitle: 'The subtitle.',
    };
    expect(buildNoteCardModel(note).excerpt).toBe('The subtitle.');
  });

  test('the title is still cut at 80 characters', async () => {
    fc.assert(
      fc.property(fc.string({ minLength: 81, maxLength: 200 }), (title) => {
        const note: Note = { title, slug: 's', body: 'b', tag: 'LOG' };
        expect(buildNoteCardModel(note).title).toBe(title.slice(0, 80));
        expect(buildNoteCardReference(note).title).toBe(buildNoteCardModel(note).title);
      }),
      { numRuns: 200 },
    );
  });

  test('the tag is still uppercased, and an absent tag still falls back to NOTES', async () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 12 }), (tag) => {
        const note: Note = { title: 'T', slug: 't', body: 'b', tag };
        expect(buildNoteCardModel(note).eyebrow).toBe(tag.toUpperCase());
        expect(buildNoteCardModel(note)).toEqual(buildNoteCardReference(note));
      }),
      { numRuns: 200 },
    );
    // `?? 'NOTES'` only fires for a missing tag, which is the behaviour the
    // refactor must preserve: an empty tag uppercases to an empty eyebrow.
    const untagged: Note = { title: 'T', slug: 't', body: 'b', tag: '' };
    expect(buildNoteCardModel(untagged).eyebrow).toBe('');
    expect(buildNoteCardModel(untagged)).toEqual(buildNoteCardReference(untagged));
  });

  test('the image URL is still the note image, unchanged', async () => {
    fc.assert(
      fc.property(asNote, (note) => {
        expect(buildNoteCardModel(note).imageUrl).toBe(buildNoteCardReference(note).imageUrl);
      }),
      { numRuns: 200 },
    );
  });
});
