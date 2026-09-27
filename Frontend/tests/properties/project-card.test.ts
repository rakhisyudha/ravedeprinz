import { describe, expect, test } from 'vitest';
import fc from 'fast-check';
import { metaExcerpt } from '../../src/lib/seo';

// Feature: portfolio-engagement, Property 15 (surviving half): Meta excerpt bounds
// The project card model this property originally covered was removed with the
// per-project OG route. The excerpt bound it depended on is still shared
// behaviour, so the property stays.

describe('Property 15: meta excerpt bounds', () => {
  test('never exceeds its bound, for any input and any max', () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.string(), fc.constant(null), fc.constant(undefined)),
        fc.integer({ min: 4, max: 200 }),
        (text, max) => {
          expect(metaExcerpt(text, max).length).toBeLessThanOrEqual(max);
        },
      ),
      { numRuns: 400 },
    );
  });

  test('holds no line breaks and no doubled whitespace', () => {
    fc.assert(
      fc.property(
        fc.string().map((value) => value.replace(/[^\S ]+/g, ' \n ')),
        (text) => {
          const excerpt = metaExcerpt(text, 160);
          expect(excerpt).not.toMatch(/[\n\r\t]/);
          expect(excerpt).not.toMatch(/\s\s/);
        },
      ),
      { numRuns: 400 },
    );
  });

  test('passes short text through and marks a cut with an ellipsis', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 160 }), (text) => {
        const excerpt = metaExcerpt(text, 160);
        if (text.trim().replace(/\s+/g, ' ').length <= 160) {
          expect(excerpt.endsWith('…')).toBe(false);
        } else {
          expect(excerpt.endsWith('…')).toBe(true);
        }
      }),
      { numRuns: 300 },
    );
  });

  test('a cut keeps a prefix of the source, so the excerpt stays readable', () => {
    // Above the 160 bound, and with no whitespace, so the cut is a plain
    // prefix rather than a re-flowed sentence.
    fc.assert(
      fc.property(fc.stringMatching(/^[a-zA-Z0-9.,;:!?-]{161,300}$/), (text) => {
        const excerpt = metaExcerpt(text, 160);
        expect(excerpt.endsWith('…')).toBe(true);
        expect(text.startsWith(excerpt.slice(0, -1))).toBe(true);
      }),
      { numRuns: 300 },
    );
  });

  test('blank input yields an empty excerpt rather than filler text', () => {
    expect(metaExcerpt('')).toBe('');
    expect(metaExcerpt('   ')).toBe('');
    expect(metaExcerpt(null)).toBe('');
    expect(metaExcerpt(undefined)).toBe('');
  });

  test('the default bound is 160 characters', () => {
    expect(metaExcerpt('x'.repeat(200)).length).toBe(160);
    expect(metaExcerpt('x'.repeat(160)).length).toBe(160);
    expect(metaExcerpt('x'.repeat(161)).endsWith('…')).toBe(true);
  });
});
