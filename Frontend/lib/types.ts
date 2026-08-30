export type SiteSettings = {
  site_name: string;
  footer_name: string;
  footer_label: string;
  hero_tagline: string;
  contact_email?: string | null;
};

export type HomeNavItem = {
  page_key: string;
  label: string;
  description: string;
  display_number: string;
  href: string;
};

export type HomeContent = {
  content: {
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
  } | null;
  navigation: HomeNavItem[];
};

export type SkillItem = { category: string; skill_name: string };

export type AboutContent = {
  content: {
    eyebrow: string;
    quote: string;
    quote_accent: string;
    paragraph_one: string;
    paragraph_two: string;
    portrait_asset_id?: string | null;
    portrait_url?: string | null;
  } | null;
  skills: SkillItem[];
};

export type WorkEntry = {
  id?: string;
  role: string;
  company: string;
  location: string;
  date_label: string;
  description: string;
  stack: string;
  company_url?: string | null;
};

export type EducationEntry = {
  id?: string;
  title: string;
  institution: string;
  date_label: string;
  description: string;
};

export type WorkContent = {
  work: WorkEntry[];
  education: EducationEntry[];
};

export type ProjectContent = {
  id?: string;
  title: string;
  slug: string;
  description: string;
  year: number;
  status: 'FINISHED' | 'IN PROGRESS' | 'SHELVED';
  deployment_status: 'DEPLOYED' | 'NOT_DEPLOYED';
  stack: string;
  live_url?: string | null;
  source_url?: string | null;
  image_asset_id?: string | null;
  image_url?: string | null;
  featured: boolean;
};

export type ProjectsContent = { projects: ProjectContent[] };

export type NoteItem = {
  id?: string;
  title: string;
  slug: string;
  body: string;
  tag: string;
  published_at?: string | null;
};

export type NotesContent = { notes: NoteItem[] };

export type NowAttention = { number: string; label: string; title: string; note: string };
export type NowHistoryItem = { date_label: string; text: string };

export type NowContent = {
  current: {
    updated_label: string;
    label: string;
    title: string;
    description: string;
  } | null;
  attention: NowAttention[];
  history: NowHistoryItem[];
};
