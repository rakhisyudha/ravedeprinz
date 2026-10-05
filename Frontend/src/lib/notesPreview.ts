// Note helpers shared by the home latest-notes strip and the notes list
// page, so both produce byte-identical date labels, reading-time labels, and
// hrefs for the same note.

import { slugify } from '../data/site';
import type { Note } from './cms';
import { readingMinutes } from './readingTime';

export function noteDateLabel(createdAt?: string | null, publishedAt?: string | null): string {
  // The human date is the immutable creation date, so editing a note never
  // moves it. published_at is the fallback for rows predating created_at,
  // and for a created_at that is present but unparseable.
  for (const raw of [createdAt, publishedAt]) {
    if (!raw) continue;
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) continue;
    return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase();
  }
  return '';
}

export function noteSlug(n: { slug?: string | null; title: string }): string {
  return n.slug?.trim() || slugify(n.title);
}

export function readLabel(n: Pick<Note, 'body' | 'image_url'>): string {
  const minutes = readingMinutes(n.body ?? '', n.image_url);
  return `READ ${String(minutes).padStart(2, '0')} MIN`;
}

function time(value?: string | null): number {
  if (!value) return Number.NEGATIVE_INFINITY;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
}

/**
 * Newest first: published_at descending, ties broken by created_at
 * descending, and an unparseable or missing date counts as oldest. Stable,
 * so notes with no usable dates (the static fallback) keep array order.
 * Shared by the home strip, the previous/next links, and the RSS feed, so
 * none of them can disagree about which note is newer.
 */
export function sortNewestFirst(notes: Note[]): Note[] {
  return notes
    .map((note, index) => ({ note, index }))
    .sort((a, b) => {
      const published = time(b.note.published_at) - time(a.note.published_at);
      if (published !== 0) return published;
      const created = time(b.note.created_at) - time(a.note.created_at);
      if (created !== 0) return created;
      return a.index - b.index; // stable
    })
    .map((entry) => entry.note);
}

/**
 * The most recent published notes, re-sorted here rather than trusted from
 * the server. The server's ordering and the strip's ordering therefore
 * cannot disagree.
 */
export function selectLatestNotes(notes: Note[], limit = 3): Note[] {
  return sortNewestFirst(notes.filter((note) => note.published !== false)).slice(0, limit);
}
