import { describe, expect, test } from 'bun:test';
import fc from 'fast-check';
import {
  AVAILABILITY_NOTE_MAX,
  AVAILABILITY_VALUES,
  CONTACT_EMAIL_MAX,
  validateSiteSettings,
  type SiteSettingsValue,
} from '../../src/services/validation';

// Feature: portfolio-engagement, Property 20: Site settings validation is total and atomic
const arbStatus = fc.oneof(
  ...AVAILABILITY_VALUES.map((value) => fc.constant(value)),
  fc.constantFrom('', '   ', 'open_to_work', 'OPEN TO WORK', 'UNKNOWN', 'NOT_AVAILABLE '),
  fc.string({ maxLength: 20 }),
);

const arbEmail = fc.oneof(
  fc.constant(''),
  fc.constant('   '),
  fc.constant('hello@ravedeprinz.me'),
  fc.constant('hello+tag@sub.example.co'),
  fc.constant('no-at-sign.example'),
  fc.constant('no-dot@localhost'),
  fc.constant('spaces in@example.com'),
  fc.constant('@example.com'),
  fc.constant('a@.com'),
  fc.string({ maxLength: 300 }),
  fc.array(fc.constant('a'), { minLength: 250, maxLength: 260 }).map((parts) => `${parts.join('')}@example.com`),
);

const arbNote = fc.oneof(
  fc.constant(null),
  fc.constant(''),
  fc.constant('   '),
  fc.string({ maxLength: 200 }),
  fc.string({ minLength: AVAILABILITY_NOTE_MAX, maxLength: AVAILABILITY_NOTE_MAX + 5 }),
);

/** Reference model, evaluated in the same order the validator reports. */
function reference(body: Record<string, unknown>): SiteSettingsValue | string {
  const email = body.contact_email === null || body.contact_email === undefined
    ? ''
    : String(body.contact_email).trim();
  if (email !== '' && (email.length > CONTACT_EMAIL_MAX || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    return 'contact_email';
  }
  const status = typeof body.availability_status === 'string' ? body.availability_status.trim() : '';
  if (!AVAILABILITY_VALUES.includes(status as (typeof AVAILABILITY_VALUES)[number])) {
    return 'availability_status';
  }
  const note = body.availability_note === null || body.availability_note === undefined
    ? ''
    : String(body.availability_note).trim();
  if (note.length > AVAILABILITY_NOTE_MAX) return 'availability_note';
  return {
    contact_email: email === '' ? null : email,
    cv_url: null,
    availability_status: status as SiteSettingsValue['availability_status'],
    availability_note: note === '' ? null : note,
  };
}

const arbBody = fc.record({
  contact_email: arbEmail,
  availability_status: arbStatus,
  availability_note: arbNote,
  cv_url: fc.oneof(fc.constant(null), fc.constant(''), fc.constant('  '), fc.constant('/uploads/cv.pdf')),
});

describe('Property 20: site settings validation is total and atomic', () => {
  test('ok exactly when all three fields are valid', () => {
    fc.assert(
      fc.property(arbBody, (body) => {
        const result = validateSiteSettings(body as Record<string, unknown>);
        const expected = reference(body as Record<string, unknown>);
        expect(result.ok).toBe(typeof expected !== 'string');
      }),
      { numRuns: 300 },
    );
  });

  test('a failure reports exactly one error naming the first invalid field', () => {
    fc.assert(
      fc.property(arbBody, (body) => {
        const result = validateSiteSettings(body as Record<string, unknown>);
        if (result.ok) return;
        const expected = reference(body as Record<string, unknown>);
        expect(typeof expected).toBe('string');
        if (typeof expected !== 'string') return;
        expect(result.error.status).toBe(400);
        expect(result.error.field).toBe(expected);
        expect(result.error.message.length).toBeGreaterThan(0);
      }),
      { numRuns: 300 },
    );
  });

  test('a blank email and a blank note become null on success', () => {
    fc.assert(
      fc.property(arbBody, (body) => {
        const result = validateSiteSettings(body as Record<string, unknown>);
        if (!result.ok) return;
        expect(result.value.contact_email === null).toBe(
          body.contact_email === null || String(body.contact_email).trim() === '',
        );
        expect(result.value.availability_note === null).toBe(
          body.availability_note === null || String(body.availability_note).trim() === '',
        );
        expect(result.value.availability_status).toBe(
          String(body.availability_status).trim() as SiteSettingsValue['availability_status'],
        );
      }),
      { numRuns: 300 },
    );
  });

  test('a valid value round-trips through the validator unchanged', () => {
    fc.assert(
      fc.property(arbBody, (body) => {
        const first = validateSiteSettings(body as Record<string, unknown>);
        if (!first.ok) return;
        const second = validateSiteSettings(first.value as unknown as Record<string, unknown>);
        expect(second.ok).toBe(true);
        if (second.ok) expect(second.value).toEqual(first.value);
      }),
      { numRuns: 200 },
    );
  });

  test('the email length bound is exactly 254 characters', () => {
    const at = '@example.com';
    const atDomain = 12; // '@' + 'example.com'
    const local = CONTACT_EMAIL_MAX - atDomain;
    expect(validateSiteSettings({ contact_email: 'a'.repeat(local) + at, availability_status: 'OPEN_TO_WORK' }).ok).toBe(true);
    expect(
      validateSiteSettings({ contact_email: 'a'.repeat(local + 1) + at, availability_status: 'OPEN_TO_WORK' }).ok,
    ).toBe(false);
    expect(atDomain).toBe(at.length);
  });

  test('the note length bound is exactly 120 characters', () => {
    const base = { contact_email: null, availability_status: 'OPEN_TO_WORK' };
    expect(validateSiteSettings({ ...base, availability_note: 'n'.repeat(120) }).ok).toBe(true);
    expect(validateSiteSettings({ ...base, availability_note: 'n'.repeat(121) }).ok).toBe(false);
  });
});
