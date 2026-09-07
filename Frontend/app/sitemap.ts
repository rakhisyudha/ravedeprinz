import type { MetadataRoute } from 'next';
import { getNotesContent } from '../lib/cms';
import { getSiteUrl } from '../lib/seo';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = getSiteUrl();
  const pages = ['', '/about', '/work', '/projects', '/notes', '/now'].map((path) => ({
    url: `${site}${path || '/'}`,
    lastModified: new Date(),
  }));

  const { notes } = await getNotesContent();
  const safeDate = (value?: string | null): Date => {
    const parsed = value ? new Date(value) : new Date();
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  };
  const entries = notes
    .filter((note) => note.slug?.trim() || note.id)
    .map((note) => ({
      url: `${site}/notes/${note.slug?.trim() || note.id}`,
      lastModified: safeDate(note.published_at),
    }));

  return [...pages, ...entries];
}
