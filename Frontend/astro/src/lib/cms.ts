// Typed domain fetchers over the Bun content API. Each returns the live
// payload or null — never fallback data. Pages combine live results with
// their intentional static fallback content from src/data/*, so the two
// sources stay visibly distinct in calling code (live* vs fallback*).

import { apiGet } from './api';

export type SiteSettings = {
  site_name: string;
  footer_name: string;
  footer_label: string;
  hero_tagline: string;
  contact_email?: string | null;
};

export type HomeContent = {
  archive_label: string;
  archive_number: string;
  headline_line_one: string;
  headline_line_two: string;
  headline_line_three: string;
  headline_accent: string;
  headline_period: string;
  headline_meta: string;
  intro: string;
  cta_label: string;
  cta_url: string;
  hud_label: string;
  hud_subtitle: string;
  years_building: number;
  hud_noise_top: string;
  hud_noise_bottom: string;
};

export type HomeNavItem = {
  page_key: string;
  label: string;
  description: string;
  display_number: string;
  href: string;
};

export type AboutContent = {
  eyebrow: string;
  quote: string;
  quote_accent: string;
  paragraph_one: string;
  paragraph_two: string;
  portrait_url?: string | null;
};

export type Skill = { category: string; skill_name: string };
export type WorkEntry = {
  role: string;
  company: string;
  location: string;
  date_label: string;
  description: string;
  stack: string;
  company_url?: string | null;
};
export type EducationEntry = { title: string; institution: string; date_label: string; description: string };
export type Project = {
  title: string;
  slug: string;
  description: string;
  year: number;
  status: 'FINISHED' | 'IN PROGRESS' | 'SHELVED';
  deployment_status: 'DEPLOYED' | 'NOT_DEPLOYED';
  stack: string;
  live_url?: string | null;
  source_url?: string | null;
  image_url?: string | null;
  featured: boolean;
};
export type Note = {
  title: string;
  slug: string;
  body: string;
  tag: string;
  author?: string | null;
  subtitle?: string | null;
  image_url?: string | null;
  published_at?: string | null;
};
export type NowAttention = { number: string; label: string; title: string; note: string };
export type NowHistory = { date_label: string; text: string };
export type NowCurrent = {
  updated_label: string;
  label: string;
  title: string;
  description: string;
};

export async function fetchSite(): Promise<SiteSettings | null> {
  const res = await apiGet<SiteSettings>('/api/content/site');
  return res.status === 'ok' && res.data?.site_name ? res.data : null;
}

export async function fetchHome(): Promise<{
  content: HomeContent | null;
  navigation: HomeNavItem[];
} | null> {
  const res = await apiGet<{ content: HomeContent | null; navigation: HomeNavItem[] }>('/api/content/home');
  return res.status === 'ok' ? res.data : null;
}

export async function fetchAbout(): Promise<{
  content: AboutContent | null;
  skills: Skill[];
} | null> {
  const res = await apiGet<{ content: AboutContent | null; skills: Skill[] }>('/api/content/about');
  return res.status === 'ok' ? res.data : null;
}

export async function fetchWork(): Promise<{
  work: WorkEntry[];
  education: EducationEntry[];
} | null> {
  const res = await apiGet<{ work: WorkEntry[]; education: EducationEntry[] }>('/api/content/work');
  return res.status === 'ok' ? res.data : null;
}

export async function fetchProjects(): Promise<{ projects: Project[] } | null> {
  const res = await apiGet<{ projects: Project[] }>('/api/content/projects');
  return res.status === 'ok' ? res.data : null;
}

export async function fetchNotes(): Promise<{ notes: Note[] } | null> {
  const res = await apiGet<{ notes: Note[] }>('/api/content/notes');
  return res.status === 'ok' ? res.data : null;
}

export async function fetchNow(): Promise<{
  current: NowCurrent | null;
  attention: NowAttention[];
  history: NowHistory[];
} | null> {
  const res = await apiGet<{
    current: NowCurrent | null;
    attention: NowAttention[];
    history: NowHistory[];
  }>('/api/content/now');
  return res.status === 'ok' ? res.data : null;
}
