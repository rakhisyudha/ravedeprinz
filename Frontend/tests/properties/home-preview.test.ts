import { describe, expect, test, vi } from 'vitest';
import fc from 'fast-check';
import { buildHomePreview } from '../../src/lib/homePreview';
import { AVAILABILITY_LABELS } from '../../src/lib/availability';
import { nowContent } from '../../src/data/site';
import type { Note, Project, SiteSettings } from '../../src/lib/cms';
import { arbNowPayload, arbNote, arbProject, arbSiteSettings } from './arbitraries';

// Feature: portfolio-engagement, Property 6: Home preview blocks are independent

/** A value whose every property read throws, standing in for a builder that blows up. */
const throwing = <T>(): T =>
  new Proxy({} as object, {
    get(_target, property) {
      throw new Error(`builder exploded reading ${String(property)}`);
    },
  }) as T;

type LiveInput = Parameters<typeof buildHomePreview>[0];
type Mode = 'live' | 'null' | 'throwing';

const asProject = arbProject as fc.Arbitrary<Project>;
const asNote = arbNote as fc.Arbitrary<Note>;

// A list that is guaranteed to hold at least one project/note a visitor can
// see, so "built from live data" and "omitted" are genuinely different cases.
const arbPublicProjects = fc
  .array(asProject, { minLength: 1, maxLength: 6 })
  .map((list) => list.map((p) => ({ ...p, published: true, visible: true })));
const arbPublishedNotes = fc
  .array(asNote, { minLength: 1, maxLength: 6 })
  .map((list) => list.map((n) => ({ ...n, published: true })));

const arbMode = fc.constantFrom<Mode>('live', 'null', 'throwing');

function pick<T>(mode: Mode, live: T): T {
  if (mode === 'live') return live;
  if (mode === 'null') return null as T;
  return throwing<T>();
}

const arbLive = fc
  .record({
    projects: fc.tuple(arbMode, arbPublicProjects),
    notes: fc.tuple(arbMode, arbPublishedNotes),
    now: fc.tuple(arbMode, arbNowPayload),
    site: fc.tuple(arbMode, arbSiteSettings),
  })
  .map(
    ({ projects, notes, now, site }): LiveInput => ({
      projects: pick(projects[0], projects[1]) as Project[] | null,
      notes: pick(notes[0], notes[1]) as Note[] | null,
      now: pick(now[0], now[1]) as LiveInput['now'],
      site: pick(site[0], site[1]) as SiteSettings | null,
    }),
  );

/** Runs a property with console.error silenced: the caught failures are expected. */
async function quietly(run: () => void | Promise<void>): Promise<void> {
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    await run();
  } finally {
    errors.mockRestore();
  }
}

describe('Property 6: home preview blocks are independent', () => {
  test('buildHomePreview never throws, whatever the live inputs are', async () => {
    await quietly(() =>
      fc.assert(
        fc.property(arbLive, (live) => {
          expect(() => buildHomePreview(live)).not.toThrow();
        }),
        { numRuns: 400 },
      ),
    );
  });

  test('a live list builds its block, and null builds the same block from fallback', async () => {
    await quietly(() =>
      fc.assert(
        fc.property(arbPublicProjects, arbPublishedNotes, (projects, notes) => {
          const fromLive = buildHomePreview({ projects, notes, now: null, site: null });
          const fromFallback = buildHomePreview({ projects: null, notes: null, now: null, site: null });

          expect(fromLive.featured).not.toBeNull();
          expect(fromFallback.featured).not.toBeNull();
          expect(fromLive.notes).not.toBeNull();
          expect(fromFallback.notes).not.toBeNull();
        }),
        { numRuns: 300 },
      ),
    );
  });

  test('the featured entries come from the live list, not the fallback', async () => {
    await quietly(() =>
      fc.assert(
        fc.property(arbPublicProjects, (projects) => {
          const preview = buildHomePreview({ projects, notes: null, now: null, site: null });
          const titles = preview.featured!.map((entry) => entry.title);
          expect(titles.length).toBeGreaterThan(0);
          // Every live title that made the cut is present; nothing from the
          // fallback list leaks in.
          for (const title of titles) {
            expect(projects.some((p) => p.title === title)).toBe(true);
          }
        }),
        { numRuns: 300 },
      ),
    );
  });

  test('a list with nothing public omits its strip', async () => {
    await quietly(() =>
      fc.assert(
        fc.property(
          fc.array(asProject),
          fc.array(asNote),
          (projects, notes) => {
            const preview = buildHomePreview({ projects, notes, now: null, site: null });
            // Omission is about what a visitor can see, not about raw length:
            // a list of hidden rows must not render an empty strip.
            const publicProjects = projects.filter((p) => p.published !== false && p.visible !== false);
            const publishedNotes = notes.filter((n) => n.published !== false);
            expect(preview.featured === null).toBe(publicProjects.length === 0);
            expect(preview.notes === null).toBe(publishedNotes.length === 0);
          },
        ),
        { numRuns: 300 },
      ),
    );
  });

  test('a throwing builder costs only its own block', async () => {
    await quietly(() =>
      fc.assert(
        fc.property(arbMode, asProject, asNote, (mode, project, note) => {
          const preview = buildHomePreview({
            projects: pick(mode, [{ ...project, published: true, visible: true }]) as Project[] | null,
            notes: [{ ...note, published: true }],
            now: null,
            site: null,
          });
          // Now and contact never read the projects payload, so the featured
          // failure cannot reach them.
          expect(preview.now.label).toBe(nowContent.current.label);
          expect(preview.contact.statusLabel).toBe(AVAILABILITY_LABELS.OPEN_TO_WORK);
          expect(preview.featured === null).toBe(mode === 'throwing');
        }),
        { numRuns: 300 },
      ),
    );
  });

  test('a throwing notes builder costs only the notes strip', async () => {
    await quietly(() =>
      fc.assert(
        fc.property(arbMode, arbPublicProjects, (mode, projects) => {
          const preview = buildHomePreview({
            projects,
            notes: pick(mode, [{ ...({} as Note), title: 'n' }]) as Note[] | null,
            now: null,
            site: null,
          });
          expect(preview.featured).not.toBeNull();
          expect(preview.notes === null).toBe(mode === 'throwing');
        }),
        { numRuns: 300 },
      ),
    );
  });

  test('a throwing site settings builder falls back for contact and now', async () => {
    await quietly(() =>
      fc.assert(
        fc.property(arbMode, arbSiteSettings, (mode, site) => {
          const preview = buildHomePreview({
            projects: null,
            notes: null,
            now: null,
            site: pick(mode, site) as SiteSettings | null,
          });
          expect(preview.now.title).toBe(nowContent.current.title);
          if (mode === 'live') {
            // A live settings object is authoritative, blanks included.
            expect(preview.contact.email).toBe(site.contact_email?.trim() || null);
          } else {
            expect(preview.contact.statusLabel).toBe(AVAILABILITY_LABELS.OPEN_TO_WORK);
            expect(preview.contact.email).toBe('hello@ravedeprinz.me');
          }
        }),
        { numRuns: 300 },
      ),
    );
  });

  test('a throwing now payload falls back for the status line only', async () => {
    await quietly(() =>
      fc.assert(
        fc.property(arbMode, arbPublicProjects, (mode, projects) => {
          const preview = buildHomePreview({
            projects,
            notes: null,
            now: pick(mode, { current: { ...nowContent.current } }) as LiveInput['now'],
            site: null,
          });
          expect(preview.featured).not.toBeNull();
          expect(preview.contact.email).toBe('hello@ravedeprinz.me');
          expect(preview.now.title).toBe(nowContent.current.title);
        }),
        { numRuns: 300 },
      ),
    );
  });

  test('when every input is null, all four blocks are present and fallback-backed', async () => {
    await quietly(() => {
      const preview = buildHomePreview({ projects: null, notes: null, now: null, site: null });
      expect(preview.featured).toHaveLength(3);
      expect(preview.notes).toHaveLength(3);
      expect(preview.now.label).toBe(nowContent.current.label);
      expect(preview.contact.email).toBe('hello@ravedeprinz.me');
      expect(preview.contact.statusLabel).toBe(AVAILABILITY_LABELS.OPEN_TO_WORK);
    });
  });
});

describe('loadHomePreview returns the view model itself', () => {
  // Regression: loadHomePreview used to resolve to `{ live, preview }` while
  // index.astro read the four blocks off the result directly, so every block
  // arrived undefined and the now line threw on `status.ariaLabel`. The
  // blocks must therefore be present on the resolved value itself.
  async function withStubbedCms(handler: () => Promise<Response>, run: () => Promise<void>) {
    vi.stubGlobal('fetch', vi.fn(handler));
    vi.resetModules();
    try {
      await run();
    } finally {
      vi.unstubAllGlobals();
      vi.resetModules();
    }
  }

  const locals = () => ({ cmsCache: new Map<string, Promise<unknown>>() }) as unknown as App.Locals;

  test('the four blocks are defined on the resolved value', async () => {
    const payload = {
      projects: { projects: [] },
      notes: { notes: [] },
      now: { current: null, attention: [], history: [] },
      site: {
        site_name: 'ravedeprinz',
        footer_name: 'ravedepr1nz',
        footer_label: 'PERSONAL ARCHIVE',
        hero_tagline: '',
      },
    };
    await withStubbedCms(
      async () => new Response(JSON.stringify(payload), { status: 200 }),
      async () => {
        const { loadHomePreview } = await import('../../src/lib/homePreview');
        const preview = await loadHomePreview(locals());
        expect(preview).toBeTypeOf('object');
        expect(preview).not.toHaveProperty('live');
        expect(preview).not.toHaveProperty('preview');
        // now and contact are always present; the strips may be omitted.
        expect(preview.now).toBeDefined();
        expect(preview.now.ariaLabel).toContain(nowContent.current.title);
        expect(preview.contact).toBeDefined();
        expect(preview.contact.statusLabel).toBe(AVAILABILITY_LABELS.OPEN_TO_WORK);
        expect('featured' in preview).toBe(true);
        expect('notes' in preview).toBe(true);
      },
    );
  });

  test('an unreachable CMS still resolves a complete fallback-backed preview', async () => {
    await withStubbedCms(
      async () => {
        throw new Error('CMS unreachable');
      },
      async () => {
        const { loadHomePreview } = await import('../../src/lib/homePreview');
        const preview = await loadHomePreview(locals());
        expect(preview.featured).toHaveLength(3);
        expect(preview.notes).toHaveLength(3);
        expect(preview.now.title).toBe(nowContent.current.title);
        expect(preview.contact.email).toBe('hello@ravedeprinz.me');
      },
    );
  });

  test('all five fetches start before any is awaited', async () => {
    let inFlight = 0;
    let peak = 0;
    await withStubbedCms(
      async () => {
        inFlight += 1;
        peak = Math.max(peak, inFlight);
        await new Promise((resolve) => setTimeout(resolve, 5));
        inFlight -= 1;
        return new Response(JSON.stringify({ projects: [], notes: [] }), { status: 200 });
      },
      async () => {
        const { loadHomePreview } = await import('../../src/lib/homePreview');
        await loadHomePreview(locals());
        // Concurrent, not sequential: more than one request in flight at once.
        expect(peak).toBeGreaterThan(1);
      },
    );
  });
});
