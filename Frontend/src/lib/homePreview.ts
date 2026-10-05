// The four home-page preview blocks, each built from its own live payload
// with its own fallback. Blocks are independent by construction: every one is
// wrapped in its own try/catch, so a throwing builder costs exactly that one
// block and nothing else, and a null payload means "CMS unreachable" for that
// block only.

import { cached } from './requestCache';
import { fetchNow, fetchNotes, fetchProjects, fetchSite, type Note, type NowCurrent, type Project, type SiteSettings } from './cms';
import { fallbackNoteList, fallbackProjectList, fallbackSite } from './fallback';
import { selectFeaturedProjects, toFeaturedEntry, type FeaturedEntry } from './projects';
import { noteDateLabel, noteSlug, readLabel, selectLatestNotes } from './notesPreview';
import { noteTagList } from './noteTags';
import { buildContactView, type ContactView } from './availability';
import { buildNowStatus, type NowStatusView } from './nowStatus';

export type NoteEntry = {
  title: string;
  /** The note's tags in display order; one to three for a well-formed note. */
  tags: string[];
  dateLabel: string;
  readLabel: string;
  href: string;
  /** Artwork for the shared row's media cell; null falls back to the placeholder. */
  image: string | null;
  /**
   * The CMS note's subtitle, trimmed; null when blank or absent. Renders on
   * the homepage strip under the title, above the read time. Deliberately the
   * same view the note detail page already uses, so a note's standfirst cannot
   * differ between the two pages.
   */
  subtitle: string | null;
};

export type NowPayload = { current: NowCurrent | null } | null;

export type HomePreview = {
  /** null omits the strip entirely, heading and /projects link included. */
  featured: FeaturedEntry[] | null;
  notes: NoteEntry[] | null;
  now: NowStatusView;
  contact: ContactView;
};

function toNoteEntry(note: Note): NoteEntry {
  const image = note.image_url?.trim() ?? '';
  const subtitle = note.subtitle?.trim() ?? '';
  return {
    title: note.title,
    tags: noteTagList(note),
    dateLabel: noteDateLabel(note.created_at, note.published_at),
    readLabel: readLabel(note),
    href: `/notes/${noteSlug(note)}`,
    image: image === '' ? null : image,
    // Blank collapses to null so a whitespace-only subtitle never renders an
    // empty line between the title and the read time.
    subtitle: subtitle === '' ? null : subtitle,
  };
}

/** The latest-notes strip, from live notes or from the fallback array. */
function buildNotes(live: Note[] | null): NoteEntry[] | null {
  const source = live === null ? fallbackNoteList() : live;
  if (live !== null && live.length === 0) return null; // reachable and empty: omit
  const entries = selectLatestNotes(source, 3).map(toNoteEntry);
  // Reachable, but nothing published: omit rather than render an empty strip.
  return entries.length > 0 ? entries : null;
}

export function buildHomePreview(live: {
  projects: Project[] | null;
  notes: Note[] | null;
  now: NowPayload;
  site: SiteSettings | null;
}): HomePreview {
  let featured: FeaturedEntry[] | null = null;
  let notes: NoteEntry[] | null = null;
  let now: NowStatusView;
  let contact: ContactView;

  try {
    const source = live.projects === null ? fallbackProjectList() : live.projects;
    // Omission covers both "the CMS returned nothing" and "the CMS returned
    // nothing a visitor may see": a strip with zero entries must not render
    // an empty heading and a dangling /projects link.
    const entries =
      live.projects !== null && live.projects.length === 0 ? [] : selectFeaturedProjects(source, 3).map(toFeaturedEntry);
    featured = entries.length > 0 ? entries : null;
  } catch (error) {
    console.error('[home] featured strip failed to build', error);
    featured = null;
  }

  try {
    notes = buildNotes(live.notes);
  } catch (error) {
    console.error('[home] latest notes strip failed to build', error);
    notes = null;
  }

  try {
    now = buildNowStatus(live.now);
  } catch (error) {
    console.error('[home] now status failed to build', error);
    now = buildNowStatus(null);
  }

  try {
    contact = buildContactView(live.site, fallbackSite);
  } catch (error) {
    console.error('[home] contact block failed to build', error);
    contact = buildContactView(null, fallbackSite);
  }

  return { featured, notes, now, contact };
}

/**
 * Starts all five fetches through the request cache before awaiting any of
 * them, so the page's total CMS wait is one timeout window rather than five.
 * Base.astro's own two fetches resolve from the same cache.
 *
 * Returns the view model itself, not a wrapper around it: callers destructure
 * the four blocks straight off the result.
 */
export async function loadHomePreview(locals: App.Locals): Promise<HomePreview> {
  const projectsP = cached(locals, 'projects', fetchProjects);
  const notesP = cached(locals, 'notes', fetchNotes);
  const nowP = cached(locals, 'now', fetchNow);
  const siteP = cached(locals, 'site', fetchSite);
  const [projects, notes, now, site] = await Promise.all([projectsP, notesP, nowP, siteP]);

  return buildHomePreview({
    projects: projects?.projects ?? null,
    notes: notes?.notes ?? null,
    now: now ?? null,
    site,
  });
}
