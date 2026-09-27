import { describe, expect, test } from 'vitest';
import fc from 'fast-check';
import {
  AVAILABILITY_LABELS,
  buildContactView,
  resolveAvailability,
  type Availability,
} from '../../src/lib/availability';
import { arbAvailabilityStatus, arbSiteSettings } from './arbitraries';

// Feature: portfolio-engagement, Property 8: Contact view and availability resolution

const ALL_LABELS = Object.values(AVAILABILITY_LABELS);
const ALL_VALUES = Object.keys(AVAILABILITY_LABELS) as Availability[];

const arbLiveSite = arbSiteSettings;

describe('Property 8: contact view and availability resolution', () => {
  test('the status label is always one of the three labels', async () => {
    fc.assert(
      fc.property(arbLiveSite, (live) => {
        expect(ALL_LABELS).toContain(buildContactView(live).statusLabel);
      }),
      { numRuns: 300 },
    );
  });

  test('a valid status is mapped; anything else falls back and the raw value is never shown', async () => {
    fc.assert(
      fc.property(arbLiveSite, fc.constantFrom(...ALL_VALUES), (live, fallback) => {
        // The fallback is the *second* argument: an invalid live status must
        // resolve against it, not against the shipped default.
        const view = buildContactView(live, { ...live, availability_status: fallback });
        const status = live.availability_status;
        const expected =
          status === 'OPEN_TO_WORK' || status === 'OPEN_TO_FREELANCE' || status === 'NOT_AVAILABLE'
            ? AVAILABILITY_LABELS[status]
            : AVAILABILITY_LABELS[fallback];
        expect(view.statusLabel).toBe(expected);
        if (typeof status === 'string' && status.trim() !== '' && !expected.includes(status)) {
          expect(view.statusLabel).not.toContain(status.trim());
        }
      }),
      { numRuns: 300 },
    );
  });

  test('resolveAvailability returns the live value only when it is exact', async () => {
    fc.assert(
      fc.property(arbAvailabilityStatus, fc.constantFrom(...ALL_VALUES), (live, fallback) => {
        const exact = ALL_VALUES.includes(live as Availability);
        expect(resolveAvailability(live, fallback)).toBe(exact ? live : fallback);
      }),
      { numRuns: 300 },
    );
  });

  test('a lowercase or spaced status is rejected', () => {
    expect(resolveAvailability('open_to_work', 'NOT_AVAILABLE')).toBe('NOT_AVAILABLE');
    expect(resolveAvailability(' OPEN_TO_WORK ', 'NOT_AVAILABLE')).toBe('NOT_AVAILABLE');
    expect(resolveAvailability('OPEN TO WORK', 'NOT_AVAILABLE')).toBe('NOT_AVAILABLE');
    expect(resolveAvailability('OPEN_TO_WORK', 'NOT_AVAILABLE')).toBe('OPEN_TO_WORK');
  });

  test('the email is null exactly when the source is blank, otherwise trimmed', async () => {
    fc.assert(
      fc.property(arbLiveSite, (live) => {
        const view = buildContactView(live);
        const source = live.contact_email ?? null;
        const blank = source === null || source.trim() === '';
        expect(view.email === null).toBe(blank);
        if (!blank) expect(view.email).toBe(source.trim());
      }),
      { numRuns: 300 },
    );
  });

  test('the CV URL is null exactly when the source is blank, otherwise trimmed', async () => {
    fc.assert(
      fc.property(arbLiveSite, (live) => {
        const view = buildContactView(live);
        const source = live.cv_url ?? null;
        const blank = source === null || source.trim() === '';
        expect(view.cvUrl === null).toBe(blank);
        if (!blank) expect(view.cvUrl).toBe(source.trim());
      }),
      { numRuns: 300 },
    );
  });

  test('the note is null exactly when the source is blank, otherwise trimmed', async () => {
    fc.assert(
      fc.property(arbLiveSite, (live) => {
        const view = buildContactView(live);
        const source = live.availability_note ?? null;
        const blank = source === null || source.trim() === '';
        expect(view.note === null).toBe(blank);
        if (!blank) expect(view.note).toBe(source.trim());
      }),
      { numRuns: 300 },
    );
  });

  test('null settings derive every field from the fallback', () => {
    const view = buildContactView(null);
    expect(view.statusLabel).toBe(AVAILABILITY_LABELS.OPEN_TO_WORK);
    expect(view.email).toBe('hello@ravedeprinz.me');
    expect(view.cvUrl).toBeNull();
    expect(view.note).toBeNull();
  });

  test('an explicit fallback can be supplied for a different default status', async () => {
    fc.assert(
      fc.property(arbLiveSite, (live) => {
        const fb = { ...live, availability_status: 'NOT_AVAILABLE' as const };
        expect(buildContactView(null, fb).statusLabel).toBe(AVAILABILITY_LABELS.NOT_AVAILABLE);
      }),
      { numRuns: 100 },
    );
  });

  test('a settings object with only blanks still yields the status label', async () => {
    const view = buildContactView({
      site_name: 'ravedeprinz',
      footer_name: 'ravedepr1nz',
      footer_label: 'PERSONAL ARCHIVE',
      hero_tagline: '',
      contact_email: '   ',
      cv_url: '   ',
      availability_status: 'NOT_AVAILABLE',
      availability_note: '   ',
    });
    expect(view.statusLabel).toBe(AVAILABILITY_LABELS.NOT_AVAILABLE);
    expect(view.email).toBeNull();
    expect(view.cvUrl).toBeNull();
    expect(view.note).toBeNull();
  });
});
