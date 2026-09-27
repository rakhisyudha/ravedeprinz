import { describe, expect, test } from 'bun:test';
import fc from 'fast-check';
import { SORT_ORDER_MAX, SORT_ORDER_MIN, validateSortOrder } from '../../src/services/validation';
import edgeCases from '../fixtures/validation-edge-cases.json';

// Feature: portfolio-engagement, Property 12: Order field validation
// Backend half. The frontend admin validator (Property 12, frontend half)
// runs the same edge-case rows from this shared fixture.
type OrderCase = (typeof edgeCases.order)[number];

const arbOrder = fc.oneof(
  fc.anything(),
  fc.integer(),
  fc.string({ maxLength: 8 }),
  fc.constantFrom('', '   ', '0', '9999', '10000', '-1', '1.5', '1e3', '+1', '12a', ' 7 ', '007'),
);

/** Reference model: accept a whole number in [0, 9999], nothing else. */
function referenceAccepts(value: unknown): boolean {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value >= SORT_ORDER_MIN && value <= SORT_ORDER_MAX;
  }
  if (typeof value !== 'string') return false;
  const raw = value.trim();
  if (!/^\d+$/.test(raw)) return false;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed >= SORT_ORDER_MIN && parsed <= SORT_ORDER_MAX;
}

describe('Property 12 (backend half): order field validation', () => {
  test('a value is accepted exactly when it is a whole number in range', () => {
    fc.assert(
      fc.property(arbOrder, (value) => {
        expect(validateSortOrder(value) === null).toBe(referenceAccepts(value));
      }),
      { numRuns: 300 },
    );
  });

  test('a rejected value reports the sort_order field and the allowed range', () => {
    fc.assert(
      fc.property(arbOrder, (value) => {
        const error = validateSortOrder(value);
        if (!error) return;
        expect(error.status).toBe(400);
        expect(error.field).toBe('sort_order');
        expect(error.message).toContain('0');
        expect(error.message).toContain('9999');
      }),
      { numRuns: 200 },
    );
  });

  test('the shared edge-case fixture agrees with the property', () => {
    expect(edgeCases.sortOrderMin).toBe(SORT_ORDER_MIN);
    expect(edgeCases.sortOrderMax).toBe(SORT_ORDER_MAX);
    for (const row of edgeCases.order as OrderCase[]) {
      expect({ label: row.label, accepted: validateSortOrder(row.value) === null }).toEqual({
        label: row.label,
        accepted: row.valid,
      });
      expect(referenceAccepts(row.value)).toBe(row.valid);
    }
  });
});
