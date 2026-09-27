// Client-side mirror of Backend/src/services/validation.ts. The Bun API stays
// the source of truth, but running the same rules here means the admin form
// can show a field-level error and keep the typed input instead of round
// tripping a request that is certain to be rejected. The two suites share one
// edge-case table, so the mirrors are provably in agreement.

export const CASE_STUDY_FIELDS = ['problem', 'what_built', 'key_decision', 'outcome'] as const;
export const CASE_STUDY_MAX = 10_000;

export const AVAILABILITY_VALUES = ['OPEN_TO_WORK', 'OPEN_TO_FREELANCE', 'NOT_AVAILABLE'] as const;
export type Availability = (typeof AVAILABILITY_VALUES)[number];

export const AVAILABILITY_NOTE_MAX = 120;
export const CONTACT_EMAIL_MAX = 254;

export const SORT_ORDER_MIN = 0;
export const SORT_ORDER_MAX = 9999;
export const ORDER_RANGE_LABEL = `${SORT_ORDER_MIN}–${SORT_ORDER_MAX}`;

export type FieldError = { field: string; message: string };

const trimmed = (value: string | null | undefined): string => (value ?? '').trim();

/** First case-study field over the limit, in the same fixed order as the API. */
export function validateCaseStudyInput(
  values: Partial<Record<(typeof CASE_STUDY_FIELDS)[number], unknown>>,
): FieldError | null {
  for (const field of CASE_STUDY_FIELDS) {
    const raw = values[field];
    const text = raw === null || raw === undefined ? '' : String(raw);
    if (text.length > CASE_STUDY_MAX) {
      return { field, message: `${labelFor(field)} is too long (max ${CASE_STUDY_MAX} characters)` };
    }
  }
  return null;
}

const LABELS: Record<string, string> = {
  problem: 'Problem',
  what_built: 'What was built',
  key_decision: 'Key decision',
  outcome: 'Outcome',
  sort_order: 'Order',
  contact_email: 'Email',
  availability_status: 'Availability',
  availability_note: 'Note',
  cv_url: 'CV',
  slug: 'Slug',
};

export function labelFor(field: string): string {
  return LABELS[field] ?? field;
}

/** A whole number in [0, 9999], entered as text in a number input. */
export function validateOrderInput(value: unknown): FieldError | null {
  const error = (): FieldError => ({
    field: 'sort_order',
    message: `Order must be a whole number from ${SORT_ORDER_MIN} to ${SORT_ORDER_MAX}`,
  });

  if (typeof value === 'number') {
    return Number.isInteger(value) && value >= SORT_ORDER_MIN && value <= SORT_ORDER_MAX ? null : error();
  }
  if (typeof value !== 'string') return error();
  const raw = value.trim();
  if (!/^\d+$/.test(raw)) return error();
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed >= SORT_ORDER_MIN && parsed <= SORT_ORDER_MAX ? null : error();
}

export function isValidContactEmail(value: string): boolean {
  if (value.length > CONTACT_EMAIL_MAX) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export type SiteSettingsInput = {
  contact_email?: string | null;
  cv_url?: string | null;
  availability_status?: string | null;
  availability_note?: string | null;
};

export type SiteSettingsValue = {
  contact_email: string | null;
  cv_url: string | null;
  availability_status: Availability;
  availability_note: string | null;
};

export type SiteSettingsResult =
  | { ok: true; value: SiteSettingsValue }
  | { ok: false; error: FieldError };

/** Same total, atomic contract as the API: all fields checked, first error wins. */
export function validateSiteSettingsInput(input: SiteSettingsInput): SiteSettingsResult {
  const email = trimmed(input.contact_email);
  if (email !== '' && !isValidContactEmail(email)) {
    return { ok: false, error: { field: 'contact_email', message: 'Enter a valid email address' } };
  }

  const status = trimmed(input.availability_status);
  if (!AVAILABILITY_VALUES.includes(status as Availability)) {
    return {
      ok: false,
      error: {
        field: 'availability_status',
        message: `Availability must be one of ${AVAILABILITY_VALUES.join(', ')}`,
      },
    };
  }

  const note = trimmed(input.availability_note);
  if (note.length > AVAILABILITY_NOTE_MAX) {
    return {
      ok: false,
      error: {
        field: 'availability_note',
        message: `Note is too long (max ${AVAILABILITY_NOTE_MAX} characters)`,
      },
    };
  }

  return {
    ok: true,
    value: {
      contact_email: email === '' ? null : email,
      cv_url: trimmed(input.cv_url) === '' ? null : trimmed(input.cv_url),
      availability_status: status as Availability,
      availability_note: note === '' ? null : note,
    },
  };
}
