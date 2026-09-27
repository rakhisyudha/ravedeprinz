// Availability status and the contact block's view model. An invalid or
// missing status never reaches the page: the fallback value's label is shown
// instead, and the raw CMS string is discarded.

import { fallbackSite } from './fallback';
import type { SiteSettings } from './cms';

export const AVAILABILITY_LABELS = {
  OPEN_TO_WORK: 'OPEN TO WORK',
  OPEN_TO_FREELANCE: 'OPEN TO FREELANCE',
  NOT_AVAILABLE: 'NOT AVAILABLE',
} as const;

export type Availability = keyof typeof AVAILABILITY_LABELS;

export function isAvailability(value: unknown): value is Availability {
  return typeof value === 'string' && Object.hasOwn(AVAILABILITY_LABELS, value);
}

/**
 * The live status when it is exactly one of the three values, else the
 * fallback, else the shipped default. Total by construction, so a bad
 * fallback can never leak a raw CMS value into the page either.
 */
export function resolveAvailability(live: unknown, fallback: unknown): Availability {
  if (isAvailability(live)) return live;
  if (isAvailability(fallback)) return fallback;
  return 'OPEN_TO_WORK';
}

export type ContactView = {
  /** Always one of the three labels; never the raw CMS value. */
  statusLabel: string;
  note: string | null;
  /** Trimmed, or null when blank so no empty `mailto:` link is rendered. */
  email: string | null;
  /** Trimmed, or null when blank so no dead CV link is rendered. */
  cvUrl: string | null;
};

function trimmed(value: unknown): string {
  if (value === null || value === undefined) return '';
  return typeof value === 'string' ? value.trim() : '';
}

const blankToNull = (value: string) => (value === '' ? null : value);

export function buildContactView(
  live: SiteSettings | null,
  fb: Pick<SiteSettings, 'contact_email' | 'availability_status' | 'availability_note' | 'cv_url'> = fallbackSite,
): ContactView {
  const source = live ?? fb;
  return {
    statusLabel: AVAILABILITY_LABELS[resolveAvailability(source.availability_status, fb.availability_status)],
    note: blankToNull(trimmed(source.availability_note)),
    email: blankToNull(trimmed(source.contact_email)),
    cvUrl: blankToNull(trimmed(source.cv_url)),
  };
}
