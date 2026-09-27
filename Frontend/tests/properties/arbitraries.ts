// Shared fast-check generators for the portfolio-engagement properties.
// The generators bias towards the awkward cases the requirements call out
// explicitly: whitespace/empty slugs, duplicate sort orders, mixed
// published/visible flags, null and unparseable dates, differently-cased
// provider names, and non-https script URLs.

import fc from 'fast-check';
import type { Note, NowAttention, NowCurrent, NowHistory, Project, SiteSettings } from '../../src/lib/cms';

// A project whose `slug` may also be null, so slug-resolution properties can
// cover the "absent slug" branch. Cast to Project[] where a full list is
// needed; the pure helpers only read the fields they declare.
export type ArbProject = Omit<Project, 'slug'> & { slug: string | null };

const STATUSES = ['FINISHED', 'IN PROGRESS', 'SHELVED'] as const;
const DEPLOYMENTS = ['DEPLOYED', 'NOT_DEPLOYED'] as const;

const nullable = <T>(arb: fc.Arbitrary<T>) => fc.option(arb, { nil: null });

// Slugs that are null, empty, whitespace-only, padded, or plain.
const SLUGS = fc.oneof(
  fc.constant(null),
  fc.constant(''),
  fc.constant('   '),
  fc.string({ minLength: 1, maxLength: 10 }).map((s) => `  ${s}  `),
  fc.string({ minLength: 1, maxLength: 10 }),
  fc.constantFrom('simple-portfolio', 'online-marketplace', 'pakis-hills'),
);

const OPTIONAL_URLS = fc.oneof(
  fc.constant(null),
  fc.constant(''),
  fc.constant('   '),
  fc.constantFrom('/uploads/a.png', 'https://example.test/a.png'),
);

export const arbProject: fc.Arbitrary<ArbProject> = fc.record({
  title: fc.string({ minLength: 1, maxLength: 30 }),
  slug: SLUGS,
  description: fc.oneof(fc.constant(''), fc.string({ maxLength: 400 })),
  year: fc.integer({ min: 1990, max: 2035 }),
  status: fc.constantFrom(...STATUSES),
  deployment_status: fc.constantFrom(...DEPLOYMENTS),
  stack: fc.oneof(fc.constant(''), fc.string({ maxLength: 60 })),
  live_url: OPTIONAL_URLS,
  source_url: OPTIONAL_URLS,
  image_url: OPTIONAL_URLS,
  featured: fc.boolean(),
  published: fc.boolean(),
  visible: fc.boolean(),
  // A tiny range so ties on sort_order are common, not rare.
  sort_order: fc.integer({ min: 0, max: 3 }),
  problem: fc.string({ maxLength: 200 }),
  what_built: fc.string({ maxLength: 200 }),
  key_decision: fc.string({ maxLength: 200 }),
  outcome: fc.string({ maxLength: 200 }),
  updated_at: fc.oneof(
    fc.constant(null),
    fc.constant('not-a-date'),
    fc.integer({ min: 0, max: 1_700_000_000 }).map((s) => new Date(s * 1000).toISOString()),
  ),
});

const DATES = fc.oneof(
  fc.constant(null),
  fc.constant(''),
  fc.constant('not-a-date'),
  fc.constant('2026-01-02T03:04:05.000Z'),
  fc.integer({ min: 0, max: 1_800_000_000 }).map((s) => new Date(s * 1000).toISOString()),
);

export const arbNote: fc.Arbitrary<Note> = fc.record({
  // Note.id is optional and never null, so the absent case is `undefined`.
  id: fc.option(fc.uuid(), { nil: undefined }),
  title: fc.string({ minLength: 1, maxLength: 40 }),
  slug: fc.oneof(fc.constant(''), fc.string({ minLength: 1, maxLength: 24 })),
  body: fc.oneof(fc.constant(''), fc.string({ maxLength: 400 })),
  tag: fc.constantFrom('REFLECTION', 'NOTE', 'LOG'),
  author: nullable(fc.string({ maxLength: 20 })),
  subtitle: nullable(fc.string({ maxLength: 40 })),
  image_url: OPTIONAL_URLS,
  published: fc.boolean(),
  published_at: DATES,
  created_at: DATES,
  updated_at: DATES,
}) as fc.Arbitrary<Note>;

const AVAILABILITY_VALUES = ['OPEN_TO_WORK', 'OPEN_TO_FREELANCE', 'NOT_AVAILABLE'] as const;

export const arbAvailabilityStatus = fc.oneof(
  ...AVAILABILITY_VALUES.map((v) => fc.constant(v)),
  // Wrong case, unknown values, and near-misses.
  fc.constantFrom('open_to_work', 'Plausible', '', '   ', 'OPEN TO WORK', 'UNKNOWN'),
);

export const arbSiteSettings: fc.Arbitrary<SiteSettings> = fc.record({
  site_name: fc.constant('ravedeprinz'),
  footer_name: fc.constant('ravedepr1nz'),
  footer_label: fc.constant('PERSONAL ARCHIVE'),
  hero_tagline: fc.string({ maxLength: 20 }),
  contact_email: fc.oneof(
    fc.constant(null),
    fc.constant(''),
    fc.constant('   '),
    fc.constant('hello@ravedeprinz.me'),
    fc.string({ maxLength: 30 }),
  ),
  cv_url: fc.oneof(
    fc.constant(null),
    fc.constant(''),
    fc.constant('  '),
    fc.constant('/uploads/cv.pdf'),
    fc.string({ maxLength: 20 }),
  ),
  availability_status: arbAvailabilityStatus,
  availability_note: fc.oneof(
    fc.constant(null),
    fc.constant(''),
    fc.constant('   '),
    fc.string({ maxLength: 140 }),
  ),
});

export const arbNowCurrent: fc.Arbitrary<NowCurrent> = fc.record({
  updated_label: fc.oneof(fc.constant(''), fc.string({ maxLength: 16 })),
  label: fc.oneof(fc.constant(''), fc.constant('   '), fc.string({ minLength: 1, maxLength: 24 })),
  title: fc.oneof(fc.constant(''), fc.constant('   '), fc.string({ minLength: 1, maxLength: 40 })),
  // Deliberately distinct from label/title so a leaked description is visible.
  description: fc.string({ minLength: 1, maxLength: 80 }).map((s) => `DESCRIPTION-${s}`),
});

export type ArbNowPayload = {
  current: NowCurrent | null;
  attention: NowAttention[];
  history: NowHistory[];
};

export const arbNowPayload: fc.Arbitrary<ArbNowPayload> = fc.record({
  current: fc.oneof(fc.constant(null), arbNowCurrent),
  attention: fc.array(
    fc.record({
      number: fc.string({ maxLength: 4 }),
      label: fc.string({ maxLength: 12 }),
      title: fc.string({ maxLength: 20 }),
      note: fc.string({ maxLength: 40 }),
    }),
    { maxLength: 3 },
  ),
  history: fc.array(
    fc.record({ date_label: fc.string({ maxLength: 8 }), text: fc.string({ maxLength: 30 }) }),
    { maxLength: 3 },
  ),
});

// Analytics env values: unset, blank, whitespace, valid names in the right
// and wrong case, and http/relative/garbage script URLs.
const PROVIDER_VALUES = [
  'plausible',
  'umami',
  'goatcounter',
  'Plausible',
  'UMAMI',
  'GoatCounter',
  'plausible ',
  'matomo',
  '',
  '   ',
] as const;

const SCRIPT_URL_VALUES = [
  'https://plausible.example/js/script.js',
  'https://plausible.example/js/script.manual.js',
  'http://plausible.example/js/script.js',
  '//plausible.example/js/script.js',
  '/js/script.js',
  'not a url',
  'https://',
  '',
  '   ',
] as const;

const SITE_ID_VALUES = [
  'ravedeprinz.me',
  'my-site',
  'https://stats.example/count',
  ' spaced-id ',
  '',
  '   ',
] as const;

export const arbEnvValue = fc.oneof(
  fc.constant(undefined),
  fc.constantFrom(...PROVIDER_VALUES),
  fc.constantFrom(...SCRIPT_URL_VALUES),
  fc.constantFrom(...SITE_ID_VALUES),
  fc.string({ maxLength: 16 }),
);

export type ArbAnalyticsEnv = {
  PUBLIC_ANALYTICS_PROVIDER?: string;
  PUBLIC_ANALYTICS_SCRIPT_URL?: string;
  PUBLIC_ANALYTICS_SITE_ID?: string;
};

export const arbAnalyticsEnv: fc.Arbitrary<ArbAnalyticsEnv> = fc.record({
  PUBLIC_ANALYTICS_PROVIDER: arbEnvValue,
  PUBLIC_ANALYTICS_SCRIPT_URL: arbEnvValue,
  PUBLIC_ANALYTICS_SITE_ID: arbEnvValue,
});

const PUBLIC_PATHS = ['/', '/about', '/work', '/projects', '/notes/example', '/now', '/projects/online-marketplace'];
const EXCLUDED_PATHS = ['/login', '/admin', '/admin/projects', '/admin/settings'];
const SUFFIXES = ['', '?ref=x', '#intro', '?ref=x#intro', '?a=1&b=2'];

const HREF_PATHS = fc.oneof(...PUBLIC_PATHS.map((p) => fc.constant(p)), ...EXCLUDED_PATHS.map((p) => fc.constant(p)));
const HREF_SUFFIX = fc.constantFrom(...SUFFIXES);

/** A single href on the production origin. */
export const arbHref: fc.Arbitrary<string> = HREF_PATHS.chain((path) =>
  HREF_SUFFIX.map((suffix) => `https://ravedeprinz.me${path}${suffix}`),
);

/** A navigation sequence: mixes public/excluded paths and repeats. */
export const arbHrefSequence: fc.Arbitrary<string[]> = fc.array(arbHref, { minLength: 1, maxLength: 10 });
