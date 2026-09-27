// Normalizes the intentional static fallback content in src/data/* into the
// CMS_Client Project/Note shapes, so the projects list, the notes list, the
// home preview, and the case-study fallback all work on one type instead of
// each page re-deriving the same object literals.
//
// The normalizers are pure functions of their input: the exported
// fallback*List() helpers bind them to the shipped data, and the property
// tests drive them with generated lists instead of mutating that data.

import { notes as rawNotes, projects as rawProjects, type Project as RawProject } from '../data/content';
import { projectImages, siteSettings, slugify } from '../data/site';
import type { Note, Project } from './cms';
import { resolveProjectSlug } from './projects';
import type { Availability } from './availability';

export function normalizeProject(raw: RawProject, index: number): Project {
  const slug = raw.slug?.trim() || slugify(raw.title);
  return {
    title: raw.title,
    slug,
    description: raw.desc,
    year: Number(raw.year) || 0,
    status: raw.type,
    // Only the projects that have a live URL are deployed; the rest were
    // built but never published.
    deployment_status: raw.link ? 'DEPLOYED' : 'NOT_DEPLOYED',
    stack: raw.stack,
    live_url: raw.link ?? null,
    source_url: raw.github ?? null,
    // Own-property lookup only: a slug like "toString" must not resolve to
    // an inherited Object.prototype member.
    image_url: Object.hasOwn(projectImages, slug) ? projectImages[slug]! : null,
    featured: raw.featured ?? false,
    published: true,
    visible: true,
    sort_order: index,
    // Fallback projects carry no case study: the case-study page keeps the
    // Stack section only while the CMS is unreachable.
    problem: '',
    what_built: '',
    key_decision: '',
    outcome: '',
    updated_at: null,
  };
}

export function normalizeNote(raw: (typeof rawNotes)[number]): Note {
  return {
    title: raw.title,
    slug: slugify(raw.title),
    body: raw.text,
    tag: raw.tag,
    author: 'Rakhis',
    subtitle: null,
    image_url: null,
    created_at: null,
    published_at: null,
    published: true,
  };
}

export function fallbackProjectList(): Project[] {
  return rawProjects.map(normalizeProject);
}

export function fallbackNoteList(): Note[] {
  return rawNotes.map(normalizeNote);
}

/** The fallback project a `/projects/{slug}` request resolves to. */
export function findFallbackProject(slug: string): Project | null {
  return fallbackProjectList().find((p) => resolveProjectSlug(p) === slug) ?? null;
}

export function findFallbackNote(slug: string): Note | null {
  return fallbackNoteList().find((n) => (n.slug?.trim() || slugify(n.title)) === slug) ?? null;
}

/** The fallback contact values, with the availability status already narrowed. */
export type FallbackSite = {
  contact_email: string;
  cv_url: string;
  availability_status: Availability;
  availability_note: string;
};

export const fallbackSite: FallbackSite = {
  contact_email: siteSettings.contact_email,
  availability_status: siteSettings.availability_status,
  availability_note: siteSettings.availability_note,
  cv_url: siteSettings.cv_url,
};
