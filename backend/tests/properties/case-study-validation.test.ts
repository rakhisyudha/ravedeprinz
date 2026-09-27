import { describe, expect, test } from 'bun:test';
import fc from 'fast-check';
import { CASE_STUDY_FIELDS, CASE_STUDY_MAX, validateCaseStudy } from '../../src/services/validation';
import edgeCases from '../fixtures/validation-edge-cases.json';

// Feature: portfolio-engagement, Property 11: Case-study length validation
// Backend half. The frontend admin validator (Property 11, frontend half)
// runs the same edge-case rows from this shared fixture.
type CaseStudyCase = (typeof edgeCases.caseStudy)[number];

const arbRecord = fc.record({
  problem: fc.string({ maxLength: 12000 }),
  what_built: fc.string({ maxLength: 12000 }),
  key_decision: fc.string({ maxLength: 12000 }),
  outcome: fc.string({ maxLength: 12000 }),
});

describe('Property 11 (backend half): case-study length validation', () => {
  test('an error is returned exactly when some field exceeds 10,000 characters', () => {
    fc.assert(
      fc.property(arbRecord, (record) => {
        const over = CASE_STUDY_FIELDS.some((field) => record[field].length > CASE_STUDY_MAX);
        const error = validateCaseStudy(record as Record<string, unknown>);
        expect(error === null).toBe(!over);
      }),
      { numRuns: 200 },
    );
  });

  test('the error names the first offending field in the fixed field order', () => {
    fc.assert(
      fc.property(arbRecord, (record) => {
        const error = validateCaseStudy(record as Record<string, unknown>);
        if (!error) return;
        const firstOffender = CASE_STUDY_FIELDS.find((field) => record[field].length > CASE_STUDY_MAX)!;
        expect(error.field).toBe(firstOffender);
        expect(error.status).toBe(400);
        expect(error.message).toContain(error.field);
      }),
      { numRuns: 200 },
    );
  });

  test('omitted fields count as empty, not as failures', () => {
    fc.assert(
      fc.property(fc.subarray([...CASE_STUDY_FIELDS], { minLength: 0, maxLength: 4 }), (present) => {
        const record: Record<string, unknown> = {};
        for (const field of present) record[field] = 'x'.repeat(CASE_STUDY_MAX);
        expect(validateCaseStudy(record)).toBeNull();
      }),
      { numRuns: 100 },
    );
  });

  test('the shared edge-case fixture agrees with the property', () => {
    expect(edgeCases.caseStudyMax).toBe(CASE_STUDY_MAX);
    for (const row of edgeCases.caseStudy as CaseStudyCase[]) {
      const record: Record<string, string> = {};
      for (const field of CASE_STUDY_FIELDS) {
        record[field] = 'a'.repeat(row.lengths[field] ?? 0);
      }
      const error = validateCaseStudy(record);
      expect({ label: row.label, rejected: error !== null }).toEqual({
        label: row.label,
        rejected: !row.valid,
      });
      expect(error?.field ?? null).toBe(row.field);
    }
  });

  test('the fixture exercises every field as the reported offender', () => {
    for (const field of CASE_STUDY_FIELDS) {
      expect(
        edgeCases.caseStudy.some((row) => !row.valid && row.field === field),
        `no invalid fixture row reports ${field}`,
      ).toBe(true);
    }
  });
});
