// Previous/next navigation between notes. Pure, so the ordering rule can be
// property-tested without a CMS; the note page only supplies the inputs.

import type { Note } from './cms';
import { noteSlug, sortNewestFirst } from './notesPreview';

export type AdjacentNotes = {
  /** The note published just after this one, or null when this is the newest. */
  newer: Note | null;
  /** The note published just before this one, or null when this is the oldest. */
  older: Note | null;
};

/**
 * The neighbours of `key` in the newest-first order of the published notes.
 *
 * `key` is whatever the URL carried: the note route accepts both a slug and
 * an id, so either matches. An unknown key has no neighbours. If two notes
 * resolve to the same slug the first one in the sorted order wins, which
 * keeps the result deterministic.
 */
export function adjacentNotes(notes: Note[], key: string): AdjacentNotes {
  const ordered = sortNewestFirst(notes.filter((note) => note.published !== false));
  const index = ordered.findIndex((note) => noteSlug(note) === key || (note.id !== undefined && note.id === key));
  if (index === -1) return { newer: null, older: null };
  return {
    newer: index > 0 ? ordered[index - 1]! : null,
    older: index < ordered.length - 1 ? ordered[index + 1]! : null,
  };
}
