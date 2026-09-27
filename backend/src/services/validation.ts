// Pure request validation for the portfolio-engagement feature. No SQL, no
// I/O: the admin routes call these before touching the database so an
// invalid request is rejected with the offending `field` named and nothing
// is written. The Svelte admin mirrors these rules in
// Frontend/src/lib/adminValidation.ts so the same input is caught before the
// request is made; this module stays the source of truth.

export const CASE_STUDY_FIELDS = ['problem', 'what_built', 'key_decision', 'outcome'] as const;
export const CASE_STUDY_MAX = 10_000;

export const AVAILABILITY_VALUES = ['OPEN_TO_WORK', 'OPEN_TO_FREELANCE', 'NOT_AVAILABLE'] as const;
export type Availability = (typeof AVAILABILITY_VALUES)[number];

export const AVAILABILITY_NOTE_MAX = 120;
export const CONTACT_EMAIL_MAX = 254;

export const SORT_ORDER_MIN = 0;
export const SORT_ORDER_MAX = 9999;

export type FieldError = { status: 400; field: string; message: string };

export type SiteSettingsValue = {
  contact_email: string | null;
  cv_url: string | null;
  availability_status: Availability;
  availability_note: string | null;
};

export type SiteSettingsResult =
  | { ok: true; value: SiteSettingsValue }
  | { ok: false; error: FieldError };

function text(value: unknown): string {
  if (value === null || value === undefined) return '';
  return typeof value === 'string' ? value : String(value);
}

function tooLong(field: string, value: string, max: number): FieldError {
  return {
    status: 400,
    field,
    message: `${field} is too long (max ${max} characters)`,
  };
}

/** First case-study field over the limit, in the fixed field order. */
export function validateCaseStudy(body: Record<string, unknown>): FieldError | null {
  for (const field of CASE_STUDY_FIELDS) {
    if (text(body[field]).length > CASE_STUDY_MAX) return tooLong(field, text(body[field]), CASE_STUDY_MAX);
  }
  return null;
}

/** A whole number in [0, 9999]. Accepts a number or its decimal string form. */
export function validateSortOrder(value: unknown): FieldError | null {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value >= SORT_ORDER_MIN && value <= SORT_ORDER_MAX
      ? null
      : orderError();
  }
  if (typeof value !== 'string') return orderError();
  const raw = value.trim();
  if (!/^\d+$/.test(raw)) return orderError();
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed >= SORT_ORDER_MIN && parsed <= SORT_ORDER_MAX
    ? null
    : orderError();
}

function orderError(): FieldError {
  return {
    status: 400,
    field: 'sort_order',
    message: `Order must be a whole number from ${SORT_ORDER_MIN} to ${SORT_ORDER_MAX}`,
  };
}

/** Blank is allowed and means "no contact email"; otherwise a real address. */
export function isValidContactEmail(value: string): boolean {
  if (value.length > CONTACT_EMAIL_MAX) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeOptional(value: unknown): string | null {
  const raw = text(value).trim();
  return raw === '' ? null : raw;
}

/**
 * Validates every field and reports the first failure in the fixed order
 * email → status → note, so the caller either gets a fully valid value or
 * nothing at all and the update stays atomic (Requirement 12.11).
 */
export function validateSiteSettings(body: Record<string, unknown>): SiteSettingsResult {
  const email = normalizeOptional(body.contact_email);
  if (email !== null && !isValidContactEmail(email)) {
    return {
      ok: false,
      error: {
        status: 400,
        field: 'contact_email',
        message: 'Enter a valid email address',
      },
    };
  }

  const rawStatus = typeof body.availability_status === 'string' ? body.availability_status.trim() : '';
  const status = AVAILABILITY_VALUES.find((value) => value === rawStatus);
  if (!status) {
    return {
      ok: false,
      error: {
        status: 400,
        field: 'availability_status',
        message: `Availability must be one of ${AVAILABILITY_VALUES.join(', ')}`,
      },
    };
  }

  const note = normalizeOptional(body.availability_note);
  if (note !== null && note.length > AVAILABILITY_NOTE_MAX) {
    return { ok: false, error: tooLong('availability_note', note, AVAILABILITY_NOTE_MAX) };
  }

  return {
    ok: true,
    value: {
      contact_email: email,
      cv_url: normalizeOptional(body.cv_url),
      availability_status: status,
      availability_note: note,
    },
  };
}
