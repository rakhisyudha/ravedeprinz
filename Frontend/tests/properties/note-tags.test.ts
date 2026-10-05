import { describe, expect, test } from 'vitest';
import fc from 'fast-check';
import {
  MAX_SELECTED_TAGS,
  TAG_PARAM_MAX,
  collectTags,
  facetChips,
  filterNotesByTags,
  noteTagList,
  normalizeTag,
  parseTagParams,
  primaryTag,
  tagHref,
  tagsHref,
} from '../../src/lib/noteTags';
import type { Note } from '../../src/lib/cms';

// Feature: multi-tag-notes, Property 2: A note's tag list is total and prefers tags over tag
// Feature: multi-tag-notes, Property 3: Tag collection counts a note once under each of its tags
// Feature: multi-tag-notes, Property 4: The combined filter matches the reference model
// Feature: multi-tag-notes, Property 5: Facet chips never lead to an empty list
// Feature: multi-tag-notes, Property 6: The ?tag= query round-trips

// Case and whitespace variants of the same few tags, plus blanks, so merging
// and skipping are exercised constantly rather than rarely.
const POOL = ['REFLECTION', 'reflection', '  Reflection ', 'MEMOIR', 'memoir', 'LOG', 'Dev  Log', 'dev log', '', '   '] as const;

const arbNotes = fc
  .array(
    fc.record({
      tag: fc.constantFrom(...POOL),
      // Some notes carry only the legacy single tag, some a list, some a bad list.
      tags: fc.oneof(
        fc.constant(undefined),
        fc.constant(null),
        fc.array(fc.constantFrom(...POOL), { maxLength: 3 }),
      ),
    }),
    { minLength: 0, maxLength: 14 },
  )
  .map(
    (rows) =>
      rows.map((row, index) => ({ ...row, title: `N${index}`, slug: `n${index}`, body: '' })) as Note[],
  );

/** Independent of the implementation. */
const refNormalize = (value: string) => value.replace(/\s+/g, ' ').trim().toUpperCase();

function refTags(note: Note): string[] {
  const clean = (values: unknown[]) => {
    const out: string[] = [];
    for (const value of values) {
      if (typeof value !== 'string') continue;
      const tag = refNormalize(value);
      if (tag !== '' && !out.includes(tag)) out.push(tag);
    }
    return out;
  };
  const fromList = Array.isArray(note.tags) ? clean(note.tags) : [];
  return fromList.length > 0 ? fromList : clean([note.tag]);
}

/** Every distinct normalized tag in the pool, for building selections. */
const DISTINCT = ['REFLECTION', 'MEMOIR', 'LOG', 'DEV LOG', 'MISSING'] as const;
const arbSelection = fc.uniqueArray(fc.constantFrom(...DISTINCT), { maxLength: 3 });

describe('Property 2: a note\'s tag list', () => {
  test('it equals the reference for any note, with tags preferred and tag as the fallback', () => {
    fc.assert(
      fc.property(arbNotes, (notes) => {
        for (const note of notes) expect(noteTagList(note)).toEqual(refTags(note));
      }),
      { numRuns: 300 },
    );
  });

  test('it is total: a malformed tags value never throws and never yields a non-string', () => {
    fc.assert(
      fc.property(fc.anything(), fc.anything(), (tags, tag) => {
        const list = noteTagList({ tag: tag as string, tags });
        expect(Array.isArray(list)).toBe(true);
        for (const entry of list) {
          expect(typeof entry).toBe('string');
          expect(entry).toBe(refNormalize(entry));
          expect(entry).not.toBe('');
        }
        expect(new Set(list).size).toBe(list.length);
      }),
      { numRuns: 400 },
    );
  });

  test('tags win over the single tag, and a blank list falls back to it', () => {
    expect(noteTagList({ tag: 'old', tags: ['new', 'other'] })).toEqual(['NEW', 'OTHER']);
    expect(noteTagList({ tag: 'old', tags: [] })).toEqual(['OLD']);
    expect(noteTagList({ tag: 'old', tags: ['', '  '] })).toEqual(['OLD']);
    expect(noteTagList({ tag: 'old' })).toEqual(['OLD']);
    expect(noteTagList({ tag: '', tags: null })).toEqual([]);
  });

  test('the primary tag is the first tag, or empty when there are none', () => {
    fc.assert(
      fc.property(arbNotes, (notes) => {
        for (const note of notes) expect(primaryTag(note)).toBe(refTags(note)[0] ?? '');
      }),
      { numRuns: 200 },
    );
  });
});

describe('Property 3: tag collection', () => {
  test('each tag counts the notes carrying it, so a note is counted once under each of its tags', () => {
    fc.assert(
      fc.property(arbNotes, (notes) => {
        const entries = collectTags(notes);
        const all = new Set(notes.flatMap(refTags));
        expect(new Set(entries.map((entry) => entry.tag))).toEqual(all);
        for (const { tag, count } of entries) {
          expect(count).toBe(notes.filter((note) => refTags(note).includes(tag)).length);
        }
        expect(entries.reduce((sum, entry) => sum + entry.count, 0)).toBe(
          notes.reduce((sum, note) => sum + refTags(note).length, 0),
        );
      }),
      { numRuns: 300 },
    );
  });

  test('most-used first, ties alphabetical', () => {
    fc.assert(
      fc.property(arbNotes, (notes) => {
        const entries = collectTags(notes);
        for (let i = 1; i < entries.length; i += 1) {
          const prev = entries[i - 1]!;
          const next = entries[i]!;
          expect(prev.count).toBeGreaterThanOrEqual(next.count);
          if (prev.count === next.count) expect(prev.tag < next.tag).toBe(true);
        }
      }),
      { numRuns: 300 },
    );
  });

  test('a note with three tags is counted under all three', () => {
    const notes = [{ title: 'A', slug: 'a', body: '', tag: 'x', tags: ['one', 'two', 'three'] }] as Note[];
    expect(collectTags(notes)).toEqual([
      { tag: 'ONE', count: 1 },
      { tag: 'THREE', count: 1 },
      { tag: 'TWO', count: 1 },
    ]);
  });
});

describe('Property 4: the combined filter (every selected tag)', () => {
  test('the result equals the reference, in original order', () => {
    fc.assert(
      fc.property(arbNotes, arbSelection, (notes, selected) => {
        const expected = notes.filter((note) => selected.every((tag) => refTags(note).includes(tag)));
        expect(filterNotesByTags(notes, selected).map((n) => n.slug)).toEqual(expected.map((n) => n.slug));
      }),
      { numRuns: 400 },
    );
  });

  test('an empty selection keeps every note, and case or spacing in the selection does not matter', () => {
    fc.assert(
      fc.property(arbNotes, (notes) => {
        expect(filterNotesByTags(notes, [])).toEqual(notes);
        expect(filterNotesByTags(notes, ['', '  '])).toEqual(notes);
        expect(filterNotesByTags(notes, ['  dev   log '])).toEqual(filterNotesByTags(notes, ['DEV LOG']));
      }),
      { numRuns: 100 },
    );
  });

  test('adding a tag can only narrow the result', () => {
    fc.assert(
      fc.property(arbNotes, arbSelection, fc.constantFrom(...DISTINCT), (notes, selected, extra) => {
        const before = filterNotesByTags(notes, selected).map((n) => n.slug);
        const after = filterNotesByTags(notes, [...selected, extra]).map((n) => n.slug);
        for (const slug of after) expect(before).toContain(slug);
        expect(after.length).toBeLessThanOrEqual(before.length);
      }),
      { numRuns: 300 },
    );
  });

  test('filtering twice by the same selection is the same as once', () => {
    fc.assert(
      fc.property(arbNotes, arbSelection, (notes, selected) => {
        const once = filterNotesByTags(notes, selected);
        expect(filterNotesByTags(once, selected)).toEqual(once);
      }),
      { numRuns: 200 },
    );
  });
});

describe('Property 5: facet chips', () => {
  const paramsOf = (href: string) => new URL(href, 'https://ravedeprinz.me').searchParams;

  test('chips are the collected tags, in the same order, whatever is selected', () => {
    fc.assert(
      fc.property(arbNotes, arbSelection, (notes, selected) => {
        expect(facetChips(notes, selected).map((chip) => chip.tag)).toEqual(collectTags(notes).map((e) => e.tag));
      }),
      { numRuns: 300 },
    );
  });

  test('counts follow the selection: an unselected chip counts what adding it would leave', () => {
    fc.assert(
      fc.property(arbNotes, arbSelection, (notes, selected) => {
        const current = filterNotesByTags(notes, selected).length;
        for (const chip of facetChips(notes, selected)) {
          const expected = chip.selected
            ? current
            : filterNotesByTags(notes, [...selected, chip.tag]).length;
          expect(chip.count).toBe(expected);
          expect(chip.selected).toBe(selected.includes(chip.tag));
        }
      }),
      { numRuns: 400 },
    );
  });

  test('a chip is disabled exactly when it is unselected and would leave nothing or exceed the limit', () => {
    fc.assert(
      fc.property(arbNotes, arbSelection, (notes, selected) => {
        for (const chip of facetChips(notes, selected)) {
          const expected = !chip.selected && (chip.count === 0 || selected.length >= MAX_SELECTED_TAGS);
          expect(chip.disabled).toBe(expected);
        }
      }),
      { numRuns: 400 },
    );
  });

  test('following any enabled chip never lands on an empty list', () => {
    fc.assert(
      fc.property(arbNotes, arbSelection, (notes, selected) => {
        const currentIsEmpty = filterNotesByTags(notes, selected).length === 0;
        for (const chip of facetChips(notes, selected)) {
          if (chip.disabled) continue;
          // Removing a tag from a selection nothing matches may still match nothing.
          if (chip.selected && currentIsEmpty) continue;
          const next = parseTagParams(paramsOf(chip.href));
          expect(filterNotesByTags(notes, next).length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 400 },
    );
  });

  test('a selected chip links to the selection without it, an unselected one to the selection with it', () => {
    const notes = [
      { title: 'A', slug: 'a', body: '', tag: 'x', tags: ['one', 'two'] },
      { title: 'B', slug: 'b', body: '', tag: 'x', tags: ['one', 'two', 'three'] },
    ] as Note[];
    const chips = facetChips(notes, ['ONE']);
    const byTag = Object.fromEntries(chips.map((chip) => [chip.tag, chip]));
    expect(byTag.ONE!.href).toBe('/notes');
    expect(byTag.TWO!.href).toBe('/notes?tag=ONE&tag=TWO');
    expect(byTag.THREE!.href).toBe('/notes?tag=ONE&tag=THREE');
    expect(byTag.THREE!.count).toBe(1);
  });

  test('with the limit reached, unselected chips are disabled even if they would match', () => {
    const notes = [{ title: 'A', slug: 'a', body: '', tag: 'x', tags: ['a', 'b', 'c'] }, { title: 'B', slug: 'b', body: '', tag: 'x', tags: ['d'] }] as Note[];
    const chips = facetChips(notes, ['A', 'B', 'C']);
    expect(chips.filter((chip) => chip.selected).every((chip) => !chip.disabled)).toBe(true);
    expect(chips.find((chip) => chip.tag === 'D')!.disabled).toBe(true);
  });

  test('a selection no note matches disables every unselected chip and the way back is ALL', () => {
    const notes = [{ title: 'A', slug: 'a', body: '', tag: 'x', tags: ['one', 'two'] }] as Note[];
    const chips = facetChips(notes, ['NOPE']);
    expect(chips.every((chip) => chip.disabled)).toBe(true);
  });
});

describe('Property 6: the ?tag= query', () => {
  const arbTagText = fc.string({ minLength: 1, maxLength: 20 });

  test('parseTagParams returns at most three normalized, unique, capped tags', () => {
    fc.assert(
      fc.property(fc.array(fc.string({ maxLength: 400 }), { maxLength: 8 }), (values) => {
        const params = new URLSearchParams();
        for (const value of values) params.append('tag', value);
        const parsed = parseTagParams(params);
        expect(parsed.length).toBeLessThanOrEqual(MAX_SELECTED_TAGS);
        expect(new Set(parsed).size).toBe(parsed.length);
        for (const tag of parsed) {
          expect(tag).toBe(normalizeTag(tag));
          expect(tag).not.toBe('');
          expect(tag.length).toBeLessThanOrEqual(TAG_PARAM_MAX);
        }
      }),
      { numRuns: 300 },
    );
  });

  test('an absent or blank parameter is no filter', () => {
    expect(parseTagParams(new URLSearchParams())).toEqual([]);
    expect(parseTagParams(new URLSearchParams('tag='))).toEqual([]);
    expect(parseTagParams(new URLSearchParams('tag=%20%20'))).toEqual([]);
  });

  test('values keep their order, repeats collapse, and only the first three count', () => {
    expect(parseTagParams(new URLSearchParams('tag=log&tag=note&tag=LOG'))).toEqual(['LOG', 'NOTE']);
    expect(parseTagParams(new URLSearchParams('tag=a&tag=b&tag=c&tag=d'))).toEqual(['A', 'B', 'C']);
  });

  test('tagsHref round-trips through the parser for any tags', () => {
    fc.assert(
      fc.property(fc.array(arbTagText, { maxLength: 3 }), (tags) => {
        const expected = [...new Set(tags.map(refNormalize).filter((tag) => tag !== ''))];
        const href = tagsHref(tags);
        expect(href.startsWith('/notes')).toBe(true);
        const query = href.includes('?') ? href.slice(href.indexOf('?') + 1) : '';
        expect(parseTagParams(new URLSearchParams(query))).toEqual(expected);
      }),
      { numRuns: 300 },
    );
  });

  test('no selection links to the plain list', () => {
    expect(tagsHref([])).toBe('/notes');
    expect(tagsHref(['', '  '])).toBe('/notes');
  });

  test('reserved characters are encoded, so a tag can never add parameters', () => {
    expect(tagHref('a&b=c#d')).toBe('/notes?tag=A%26B%3DC%23D');
    expect(new URL(tagHref('a&b=c#d'), 'https://ravedeprinz.me').searchParams.getAll('tag')).toEqual(['A&B=C#D']);
    expect(tagsHref(['one', 'two'])).toBe('/notes?tag=ONE&tag=TWO');
  });

  test('a link never carries more than three tags', () => {
    expect(tagsHref(['a', 'b', 'c', 'd', 'e'])).toBe('/notes?tag=A&tag=B&tag=C');
  });
});
