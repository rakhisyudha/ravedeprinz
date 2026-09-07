// Idempotent seed: inserts the default published content once.
// Skips entirely when site_settings already has a row, so re-runs never
// duplicate or overwrite. Timestamps are fixed (not now()) so reseeds and
// fresh databases converge on identical content and ordering.
import { sql } from './db';

function slugify(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

const projects = [
  { title: 'Simple Portfolio', type: 'FINISHED', year: 2021, desc: 'My first portfolio website, made it from simple html, css, and js. This website gave me so much experience, especially when i work with the responsive.', stack: 'HTML · CSS · JavaScript', link: 'https://rakhisdeyudha.netlify.app/', github: 'https://github.com/rakhisyudha/Rakhis_Portfolio' },
  { title: 'Pakis Hills', type: 'FINISHED', year: 2022, desc: 'A landing page for Pakis Hills. This project helped me become more careful with responsive layouts and CSS.', stack: 'HTML · CSS · JavaScript', link: 'https://rakhis-pakis.netlify.app/', github: 'https://github.com/rakhisyudha/PakisHillss' },
  { title: 'Outbound Design', type: 'FINISHED', year: 2022, desc: 'A promotional landing page for an outbound/training program, built and deployed as a static site.', stack: 'HTML · CSS · JavaScript', link: 'https://rakhis-outbound.netlify.app/', github: 'https://github.com/rakhisyudha/OutboundDesign' },
  { title: 'Web Auction', type: 'FINISHED', year: 2022, desc: 'Made it from CodeIgniter Framework with MySql database, this is my school project, and had it done. Unfortunately, i havent deploy it yet.', stack: 'PHP · CodeIgniter · MySQL', link: null as string | null, github: 'https://github.com/rakhisyudha/WebLelang' },
  { title: 'Currency Converter', type: 'FINISHED', year: 2022, desc: 'A small currency converter built as practice with simple frontend code and very few dependencies.', stack: 'HTML · CSS · JavaScript', link: 'https://currcov.netlify.app/', github: 'https://github.com/rakhisyudha/Converter_Currency' },
  { title: 'Quiz App', type: 'FINISHED', year: 2023, desc: 'A mobile quiz application and my first serious attempt at designing an interface for a phone screen.', stack: 'Mobile App', link: 'https://appetize.io/app/b_oaujsptwwlpygbcgwucebwj43u?device=pixel7&osVersion=13.0&toolbar=true', github: 'https://github.com/rakhisyudha/quiz_app' },
  { title: 'Online Wedding Invitation', type: 'FINISHED', year: 2023, desc: 'A digital wedding invitation site built with Next.js, Tailwind CSS, and Framer Motion. Features SEO-friendly routing, fully responsive design, and integrated email service (SendGrid) for the contact form. Deployed on Vercel and used to invite real guests.', stack: 'Next.js · Tailwind · Framer Motion · SendGrid', link: 'https://weddinganidarahmat.vercel.app/', github: 'https://github.com/rakhisyudha/WeddingApp' },
  { title: 'Online Marketplace', type: 'FINISHED', year: 2023, desc: 'A full-stack marketplace built with React, Express, and MongoDB. Implements React Router for navigation, Axios for data fetching, a RESTful CRUD API for product data, JWT-based login/register, and Google Analytics integration. Frontend deployed to Vercel, backend deployed to Railway.', stack: 'React · Express · MongoDB', link: 'https://online-web-shop-one.vercel.app/', github: 'https://github.com/rakhisyudha/online_marketplace_kel2' },
] as const;

const work = [
  { role: 'Backend Intern', company: 'Radius Data Solusi', location: '', date: 'MAR 2026 — SEP 2026', desc: 'Built a comprehensive CRM platform from scratch using Framework Gin Go that manages sales pipelines, deals, and customer relationships. Implemented enterprise-grade features including role-based access control, email notifications, Google Drive integration, and a drag-and-drop Kanban board.', stack: 'Go · Gin · PostgreSQL', url: null as string | null },
  { role: 'Frontend Intern', company: 'CV Sinang Permata', location: 'Megamendung, Bogor, Indonesia', date: 'JUL 2022 — OCT 2022', desc: 'Converted Figma designs into HTML, learned Git and GitLab workflows, and picked up real project-timing discipline. Sharpened CSS and responsive design skills.', stack: 'HTML · CSS · Figma · Git', url: null as string | null },
];

const education = [
  { title: 'Bachelor of Science in Computer Science', institution: 'Binus Online Learning', date: '2024 — 2028', desc: 'Relevant coursework: Algorithm & Programming, Calculus, Object-Oriented Programming, Logic, Database Design, Computer Security, Computer Networks.' },
  { title: 'Major of Software Engineering', institution: 'Caringin, Bogor Regency, Indonesia', date: '2020 — 2023', desc: 'Built a foundation in HTML, CSS, JS, MySQL, Pascal, and PHP, working with CodeIgniter. Delivered a team project and a solo project, both graded well.' },
  { title: 'Data Analytics Bootcamp', institution: 'RevoU', date: 'JUN 2022', desc: 'Completed bootcamp in advanced topics such as Big Data Value, Predictive Analytics, Perspective Analytics, Data Analytics Cycle and got the certificate.' },
];

const skillGroups: Array<{ category: string; skills: string[] }> = [
  { category: 'Frontend', skills: ['React', 'Vue.js', 'JavaScript', 'HTML5', 'CSS3', 'Tailwind CSS'] },
  { category: 'Backend', skills: ['Node.js', 'Express.js', 'PHP', 'Laravel', 'Go', 'Gin'] },
  { category: 'Database', skills: ['MySQL', 'PostgreSQL', 'MongoDB', 'Redis'] },
  { category: 'DevOps', skills: ['Docker', 'Jenkins', 'Nginx', 'WireGuard', 'Git'] },
];

const notes = [
  { title: 'To Grieve Deeply Is to Have Loved Fully', tag: 'REFLECTION', text: 'The culmination of love is grief, and yet we love, despite the inevitable', published_at: '2026-08-27T10:00:00Z' },
  { title: 'In Pursuit of Great We Failed to Do Good', tag: 'REFLECTION', text: 'The pursuit of greatness often leads us astray from what is truly important.', published_at: '2026-08-20T10:00:00Z' },
  { title: "Don't cry. You're perfect.", tag: 'REFLECTION', text: 'You are enough just as you are.', published_at: '2026-08-13T10:00:00Z' },
];

async function main(): Promise<void> {
  console.log('[seed] checking existing data…');
  const existing = await sql`select id from site_settings limit 1`;
  if (existing.length > 0) {
    console.log('[seed] data already exists — skipping.');
    process.exit(0);
  }

  console.log('[seed] seeding default content…');

  await sql`
    insert into site_settings (site_name, footer_name, footer_label, hero_tagline)
    values ('ravedeprinz', 'ravedepr1nz', 'PERSONAL ARCHIVE', 'I DON''T GUESS. I DEBUG.')
  `;

  await sql`
    insert into home_content (
      archive_label, archive_number, headline_line_one, headline_line_two,
      headline_line_three, headline_accent, headline_period, headline_meta,
      intro, cta_label, cta_url, hud_label, hud_subtitle, years_building,
      hud_noise_top, hud_noise_bottom
    ) values (
      'PERSONAL ARCHIVE', '001', 'I DON''T', 'GUESS.', 'I DEBUG.', 'GUESS.', '.',
      'BACKEND / SYSTEMS / GO',
      'I’m Rakhis de Yudha. I study computer science at Binus Online Learning and spend most of my building time around Go, PostgreSQL, React, Docker, and the questions underneath a product’s interface.',
      'ENTER THE ARCHIVE', '/projects', 'YEARS BUILDING', 'BACKEND / SYSTEMS / GO', 4,
      '// SYSTEM_04', 'BUILD / REPEAT / SHIP'
    )
  `;

  const nav = [
    ['about', 'About', 'The person behind the systems.', '02', '/about'],
    ['work', 'Work', 'Roles, teams, and shipped software.', '03', '/work'],
    ['projects', 'Projects', 'Things built while learning.', '04', '/projects'],
    ['notes', 'Notes', 'Short thoughts from the workbench.', '05', '/notes'],
    ['now', 'Now', 'What currently has my attention.', '06', '/now'],
  ] as const;
  for (const [i, [page_key, label, description, display_number, href]] of nav.entries()) {
    await sql`
      insert into home_navigation (page_key, label, description, display_number, href, sort_order, visible)
      values (${page_key}, ${label}, ${description}, ${display_number}, ${href}, ${i + 1}, true)
    `;
  }

  await sql`
    insert into about_content (eyebrow, quote, quote_accent, paragraph_one, paragraph_two)
    values (
      'IDENTITY / 002',
      'I like work that is',
      'clear, useful,',
      'I’m a computer science student from Bogor, Indonesia. My strongest area is backend development, but I enjoy following a problem all the way through to the interface people actually touch.',
      'I’m interested in systems that feel calm under pressure, small tools that remove friction, and the difference between software that technically works and software someone can trust.'
    )
  `;

  let skillOrder = 0;
  for (const group of skillGroups) {
    for (const skill of group.skills) {
      skillOrder += 1;
      await sql`
        insert into skills (category, skill_name, sort_order, visible)
        values (${group.category}, ${skill}, ${skillOrder}, true)
      `;
    }
  }

  for (const [i, w] of work.entries()) {
    await sql`
      insert into work_entries (role, company, location, date_label, description, stack, company_url, sort_order, visible)
      values (${w.role}, ${w.company}, ${w.location}, ${w.date}, ${w.desc}, ${w.stack}, ${w.url}, ${i + 1}, true)
    `;
  }

  for (const [i, e] of education.entries()) {
    await sql`
      insert into education_entries (title, institution, date_label, description, sort_order, visible)
      values (${e.title}, ${e.institution}, ${e.date}, ${e.desc}, ${i + 1}, true)
    `;
  }

  for (const [i, p] of projects.entries()) {
    await sql`
      insert into projects (slug, title, description, year, status, deployment_status, stack, live_url, source_url, sort_order, visible, published)
      values (
        ${slugify(p.title)}, ${p.title}, ${p.desc}, ${p.year},
        ${p.type}, ${p.title === 'Web Auction' ? 'NOT_DEPLOYED' : 'DEPLOYED'},
        ${p.stack}, ${p.link}, ${p.github}, ${i + 1}, true, true
      )
    `;
  }

  for (const n of notes) {
    await sql`
      insert into notes (slug, title, body, tag, author, published, published_at)
      values (${slugify(n.title)}, ${n.title}, ${n.text}, ${n.tag}, 'Rakhis', true, ${n.published_at})
    `;
  }

  await sql`
    insert into now_current (updated_label, label, title, description, visible)
    values (
      '27 AUG 2026', 'CURRENTLY BUILDING', 'A CRM.',
      'I''m working on the backend side of a CRM at Radius Data Solusi. Most of my attention is currently going into Go, Gin, APIs, authentication, database structure, and keeping the system understandable as it grows.',
      true
    )
  `;

  const attention = [
    ['01', 'LEARNING', 'gRPC', "Trying to understand the trade-offs instead of treating it as just 'REST, but faster.'"],
    ['02', 'READING', 'Designing Data-Intensive Applications', 'Slowly. Usually with more tabs open than necessary.'],
    ['03', 'THINKING ABOUT', 'How much complexity can a good name remove?', 'Naming things is still harder than it should be.'],
  ] as const;
  for (const [i, [number, label, title, note]] of attention.entries()) {
    await sql`
      insert into now_attention (number, label, title, note, sort_order, visible)
      values (${number}, ${label}, ${title}, ${note}, ${i + 1}, true)
    `;
  }

  const history = [
    ['27 AUG', 'Working on the backend side of a CRM.', '2026-08-27T10:00:00Z'],
    ['22 AUG', 'Refactored an API surface that had outgrown its first assumptions.', '2026-08-22T10:00:00Z'],
    ['18 AUG', 'Started learning more seriously about gRPC.', '2026-08-18T10:00:00Z'],
  ] as const;
  for (const [date_label, text, created_at] of history) {
    await sql`
      insert into now_history (date_label, text, source_type, created_at)
      values (${date_label}, ${text}, 'UPDATE', ${created_at})
    `;
  }

  console.log('[seed] done.');
  process.exit(0);
}

main().catch((error) => {
  console.error('[seed] failed', error);
  process.exit(1);
});
