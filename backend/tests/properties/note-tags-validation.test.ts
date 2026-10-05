import { describe, expect, test } from 'bun:test';
import fc from 'fast-check';
import {
  NOTE_TAGS_MAX,
  NOTE_TAG_MAX_LENGTH,
  hasNoteTagsInput,
  normalizeNoteTag,
  validateNoteTags,
} from '../../src/services/validation';
import edgeCases from '../fixtures/validation-edge-cases.json';

// Feature: multi-tag-notes, Property 1: Note tag validation is total, normalizing and bounded
// Backend half. The frontend admin validator runs the same rows from this
// shared fixture, so the two are provably in agreement.

const arbTagText = fc.oneof(
  fc.string({ maxLength: 24 }),
  fc.constantFrom('reflection', ' Reflection ', 'DEV   LOG', 'a,b', 'a\u0007b', '', '   ', 'x'.repeat(16), 'x'.repeat(17)),
);

const arbEntry = fc.oneof(arbTagText, fc.constant(null), fc.integer(), fc.constant({}));

const arbBody = fc.oneof(
  fc.record({ tags: fc.array(arbEntry, { maxLength: 6 }) }),
  fc.record({ tag: arbEntry }),
  fc.record({ tags: fc.array(arbTagText, { maxLength: 6 }), tag: arbTagText }),
  fc.record({ tags: fc.anything() }),
  fc.constant({}),
) as fc.Arbitrary<Record<string, unknown>>;

describe('Property 1: note tag validation', () => {
  test('it never throws, and any success is 1 to 3 unique, normalized, short, comma-free tags', () => {
    fc.assert(
      fc.property(arbBody, (body) => {
        const result = validateNoteTags(body);
        if (!result.ok) {
          expect(result.error.status).toBe(400);
          expect(result.error.field).toBe('tags');
          expect(result.error.message.length).toBeGreaterThan(0);
          return;
        }
        expect(result.tags.length).toBeGreaterThanOrEqual(1);
        expect(result.tags.length).toBeLessThanOrEqual(NOTE_TAGS_MAX);
        expect(new Set(result.tags).size).toBe(result.tags.length);
        for (const tag of result.tags) {
          expect(tag).toBe(normalizeNoteTag(tag));
          expect(tag).not.toBe('');
          expect(tag.length).toBeLessThanOrEqual(NOTE_TAG_MAX_LENGTH);
          expect(tag).not.toMatch(/[,\u0000-\u001F\u007F]/);
        }
      }),
      { numRuns: 500 },
    );
  });

  test('normalizing is idempotent, so a stored tag re-submitted unchanged is accepted as-is', () => {
    fc.assert(
      fc.property(arbTagText, (tag) => {
        const once = normalizeNoteTag(tag);
        expect(normalizeNoteTag(once)).toBe(once);
      }),
      { numRuns: 300 },
    );
    fc.assert(
      fc.property(fc.array(arbTagText, { maxLength: 5 }), (tags) => {
        const first = validateNoteTags({ tags });
        if (!first.ok) return;
        const again = validateNoteTags({ tags: first.tags });
        expect(again).toEqual(first);
      }),
      { numRuns: 300 },
    );
  });

  test('the legacy single tag behaves exactly like a one-item list', () => {
    fc.assert(
      fc.property(arbEntry, (tag) => {
        expect(validateNoteTags({ tag })).toEqual(validateNoteTags({ tags: [tag] }));
      }),
      { numRuns: 300 },
    );
  });

  test('tags win over the legacy tag when both are present', () => {
    fc.assert(
      fc.property(fc.array(arbTagText, { maxLength: 4 }), arbTagText, (tags, tag) => {
        expect(validateNoteTags({ tags, tag })).toEqual(validateNoteTags({ tags }));
      }),
      { numRuns: 200 },
    );
  });

  test('order is kept and repeats collapse to the first spelling', () => {
    expect(validateNoteTags({ tags: ['b', 'a', 'B', 'c'] })).toEqual({ ok: true, tags: ['B', 'A', 'C'] });
  });

  test('a body with no tag value at all is reported as absent, not invalid', () => {
    expect(hasNoteTagsInput({})).toBe(false);
    expect(hasNoteTagsInput({ title: 'x' })).toBe(false);
    expect(hasNoteTagsInput({ tag: 'x' })).toBe(true);
    expect(hasNoteTagsInput({ tags: [] })).toBe(true);
  });
});

describe('shared edge-case table', () => {
  test('the limits in the table are the limits in the code', () => {
    expect(edgeCases.noteTagsMax).toBe(NOTE_TAGS_MAX);
    expect(edgeCases.noteTagMaxLength).toBe(NOTE_TAG_MAX_LENGTH);
  });

  for (const row of edgeCases.noteTags) {
    test(row.label, () => {
      const result = validateNoteTags(row.body as Record<string, unknown>);
      if (row.valid) {
        expect(result).toEqual({ ok: true, tags: row.tags! });
      } else {
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.field).toBe(row.field!);
      }
    });
  }
});
