import type { SiteSettings, HomeContent, AboutContent, WorkContent, ProjectsContent, NotesContent, NowContent } from './types';
import { projects as staticProjects, work as staticWork, education as staticEducation, skills as staticSkills, notes as staticNotes } from '../data/content';

const API = process.env.CMS_API_URL ?? 'http://localhost:4000';

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API}${path}`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Home
// ---------------------------------------------------------------------------
export async function getHomeContent(): Promise<HomeContent> {
  const remote = await getJson<HomeContent>('/api/content/home');
  if (remote?.content) return remote;

  const nav = [
    ['about', 'About', 'The person behind the systems.', '02', '/about'],
    ['work', 'Work', 'Roles, teams, and shipped software.', '03', '/work'],
    ['projects', 'Projects', 'Things built while learning.', '04', '/projects'],
    ['notes', 'Notes', 'Short thoughts from the workbench.', '05', '/notes'],
    ['now', 'Now', 'What currently has my attention.', '06', '/now'],
  ] as const;

  return {
    content: {
      archive_label: 'PERSONAL ARCHIVE',
      archive_number: '001',
      headline_line_one: "I DON'T",
      headline_line_two: 'GUESS.',
      headline_line_three: 'I DEBUG.',
      headline_accent: 'GUESS.',
      headline_period: '.',
      headline_meta: 'BACKEND / SYSTEMS / GO',
      intro: 'I’m Rakhis de Yudha. I study computer science at Binus Online Learning and spend most of my building time around Go, PostgreSQL, React, Docker, and the questions underneath a product’s interface.',
      cta_label: 'ENTER THE ARCHIVE',
      cta_url: '/projects',
      hud_label: 'YEARS BUILDING',
      hud_subtitle: 'BACKEND / SYSTEMS / GO',
      years_building: 4,
      hud_noise_top: '// SYSTEM_04',
      hud_noise_bottom: 'BUILD / REPEAT / SHIP',
    },
    navigation: nav.map(([page_key, label, description, display_number, href]) => ({ page_key, label, description, display_number, href })),
  };
}

export async function getSiteSettings(): Promise<SiteSettings> {
  const remote = await getJson<SiteSettings>('/api/content/site');
  if (remote?.site_name) return remote;
  return { site_name: 'ravedeprinz', footer_name: 'ravedepr1nz', footer_label: 'PERSONAL ARCHIVE', hero_tagline: "I DON'T GUESS. I DEBUG." };
}

// ---------------------------------------------------------------------------
// About
// ---------------------------------------------------------------------------
export async function getAboutContent(): Promise<AboutContent> {
  const remote = await getJson<AboutContent>('/api/content/about');
  if (remote?.content) return remote;

  return {
    content: {
      eyebrow: 'IDENTITY / 002',
      quote: 'I like work that is',
      quote_accent: 'clear, useful,',
      paragraph_one: 'I’m a computer science student from Bogor, Indonesia. My strongest area is backend development, but I enjoy following a problem all the way through to the interface people actually touch.',
      paragraph_two: 'I’m interested in systems that feel calm under pressure, small tools that remove friction, and the difference between software that technically works and software someone can trust.',
    },
    skills: staticSkills.flatMap((group) => group.skills.map((skill_name) => ({ category: group.category, skill_name }))),
  };
}

// ---------------------------------------------------------------------------
// Work
// ---------------------------------------------------------------------------
export async function getWorkContent(): Promise<WorkContent> {
  const remote = await getJson<WorkContent>('/api/content/work');
  if (remote?.work) return remote;

  return {
    work: staticWork.map((w) => ({ role: w.role, company: w.company, location: w.location ?? '', date_label: w.date, description: w.desc, stack: w.stack, company_url: w.companyLink })),
    education: staticEducation.map((e) => ({ title: e.type, institution: e.place, date_label: e.time, description: e.info })),
  };
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------
export async function getProjectsContent(): Promise<ProjectsContent> {
  const remote = await getJson<ProjectsContent>('/api/content/projects');
  if (remote?.projects) return remote;

  return {
    projects: staticProjects.map((p) => ({
      title: p.title,
      slug: p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
      description: p.desc,
      year: Number(p.year) || 0,
      status: p.type,
      deployment_status: p.title === 'Web Auction' ? 'NOT_DEPLOYED' : 'DEPLOYED',
      stack: p.stack,
      live_url: p.link,
      source_url: p.github,
      featured: false,
    })),
  };
}

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------
export async function getNotesContent(): Promise<NotesContent> {
  const remote = await getJson<NotesContent>('/api/content/notes');
  if (remote?.notes) return remote;

  return {
    notes: staticNotes.map((n) => ({ title: n.title, slug: n.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''), body: n.text, tag: n.tag, published_at: n.date })),
  };
}

// ---------------------------------------------------------------------------
// Now
// ---------------------------------------------------------------------------
export async function getNowContent(): Promise<NowContent> {
  const remote = await getJson<NowContent>('/api/content/now');
  if (remote?.current) return remote;

  return {
    current: {
      updated_label: '27 AUG 2026',
      label: 'CURRENTLY BUILDING',
      title: 'A CRM.',
      description: "I'm working on the backend side of a CRM at Radius Data Solusi. Most of my attention is currently going into Go, Gin, APIs, authentication, database structure, and keeping the system understandable as it grows.",
    },
    attention: [
      { number: '01', label: 'LEARNING', title: 'gRPC', note: "Trying to understand the trade-offs instead of treating it as just 'REST, but faster.'" },
      { number: '02', label: 'READING', title: 'Designing Data-Intensive Applications', note: 'Slowly. Usually with more tabs open than necessary.' },
      { number: '03', label: 'THINKING ABOUT', title: 'How much complexity can a good name remove?', note: 'Naming things is still harder than it should be.' },
    ],
    history: [
      { date_label: '27 AUG', text: 'Working on the backend side of a CRM.' },
      { date_label: '22 AUG', text: 'Refactored an API surface that had outgrown its first assumptions.' },
      { date_label: '18 AUG', text: 'Started learning more seriously about gRPC.' },
    ],
  };
}
