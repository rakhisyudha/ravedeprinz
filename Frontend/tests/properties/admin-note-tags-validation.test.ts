import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import fc from 'fast-check';
import {
  NOTE_TAGS_MAX,
  NOTE_TAG_MAX_LENGTH,
  normalizeNoteTag,
  parseTagsText,
  validateNoteTagsInput,
} from '../../src/lib/adminValidation';
import { validateNoteTags } from '../../../Backend/src/services/validation';

// Feature: multi-tag-notes, Property 7: The admin tag validator agrees with the API's
// Frontend half of Property 1. The backend half runs the same rows from the
// shared fixture, and here the two validators are also run against each other.
type EdgeCases = {
  noteTagsMax: number;
  noteTagMaxLength: number;
  noteTags: Array<{
    label: string;
    body: { tags?: unknown; tag?: unknown };
    valid: boolean;
    tags?: string[];
    field?: string;
  }>;
};

const edgeCases = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('../../../Backend/tests/fixtures/validation-edge-cases.json', import.meta.url)),
    'utf8',
  ),
) as EdgeCases;

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

describe('Property 7: admin tag validation', () => {
  test('the limits here are the limits in the shared table', () => {
    expect(NOTE_TAGS_MAX).toBe(edgeCases.noteTagsMax);
    expect(NOTE_TAG_MAX_LENGTH).toBe(edgeCases.noteTagMaxLength);
  });

  for (const row of edgeCases.noteTags) {
    test(`shared table: ${row.label}`, () => {
      const result = validateNoteTagsInput(row.body);
      if (row.valid) {
        expect(result).toEqual({ ok: true, tags: row.tags! });
      } else {
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.field).toBe(row.field!);
      }
    });
  }

  test('for any body it reaches the same verdict, tags and message as the API validator', () => {
    fc.assert(
      fc.property(arbBody, (body) => {
        const mine = validateNoteTagsInput(body);
        const theirs = validateNoteTags(body);
        expect(mine.ok).toBe(theirs.ok);
        if (mine.ok && theirs.ok) expect(mine.tags).toEqual(theirs.tags);
        if (!mine.ok && !theirs.ok) {
          expect(mine.error.field).toBe(theirs.error.field);
          expect(mine.error.message).toBe(theirs.error.message);
        }
      }),
      { numRuns: 500 },
    );
  });

  test('normalizing agrees with the API and is idempotent', () => {
    fc.assert(
      fc.property(arbTagText, (tag) => {
        expect(normalizeNoteTag(normalizeNoteTag(tag))).toBe(normalizeNoteTag(tag));
        const api = validateNoteTags({ tags: [tag] });
        if (api.ok) expect(api.tags).toEqual([normalizeNoteTag(tag)]);
      }),
      { numRuns: 300 },
    );
  });
});

describe('the comma-separated text field', () => {
  test('parsing yields normalized, unique, non-blank, comma-free tags', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 80 }), (text) => {
        const tags = parseTagsText(text);
        expect(new Set(tags).size).toBe(tags.length);
        for (const tag of tags) {
          expect(tag).toBe(normalizeNoteTag(tag));
          expect(tag).not.toBe('');
          expect(tag).not.toContain(',');
        }
      }),
      { numRuns: 300 },
    );
  });

  test('a half-typed tag is kept: a trailing comma or space adds nothing and loses nothing', () => {
    expect(parseTagsText('reflection, ')).toEqual(['REFLECTION']);
    expect(parseTagsText('reflection,')).toEqual(['REFLECTION']);
    expect(parseTagsText(' , ,, ')).toEqual([]);
    expect(parseTagsText('a, b ,C, a')).toEqual(['A', 'B', 'C']);
  });

  test('joining a parsed list and parsing it again gives the same list, so the field never fights the form', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 80 }), (text) => {
        const tags = parseTagsText(text);
        expect(parseTagsText(tags.join(', '))).toEqual(tags);
      }),
      { numRuns: 300 },
    );
  });
});
