// Idempotent seed: inserts default content + owner allowlist.
// If any admin_users row already exists, seeding is skipped so re-runs never
// duplicate or overwrite content. Runs automatically on container start.
import { adminClient } from './helpers';
import { projects as seedProjects, work as seedWork, education as seedEducation, skills as seedSkills, notes as seedNotes } from './seed-content';

const OWNER_EMAIL = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase() ?? '';

function slugify(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

async function alreadySeeded(): Promise<boolean> {
  const { data } = await adminClient.from('admin_users').select('id').limit(1).maybeSingle();
  return Boolean(data);
}

async function main() {
  console.log('[seed] checking existing data…');

  if (await alreadySeeded()) {
    console.log('[seed] data already exists — skipping.');
    process.exit(0);
  }

  console.log('[seed] seeding default content…');

  await adminClient.from('site_settings').upsert({ id: '00000000-0000-0000-0000-000000000001', site_name: 'ravedeprinz', footer_name: 'ravedepr1nz', footer_label: 'PERSONAL ARCHIVE', hero_tagline: "I DON'T GUESS. I DEBUG." });
  await adminClient.from('home_content').upsert({
    id: '00000000-0000-0000-0000-000000000002',
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
  });

  const nav = [
    ['about', 'About', 'The person behind the systems.', '02', '/about'],
    ['work', 'Work', 'Roles, teams, and shipped software.', '03', '/work'],
    ['projects', 'Projects', 'Things built while learning.', '04', '/projects'],
    ['notes', 'Notes', 'Short thoughts from the workbench.', '05', '/notes'],
    ['now', 'Now', 'What currently has my attention.', '06', '/now'],
  ] as const;
  await adminClient.from('home_navigation').upsert(nav.map(([page_key, label, description, display_number, href], i) => ({ page_key, label, description, display_number, href, sort_order: i + 1, visible: true })), { onConflict: 'page_key' });

  await adminClient.from('about_content').upsert({
    id: '00000000-0000-0000-0000-000000000003',
    eyebrow: 'IDENTITY / 002',
    quote: 'I like work that is',
    quote_accent: 'clear, useful,',
    paragraph_one: 'I’m a computer science student from Bogor, Indonesia. My strongest area is backend development, but I enjoy following a problem all the way through to the interface people actually touch.',
    paragraph_two: 'I’m interested in systems that feel calm under pressure, small tools that remove friction, and the difference between software that technically works and software someone can trust.',
  });
  const skillRows: Array<Record<string, unknown>> = [];
  let skillOrder = 0;
  for (const group of seedSkills) for (const skill of group.skills) skillRows.push({ category: group.category, skill_name: skill, sort_order: ++skillOrder, visible: true });
  await adminClient.from('skills').insert(skillRows);

  await adminClient.from('work_entries').insert(seedWork.map((w, i) => ({ role: w.role, company: w.company, location: w.location ?? '', date_label: w.date, description: w.desc, stack: w.stack, company_url: w.companyLink ?? null, sort_order: i + 1, visible: true })));
  await adminClient.from('education_entries').insert(seedEducation.map((e, i) => ({ title: e.type, institution: e.place, date_label: e.time, description: e.info, sort_order: i + 1, visible: true })));

  for (const p of seedProjects) {
    await adminClient.from('projects').upsert({
      slug: slugify(p.title),
      title: p.title,
      description: p.desc,
      year: Number(p.year) || 0,
      status: p.type === 'SHELVED' ? 'SHELVED' : p.type === 'IN PROGRESS' ? 'IN PROGRESS' : 'FINISHED',
      deployment_status: p.title === 'Web Auction' ? 'NOT_DEPLOYED' : 'DEPLOYED',
      stack: p.stack,
      live_url: p.link ?? null,
      source_url: p.github ?? null,
      published: true,
      visible: true,
    }, { onConflict: 'slug' });
  }

  for (const n of seedNotes) {
    await adminClient.from('notes').upsert({ slug: slugify(n.title), title: n.title, body: n.text, tag: n.tag, published: true, published_at: new Date().toISOString() }, { onConflict: 'slug' });
  }

  await adminClient.from('now_current').upsert({
    id: '00000000-0000-0000-0000-000000000004',
    updated_label: '27 AUG 2026',
    label: 'CURRENTLY BUILDING',
    title: 'A CRM.',
    description: "I'm working on the backend side of a CRM at Radius Data Solusi. Most of my attention is currently going into Go, Gin, APIs, authentication, database structure, and keeping the system understandable as it grows.",
    visible: true,
  });
  const attention = [
    ['01', 'LEARNING', 'gRPC', "Trying to understand the trade-offs instead of treating it as just 'REST, but faster.'"],
    ['02', 'READING', 'Designing Data-Intensive Applications', 'Slowly. Usually with more tabs open than necessary.'],
    ['03', 'THINKING ABOUT', 'How much complexity can a good name remove?', 'Naming things is still harder than it should be.'],
  ];
  await adminClient.from('now_attention').insert(attention.map(([number, label, title, note], i) => ({ number, label, title, note, sort_order: i + 1, visible: true })));
  await adminClient.from('now_history').insert([
    { date_label: '27 AUG', text: 'Working on the backend side of a CRM.', source_type: 'UPDATE' },
    { date_label: '22 AUG', text: 'Refactored an API surface that had outgrown its first assumptions.', source_type: 'UPDATE' },
    { date_label: '18 AUG', text: 'Started learning more seriously about gRPC.', source_type: 'UPDATE' },
  ]);

  const { data: existingAdmin } = await adminClient.from('admin_users').select('id').eq('email', OWNER_EMAIL).maybeSingle();
  if (!existingAdmin) {
    await adminClient.from('admin_users').insert({ email: OWNER_EMAIL, role: 'owner', active: true });
    console.log(`[seed] registered owner email ${OWNER_EMAIL} in allowlist`);
  }

  console.log('[seed] done.');
  process.exit(0);
}

main().catch((error) => { console.error('[seed] failed', error); process.exit(1); });
