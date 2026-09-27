import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import fc from 'fast-check';
import {
  SORT_ORDER_MAX,
  SORT_ORDER_MIN,
  validateOrderInput,
} from '../../src/lib/adminValidation';

// Feature: portfolio-engagement, Property 12: Order field validation
// Frontend half. The backend half runs the same edge-case rows from the same
// shared fixture, so the two validators are provably in agreement.
type EdgeCases = {
  sortOrderMin: number;
  sortOrderMax: number;
  order: Array<{ label: string; value: unknown; valid: boolean }>;
};

function loadEdgeCases(): EdgeCases {
  return JSON.parse(
    readFileSync(
      fileURLToPath(
        new URL('../../../Backend/tests/fixtures/validation-edge-cases.json', import.meta.url),
      ),
      'utf8',
    ),
  ) as EdgeCases;
}

/** Reference model: a whole number in [0, 9999], nothing else. */
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

const arbOrder = fc.oneof(
  fc.anything(),
  fc.integer(),
  fc.string({ maxLength: 8 }),
  fc.constantFrom('', '   ', '0', '9999', '10000', '-1', '1.5', '1e3', '+1', '12a', ' 7 '),
);

describe('Property 12 (frontend half): order field validation', () => {
  test('a value is accepted exactly when it is a whole number in range', async () => {
    fc.assert(
      fc.property(arbOrder, (value) => {
        expect(validateOrderInput(value) === null).toBe(referenceAccepts(value));
      }),
      { numRuns: 300 },
    );
  });

  test('a rejected value names the field and states the range', async () => {
    fc.assert(
      fc.property(arbOrder, (value) => {
        const error = validateOrderInput(value);
        if (!error) return;
        expect(error.field).toBe('sort_order');
        expect(error.message).toContain('0');
        expect(error.message).toContain('9999');
      }),
      { numRuns: 200 },
    );
  });

  test('the shared edge-case fixture agrees with this validator', () => {
    const fixture = loadEdgeCases();
    expect(fixture.sortOrderMin).toBe(SORT_ORDER_MIN);
    expect(fixture.sortOrderMax).toBe(SORT_ORDER_MAX);
    for (const row of fixture.order) {
      expect({ label: row.label, accepted: validateOrderInput(row.value) === null }).toEqual({
        label: row.label,
        accepted: row.valid,
      });
      expect(referenceAccepts(row.value)).toBe(row.valid);
    }
  });
});
