import { describe, expect, test } from 'vitest';
import fc from 'fast-check';
import { buildNowStatus } from '../../src/lib/nowStatus';
import { nowContent } from '../../src/data/site';
import { arbNowPayload } from './arbitraries';

// Feature: portfolio-engagement, Property 7: Now status line composition and
// fallback. The line is now minimal — what is being built, and since when — so
// the availability status and the now entry's description are deliberately not
// part of it.

const fallbackCurrent = nowContent.current;

function isUsable(current: typeof fallbackCurrent | null): boolean {
  return Boolean(current?.label?.trim()) && Boolean(current?.title?.trim());
}

describe('Property 7: now status line composition and fallback', () => {
  test('the fields come entirely from live or entirely from the fallback', () => {
    fc.assert(
      fc.property(arbNowPayload, (payload) => {
        const view = buildNowStatus(payload);
        const source = isUsable(payload.current) ? payload.current! : fallbackCurrent;
        expect(view.label).toBe(source.label);
        expect(view.title).toBe(source.title);
        expect(view.updatedLabel).toBe(source.updated_label);
      }),
      { numRuns: 300 },
    );
  });

  test('a null payload, a missing current, or a blank label or title all fall back', () => {
    expect(buildNowStatus(null).label).toBe(fallbackCurrent.label);
    expect(buildNowStatus({ current: null }).label).toBe(fallbackCurrent.label);
    expect(buildNowStatus({ current: { ...fallbackCurrent, label: '' } }).label).toBe(fallbackCurrent.label);
    expect(buildNowStatus({ current: { ...fallbackCurrent, label: '   ' } }).label).toBe(fallbackCurrent.label);
    expect(buildNowStatus({ current: { ...fallbackCurrent, title: '' } }).title).toBe(fallbackCurrent.title);
    expect(buildNowStatus({ current: { ...fallbackCurrent, title: '  ' } }).title).toBe(fallbackCurrent.title);
  });

  test('the accessible name contains the title and the date', () => {
    fc.assert(
      fc.property(arbNowPayload, (payload) => {
        const view = buildNowStatus(payload);
        expect(view.ariaLabel).toContain(view.title);
        expect(view.ariaLabel).toContain(view.updatedLabel);
      }),
      { numRuns: 300 },
    );
  });

  test('the availability status is not part of the line', () => {
    // The status is no longer rendered on the home page, so the model must not
    // carry it either: nothing can leak a stale label back in.
    const view = buildNowStatus(null) as Record<string, unknown>;
    expect('availabilityLabel' in view).toBe(false);
    expect(JSON.stringify(view)).not.toMatch(/OPEN TO WORK|OPEN TO FREELANCE|NOT AVAILABLE/);
  });

  test('the description never leaks into any output field', () => {
    fc.assert(
      fc.property(arbNowPayload, (payload) => {
        if (!payload.current || !isUsable(payload.current)) return;
        const description = payload.current.description.trim();
        if (description === '') return;
        const view = buildNowStatus(payload);
        const fields = [view.label, view.title, view.updatedLabel, view.ariaLabel];
        for (const field of fields) {
          const sharesText =
            payload.current.label.includes(description) ||
            payload.current.title.includes(description) ||
            payload.current.updated_label.includes(description);
          if (!sharesText) expect(field).not.toContain(description);
        }
      }),
      { numRuns: 300 },
    );
  });

  test('every field is a string', () => {
    fc.assert(
      fc.property(arbNowPayload, (payload) => {
        for (const value of Object.values(buildNowStatus(payload))) {
          expect(typeof value).toBe('string');
        }
      }),
      { numRuns: 200 },
    );
  });
});
