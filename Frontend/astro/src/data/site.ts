// Phase 1: static fallback content, ported 1:1 from the Next.js lib/cms.ts
// fallbacks. Phase 2 replaces these call sites with Bun API fetches.

export const siteSettings = {
  site_name: 'ravedeprinz',
  footer_name: 'ravedepr1nz',
  footer_label: 'PERSONAL ARCHIVE',
  hero_tagline: "I DON'T GUESS. I DEBUG.",
};

export const homeContent = {
  archive_label: 'PERSONAL ARCHIVE',
  archive_number: '001',
  headline_line_one: "I DON'T",
  headline_line_two: 'GUESS.',
  headline_line_three: 'I DEBUG.',
  headline_accent: 'GUESS.',
  headline_period: '.',
  headline_meta: 'BACKEND / SYSTEMS / GO',
  intro:
    'I’m Rakhis de Yudha. I study computer science at Binus Online Learning and spend most of my building time around Go, PostgreSQL, React, Docker, and the questions underneath a product’s interface.',
  cta_label: 'ENTER THE ARCHIVE',
  cta_url: '/projects',
  hud_label: 'YEARS BUILDING',
  hud_subtitle: 'BACKEND / SYSTEMS / GO',
  years_building: 4,
  hud_noise_top: '// SYSTEM_04',
  hud_noise_bottom: 'BUILD / REPEAT / SHIP',
};

export const navigation = [
  { page_key: 'about', label: 'About', description: 'The person behind the systems.', display_number: '02', href: '/about' },
  { page_key: 'work', label: 'Work', description: 'Roles, teams, and shipped software.', display_number: '03', href: '/work' },
  { page_key: 'projects', label: 'Projects', description: 'Things built while learning.', display_number: '04', href: '/projects' },
  { page_key: 'notes', label: 'Notes', description: 'Short thoughts from the workbench.', display_number: '05', href: '/notes' },
  { page_key: 'now', label: 'Now', description: 'What currently has my attention.', display_number: '06', href: '/now' },
];

export const aboutContent = {
  eyebrow: 'IDENTITY / 002',
  quote: 'I like work that is',
  quote_accent: 'clear, useful,',
  paragraph_one:
    'I’m a computer science student from Bogor, Indonesia. My strongest area is backend development, but I enjoy following a problem all the way through to the interface people actually touch.',
  paragraph_two:
    'I’m interested in systems that feel calm under pressure, small tools that remove friction, and the difference between software that technically works and software someone can trust.',
};

export const nowContent = {
  current: {
    updated_label: '27 AUG 2026',
    label: 'CURRENTLY BUILDING',
    title: 'A CRM.',
    description:
      "I'm working on the backend side of a CRM at Radius Data Solusi. Most of my attention is currently going into Go, Gin, APIs, authentication, database structure, and keeping the system understandable as it grows.",
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

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const projectImages: Record<string, string> = {
  'simple-portfolio': '/img/Projects/portfolio.png',
  'pakis-hills': '/img/Projects/pakis.png',
  'outbound-design': '/img/Projects/outbound.png',
  'web-auction': '/img/Projects/auction.png',
  'currency-converter': '/img/Projects/convert.png',
  'quiz-app': '/img/Projects/quiz-portrait.png',
  'online-wedding-invitation': '/img/Projects/wedding.png',
  'online-marketplace': '/img/Projects/market.png',
};

export const portraitImage = '/img/Profile/ini.jpeg';
