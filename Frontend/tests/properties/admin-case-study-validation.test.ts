import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import fc from 'fast-check';
import {
  CASE_STUDY_FIELDS,
  CASE_STUDY_MAX,
  validateCaseStudyInput,
} from '../../src/lib/adminValidation';

// Feature: portfolio-engagement, Property 11: Case-study length validation
// Frontend half. The backend half (Backend/tests/properties/
// case-study-validation.test.ts) runs the same edge-case rows from the same
// shared fixture, so the two validators are provably in agreement.
type EdgeCases = {
  caseStudyMax: number;
  caseStudy: Array<{
    label: string;
    lengths: Record<string, number>;
    valid: boolean;
    field: string | null;
  }>;
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

describe('Property 11 (frontend half): case-study length validation', () => {
  test('the shared fixture uses the same limit as this validator', () => {
    expect(loadEdgeCases().caseStudyMax).toBe(CASE_STUDY_MAX);
  });

  test('an error is returned exactly when some field exceeds the limit', async () => {
    fc.assert(
      fc.property(
        fc.record({
          problem: fc.string({ maxLength: 12000 }),
          what_built: fc.string({ maxLength: 12000 }),
          key_decision: fc.string({ maxLength: 12000 }),
          outcome: fc.string({ maxLength: 12000 }),
        }),
        (values) => {
          const over = CASE_STUDY_FIELDS.some((field) => values[field].length > CASE_STUDY_MAX);
          const error = validateCaseStudyInput(values);
          expect(error === null).toBe(!over);
        },
      ),
      { numRuns: 200 },
    );
  });

  test('the error names the first offending field in the fixed order', async () => {
    fc.assert(
      fc.property(
        fc.record({
          problem: fc.string({ maxLength: 12000 }),
          what_built: fc.string({ maxLength: 12000 }),
          key_decision: fc.string({ maxLength: 12000 }),
          outcome: fc.string({ maxLength: 12000 }),
        }),
        (values) => {
          const error = validateCaseStudyInput(values);
          if (!error) return;
          const first = CASE_STUDY_FIELDS.find((field) => values[field].length > CASE_STUDY_MAX)!;
          expect(error.field).toBe(first);
          expect(error.message).toContain(first);
        },
      ),
      { numRuns: 200 },
    );
  });

  test('the shared edge-case fixture agrees with this validator', () => {
    const fixture = loadEdgeCases();
    for (const row of fixture.caseStudy) {
      const values: Record<string, string> = {};
      for (const field of CASE_STUDY_FIELDS) {
        values[field] = 'a'.repeat(row.lengths[field] ?? 0);
      }
      const error = validateCaseStudyInput(values);
      expect({ label: row.label, rejected: error !== null }).toEqual({
        label: row.label,
        rejected: !row.valid,
      });
      expect(error?.field ?? null).toBe(row.field);
    }
  });

  test('the fixture exercises every field as the reported offender', () => {
    const fixture = loadEdgeCases();
    for (const field of CASE_STUDY_FIELDS) {
      expect(fixture.caseStudy.some((row) => !row.valid && row.field === field)).toBe(true);
    }
  });
});
