// Row shapes returned by the public content API. Field names mirror the
// previous Supabase-backed contract exactly; see routes/content.ts.

export type SiteSettings = {
  id: string;
  site_name: string;
  footer_name: string;
  footer_label: string;
  hero_tagline: string;
  contact_email: string | null;
  updated_at: string;
};

export type HomeContent = {
  id: string;
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
  updated_at: string;
};

export type HomeNavItem = {
  id: string;
  page_key: string;
  label: string;
  description: string;
  display_number: string;
  href: string;
  sort_order: number;
  visible: boolean;
  updated_at: string;
};

export type AboutContent = {
  id: string;
  eyebrow: string;
  quote: string;
  quote_accent: string;
  paragraph_one: string;
  paragraph_two: string;
  portrait_url: string | null;
  updated_at: string;
};

export type Skill = {
  id: string;
  category: string;
  skill_name: string;
  sort_order: number;
  visible: boolean;
};

export type WorkEntry = {
  id: string;
  role: string;
  company: string;
  location: string;
  date_label: string;
  description: string;
  stack: string;
  company_url: string | null;
  sort_order: number;
  visible: boolean;
};

export type EducationEntry = {
  id: string;
  title: string;
  institution: string;
  date_label: string;
  description: string;
  sort_order: number;
  visible: boolean;
};

export type Project = {
  id: string;
  title: string;
  slug: string;
  description: string;
  year: number;
  status: 'FINISHED' | 'IN PROGRESS' | 'SHELVED';
  deployment_status: 'DEPLOYED' | 'NOT_DEPLOYED';
  stack: string;
  live_url: string | null;
  source_url: string | null;
  image_url: string | null;
  sort_order: number;
  featured: boolean;
  visible: boolean;
  published: boolean;
  created_at: string;
  updated_at: string;
};

export type Note = {
  id: string;
  title: string;
  slug: string;
  body: string;
  tag: string;
  author: string | null;
  subtitle: string | null;
  image_url: string | null;
  published: boolean;
  published_at: string | null;
  sort_order: number;
  featured_on_now: boolean;
  created_at: string;
  updated_at: string;
};

export type NowCurrent = {
  id: string;
  updated_label: string;
  label: string;
  title: string;
  description: string;
  visible: boolean;
  updated_at: string;
};

export type NowAttention = {
  id: string;
  number: string;
  label: string;
  title: string;
  note: string;
  sort_order: number;
  visible: boolean;
};

export type NowHistory = {
  id: string;
  date_label: string;
  text: string;
  source_type: string;
  created_at: string;
};
