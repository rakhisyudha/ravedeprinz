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

export const NOTE_TAGS_MIN = 1;
export const NOTE_TAGS_MAX = 3;
export const NOTE_TAG_MAX_LENGTH = 16;

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

/**
 * The one spelling of a tag: inner whitespace collapsed, trimmed, uppercased.
 * Idempotent, so a stored tag re-submitted unchanged is always accepted as-is.
 */
export function normalizeNoteTag(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toUpperCase();
}

export type NoteTagsResult = { ok: true; tags: string[] } | { ok: false; error: FieldError };

function tagsError(message: string): NoteTagsResult {
  return { ok: false, error: { status: 400, field: 'tags', message } };
}

/** Whether the request carries a tag value at all (`tags`, or the legacy `tag`). */
export function hasNoteTagsInput(body: Record<string, unknown>): boolean {
  return 'tags' in body || 'tag' in body;
}

/**
 * Validates a note's tags from `tags` (a list of strings) or, when `tags` is
 * absent, the legacy single `tag` string. `tags` wins when both are present,
 * which is what a client that echoes a whole row back relies on. Blank entries are dropped and
 * repeats collapse to the first spelling, so what is checked is the list that
 * would actually be stored. The caller gets either the final list or the first
 * failure, and nothing is written on failure.
 *
 * Order of checks: not a list of strings → none left → too many → first tag
 * (in order) that is too long or holds a comma or control character.
 */
export function validateNoteTags(body: Record<string, unknown>): NoteTagsResult {
  const source = body.tags !== undefined ? body.tags : [body.tag];
  if (!Array.isArray(source)) return tagsError('Tags must be a list');

  const tags: string[] = [];
  for (const entry of source) {
    if (entry !== null && entry !== undefined && typeof entry !== 'string') {
      return tagsError('Each tag must be text');
    }
    const tag = normalizeNoteTag(typeof entry === 'string' ? entry : '');
    if (tag !== '' && !tags.includes(tag)) tags.push(tag);
  }

  if (tags.length < NOTE_TAGS_MIN) return tagsError('A note needs at least one tag');
  if (tags.length > NOTE_TAGS_MAX) return tagsError(`A note can have at most ${NOTE_TAGS_MAX} tags`);

  for (const tag of tags) {
    if (tag.length > NOTE_TAG_MAX_LENGTH) {
      return tagsError(`"${tag}" is too long (max ${NOTE_TAG_MAX_LENGTH} characters per tag)`);
    }
    if (/[,\u0000-\u001F\u007F]/.test(tag)) {
      return tagsError(`"${tag}" cannot contain commas or control characters`);
    }
  }

  return { ok: true, tags };
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
