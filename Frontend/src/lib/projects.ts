// Pure project helpers shared by the home preview strip, the projects list,
// the case-study page, the sitemap, the OG route, and the admin CMS. One
// implementation of "which projects" and "what is a project's URL" so those
// consumers can never disagree.

import type { Project } from './cms';
import { projectImages, slugify } from '../data/site';

/**
 * The canonical link slug: the stored slug with surrounding whitespace
 * removed, or slugify(title) when there is nothing usable. Every consumer
 * derives `/projects/{slug}` from here (Requirement 9.4).
 */
export function resolveProjectSlug(p: { slug?: string | null; title: string }): string {
  return p.slug?.trim() || slugify(p.title);
}

/** Featured_Order: sort_order ascending, then year descending. */
export function compareFeaturedOrder(a: Project, b: Project): number {
  const orderA = a.sort_order ?? 0;
  const orderB = b.sort_order ?? 0;
  if (orderA !== orderB) return orderA - orderB;
  return (b.year ?? 0) - (a.year ?? 0);
}

/** A project a visitor may see. Only an explicit false hides it. */
export function isPublic(p: Project): boolean {
  return p.published !== false && p.visible !== false;
}

/**
 * The projects the home strip shows: the featured ones in Featured_Order,
 * falling back to the first public projects when nothing is flagged
 * featured, and an empty list when nothing is public at all (which is what
 * omits the strip).
 */
export function selectFeaturedProjects(all: Project[], limit = 3): Project[] {
  const ordered = all.filter(isPublic).slice().sort(compareFeaturedOrder);
  const featured = ordered.filter((p) => p.featured);
  return (featured.length > 0 ? featured : ordered).slice(0, limit);
}

/** The project after `current` in the public Featured_Order, wrapping. */
export function nextProject(all: Project[], current: Project): Project | null {
  const ordered = all.filter(isPublic).slice().sort(compareFeaturedOrder);
  if (ordered.length < 2) return null;
  const index = ordered.findIndex((p) => resolveProjectSlug(p) === resolveProjectSlug(current));
  if (index === -1) return null;
  return ordered[(index + 1) % ordered.length]!;
}

/** Single-line text capped at `max` characters, ellipsis included in the cap. */
export function truncateLine(text: string, max = 140): string {
  const value = (text ?? '').replace(/\s+/g, ' ').trim();
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

export function projectHref(p: Project): string {
  return `/projects/${resolveProjectSlug(p)}`;
}

/**
 * Whether `/projects/{slug}` case-study pages are published.
 *
 * They are not yet, so every entry that would link to one points somewhere
 * real instead: the projects list renders the entry as plain, non-clickable
 * text, and the home featured strip links to the projects index. This is the
 * single switch — flip it to true when the pages ship and both surfaces
 * start linking per project again, with no other edit.
 */
export const PROJECT_PAGES_PUBLISHED = false;

/** The link an entry should carry, or null when it must not be a link. */
export function projectEntryHref(p: Project): string | null {
  return PROJECT_PAGES_PUBLISHED ? projectHref(p) : null;
}

/**
 * The projects list artwork: the CMS image when set, otherwise the bundled
 * preview for that slug. The own-property check keeps a slug like "toString"
 * from resolving to an inherited Object.prototype member.
 */
export function projectImage(p: Project): string | null {
  const stored = p.image_url?.trim() ?? '';
  if (stored !== '') return stored;
  const slug = resolveProjectSlug(p);
  return Object.hasOwn(projectImages, slug) ? (projectImages[slug] ?? null) : null;
}

export type FeaturedEntry = {
  title: string;
  year: number;
  status: string;
  description: string;
  image: string | null;
  href: string;
};

export function toFeaturedEntry(project: Project): FeaturedEntry {
  const image = project.image_url?.trim() ?? '';
  return {
    title: project.title,
    year: project.year,
    status: project.status,
    description: truncateLine(project.description ?? '', 140),
    image: image === '' ? null : image,
    href: projectHref(project),
  };
}
