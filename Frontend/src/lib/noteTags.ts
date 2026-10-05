// Tag helpers for notes that carry up to three tags. Pure, so reading a note's
// tags, grouping them, the combined filter and the query-string contract can
// all be property-tested without a CMS or a page.
//
// A tag is matched by its normalized form: inner whitespace collapsed,
// trimmed, uppercased. "reflection", " Reflection " and "REFLECTION" are one
// tag, which is also how tags are displayed across the site.

import type { Note } from './cms';

/** Longest tag the `?tag=` parameter is allowed to carry. */
export const TAG_PARAM_MAX = 60;

/** Most tags that can be selected at once. No note carries more than this many. */
export const MAX_SELECTED_TAGS = 3;

export type TagCount = { tag: string; count: number };

export type TagChip = {
  tag: string;
  /** Notes in the list once this chip is applied (or, if selected, the current list). */
  count: number;
  selected: boolean;
  /** Not selected, and selecting it would give an empty list or exceed the limit. */
  disabled: boolean;
  /** Where the chip leads: the current selection with this tag toggled. */
  href: string;
};

export function normalizeTag(tag: string | null | undefined): string {
  return (tag ?? '').replace(/\s+/g, ' ').trim().toUpperCase();
}

/** Normalized, non-blank, de-duplicated tags, in first-seen order. Ignores anything that is not text. */
function cleanTags(values: readonly unknown[]): string[] {
  const out: string[] = [];
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const tag = normalizeTag(value);
    if (tag !== '' && !out.includes(tag)) out.push(tag);
  }
  return out;
}

/**
 * A note's tags in display order. `tags` is authoritative; the single `tag`
 * is the fallback for a backend or fallback note that predates the list, so
 * the same code reads both. Total: a malformed payload yields an empty list,
 * never an exception.
 */
export function noteTagList(note: Pick<Note, 'tag'> & { tags?: unknown }): string[] {
  const fromList = Array.isArray(note.tags) ? cleanTags(note.tags) : [];
  return fromList.length > 0 ? fromList : cleanTags([note.tag]);
}

/** The first tag, which is what single-tag surfaces (the OG card, the share story) use. */
export function primaryTag(note: Pick<Note, 'tag'> & { tags?: unknown }): string {
  return noteTagList(note)[0] ?? '';
}

/**
 * The selected tags from a request's query string: every `tag` value,
 * normalized, blanks dropped, repeats collapsed, at most MAX_SELECTED_TAGS.
 * Each value is capped at TAG_PARAM_MAX characters, so a hostile or garbled URL
 * can never produce an unbounded value or an unbounded number of them.
 */
export function parseTagParams(params: URLSearchParams): string[] {
  const out: string[] = [];
  for (const raw of params.getAll('tag')) {
    const tag = normalizeTag(raw.slice(0, TAG_PARAM_MAX * 4)).slice(0, TAG_PARAM_MAX).trim();
    if (tag !== '' && !out.includes(tag)) out.push(tag);
    if (out.length >= MAX_SELECTED_TAGS) break;
  }
  return out;
}

/**
 * Every distinct tag with the number of notes carrying it. A note with
 * several tags is counted once under each, so the counts can add up to more
 * than the number of notes. Most-used first, ties alphabetical, so the chip
 * order is stable from one request to the next.
 */
export function collectTags(notes: Note[]): TagCount[] {
  const counts = new Map<string, number>();
  for (const note of notes) {
    for (const tag of noteTagList(note)) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || (a.tag < b.tag ? -1 : a.tag > b.tag ? 1 : 0));
}

/**
 * The notes carrying EVERY selected tag, in their original order. An empty
 * selection keeps everything. Adding a tag can only narrow the result.
 */
export function filterNotesByTags(notes: Note[], selected: readonly string[]): Note[] {
  const wanted = cleanTags(selected);
  if (wanted.length === 0) return notes;
  return notes.filter((note) => {
    const have = noteTagList(note);
    return wanted.every((tag) => have.includes(tag));
  });
}

/** The list URL for a selection. Each tag is encoded, so any text is safe to link. */
export function tagsHref(selected: readonly string[]): string {
  const tags = cleanTags(selected).slice(0, MAX_SELECTED_TAGS);
  if (tags.length === 0) return '/notes';
  return `/notes?${tags.map((tag) => `tag=${encodeURIComponent(tag)}`).join('&')}`;
}

/** The list URL for a single tag, as linked from a note's tag pills. */
export function tagHref(tag: string): string {
  return tagsHref([tag]);
}

/**
 * The filter chips for a selection, with counts that follow it: an unselected
 * chip shows how many notes would remain if it were added, so a chip that
 * would give an empty list is disabled rather than a dead end. A selected chip
 * shows the current list size and links to the selection without it. Chips
 * keep the overall order of collectTags, so they do not jump as you select.
 */
export function facetChips(notes: Note[], selectedInput: readonly string[]): TagChip[] {
  const selected = cleanTags(selectedInput).slice(0, MAX_SELECTED_TAGS);
  const current = filterNotesByTags(notes, selected);
  const full = selected.length >= MAX_SELECTED_TAGS;

  return collectTags(notes).map(({ tag }) => {
    const isSelected = selected.includes(tag);
    const count = isSelected ? current.length : filterNotesByTags(current, [tag]).length;
    const next = isSelected ? selected.filter((t) => t !== tag) : [...selected, tag];
    return {
      tag,
      count,
      selected: isSelected,
      disabled: !isSelected && (count === 0 || full),
      href: tagsHref(next),
    };
  });
}
