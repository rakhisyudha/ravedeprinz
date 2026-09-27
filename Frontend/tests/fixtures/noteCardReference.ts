import type { Note } from '../../src/lib/cms';
import { cleanDescription } from '../../src/lib/seo';

// Frozen copy of the note-card model computation as it stood before
// lib/ogCard.ts was refactored to share one renderer with the project card.
// The literals are duplicated on purpose: this file must never be "updated"
// to match a regression, it is the oracle that catches one.

export const NOTE_CARD_FOOTER = 'RAVEDEPRINZ.ME  /  NOTES';
export const NOTE_FALLBACK_EYEBROW = 'NOTES';
export const NOTE_FALLBACK_TITLE = 'ravedeprinz';
export const NOTE_FALLBACK_EXCERPT = 'Short transmissions from the workbench.';

export type NoteCardReference = {
  eyebrow: string;
  title: string;
  excerpt: string;
  footer: string;
  imageUrl: string | null;
};

export function buildNoteCardReference(note: Note | null): NoteCardReference {
  return {
    eyebrow: (note?.tag ?? NOTE_FALLBACK_EYEBROW).toUpperCase(),
    title: (note?.title ?? NOTE_FALLBACK_TITLE).slice(0, 80),
    excerpt:
      cleanDescription(note?.body, note?.subtitle, 160) || NOTE_FALLBACK_EXCERPT,
    footer: NOTE_CARD_FOOTER,
    imageUrl: note?.image_url ?? null,
  };
}
