import { describe, expect, test } from 'vitest';
import { projects as fallbackProjects, notes as fallbackNotes } from '../src/data/content';
import { siteSettings } from '../src/data/site';
import { fallbackProjectList, fallbackSite } from '../src/lib/fallback';
import { resolveProjectSlug } from '../src/lib/projects';
import { noteSlug } from '../src/lib/notesPreview';

const AVAILABILITY = ['OPEN_TO_WORK', 'OPEN_TO_FREELANCE', 'NOT_AVAILABLE'] as const;

describe('fallback content consistency', () => {
  test('between 2 and 3 projects are marked featured', () => {
    const featured = fallbackProjects.filter((p) => p.featured === true);
    expect(featured.length).toBeGreaterThanOrEqual(2);
    expect(featured.length).toBeLessThanOrEqual(3);
  });

  test('the named projects are the featured ones', () => {
    const featured = fallbackProjects.filter((p) => p.featured === true).map((p) => p.title);
    expect(featured).toContain('Online Marketplace');
    expect(featured).toContain('Online Wedding Invitation');
    expect(featured).toContain('Simple Portfolio');
  });

  test('every project has the fields the strip and the case-study page read', () => {
    for (const project of fallbackProjectList()) {
      expect(project.title.trim()).not.toBe('');
      expect(project.year).toBeGreaterThan(0);
      expect(AVAILABILITY).not.toContain(project.status as never);
      expect(['FINISHED', 'IN PROGRESS', 'SHELVED']).toContain(project.status);
      expect(project.description.trim()).not.toBe('');
      expect(project.slug.trim()).not.toBe('');
    }
  });

  test('each project slug equals slugify(title) unless a slug is given', () => {
    for (const project of fallbackProjectList()) {
      const explicit = fallbackProjects.find((p) => p.title === project.title)?.slug;
      expect(project.slug).toBe(explicit ?? project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''));
      expect(resolveProjectSlug(project)).toBe(project.slug);
    }
  });

  test('project slugs are unique across the fallback content', () => {
    const slugs = fallbackProjectList().map((p) => resolveProjectSlug(p));
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  test('note slugs are unique across the fallback content', () => {
    const slugs = fallbackNotes.map((n) => noteSlug({ title: n.title }));
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  test('the fallback email is a non-empty local@domain address', () => {
    expect(fallbackSite.contact_email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    expect(fallbackSite.contact_email.length).toBeLessThanOrEqual(254);
  });

  test('the fallback availability status is one of the three values', () => {
    expect(AVAILABILITY).toContain(siteSettings.availability_status);
  });

  test('the fallback availability note is at most 120 characters', () => {
    expect(siteSettings.availability_note.length).toBeLessThanOrEqual(120);
  });

  test('the fallback CV value is empty or ends in .pdf', () => {
    const cv = siteSettings.cv_url;
    expect(cv === '' || /\.pdf$/.test(cv)).toBe(true);
  });
});
