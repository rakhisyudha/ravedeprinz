import { sql } from '../db';
import type {
  AboutContent,
  EducationEntry,
  HomeContent,
  HomeNavItem,
  Note,
  NowAttention,
  NowCurrent,
  NowHistory,
  Project,
  SiteSettings,
  Skill,
  WorkEntry,
} from '../types';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getSiteSettings(): Promise<SiteSettings | null> {
  const rows = await sql`select * from site_settings limit 1`;
  return (rows[0] as SiteSettings | undefined) ?? null;
}

export async function getHome(): Promise<{ content: HomeContent | null; navigation: HomeNavItem[] }> {
  const [contentRows, navRows] = await Promise.all([
    sql`select * from home_content limit 1`,
    sql`select * from home_navigation where visible = true order by sort_order`,
  ]);
  return {
    content: (contentRows[0] as HomeContent | undefined) ?? null,
    navigation: navRows as HomeNavItem[],
  };
}

export async function getAbout(): Promise<{ content: AboutContent | null; skills: Skill[] }> {
  const [contentRows, skillRows] = await Promise.all([
    sql`select * from about_content limit 1`,
    sql`select * from skills where visible = true order by sort_order`,
  ]);
  return {
    content: (contentRows[0] as AboutContent | undefined) ?? null,
    skills: skillRows as Skill[],
  };
}

export async function getWork(): Promise<{ work: WorkEntry[]; education: EducationEntry[] }> {
  const [workRows, educationRows] = await Promise.all([
    sql`select * from work_entries where visible = true order by sort_order`,
    sql`select * from education_entries where visible = true order by sort_order`,
  ]);
  return { work: workRows as WorkEntry[], education: educationRows as EducationEntry[] };
}

export async function getProjects(): Promise<{ projects: Project[] }> {
  const rows = await sql`
    select * from projects
    where published = true and visible = true
    order by sort_order, year desc
  `;
  return { projects: rows as Project[] };
}

export async function getNotes(): Promise<{ notes: Note[] }> {
  const rows = await sql`
    select * from notes
    where published = true
    order by published_at desc nulls last
  `;
  return { notes: rows as Note[] };
}

export async function getNow(): Promise<{
  current: NowCurrent | null;
  attention: NowAttention[];
  history: NowHistory[];
}> {
  const [currentRows, attentionRows, historyRows] = await Promise.all([
    sql`select * from now_current limit 1`,
    sql`select * from now_attention where visible = true order by sort_order`,
    sql`select * from now_history order by created_at desc limit 3`,
  ]);
  return {
    current: (currentRows[0] as NowCurrent | undefined) ?? null,
    attention: attentionRows as NowAttention[],
    history: historyRows as NowHistory[],
  };
}

export async function getNowHistory(): Promise<{ history: NowHistory[] }> {
  const rows = await sql`select * from now_history order by created_at desc limit 3`;
  return { history: rows as NowHistory[] };
}

// Same addressing rule as the previous API: UUIDs match by id,
// anything else matches by slug. Unpublished rows never match.
export async function getNote(key: string): Promise<Note | null> {
  const value = decodeURIComponent(key);
  const rows = UUID_RE.test(value)
    ? await sql`select * from notes where published = true and id = ${value} limit 1`
    : await sql`select * from notes where published = true and slug = ${value} limit 1`;
  return (rows[0] as Note | undefined) ?? null;
}
