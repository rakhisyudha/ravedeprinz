import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildHomePreview } from '../../src/lib/homePreview';
import { nowContent } from '../../src/data/site';

// Page-level checks for the home page.
//
// The decision logic (which blocks render, with what data) is covered by the
// view-model properties, so what is asserted here is the markup wiring:
// link counts, element order, the shared row template, and the attributes the
// requirements name. These are deterministic source invariants rather than a
// full container render, which this runner does not compile.
const read = (relative: string) =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), 'utf8').replace(/\r\n/g, '\n');

const indexAstro = read('../../src/pages/index.astro');
const projectsAstro = read('../../src/pages/projects.astro');
const rowAstro = read('../../src/components/home/HomeRow.astro');
const featuredAstro = read('../../src/components/home/FeaturedProjects.astro');
const notesAstro = read('../../src/components/home/LatestNotes.astro');
const nowAstro = read('../../src/components/home/NowStatusLine.astro');
const contactAstro = read('../../src/components/home/ContactBlock.astro');
const css = read('../../src/styles/global.css');

const markup = (source: string) => source.slice(source.lastIndexOf('---') + 3);

describe('projects list', () => {
  test('every project title is a link to its case study', () => {
    expect(projectsAstro).toContain('<h2><a href={href}>');
    expect(projectsAstro).toContain('projectHref(project)');
  });

  test('Live and Source links open in a new tab and are omitted when empty', () => {
    expect(projectsAstro).toContain(
      '{project.live_url && <a href={project.live_url} target="_blank" rel="noreferrer">Live ↗</a>}',
    );
    expect(projectsAstro).toContain(
      '{project.source_url && <a href={project.source_url} target="_blank" rel="noreferrer">Source ↗</a>}',
    );
  });

  test('both live and fallback data go through the shared normalization', () => {
    expect(projectsAstro).toContain("import { fallbackProjectList } from '../lib/fallback'");
    expect(projectsAstro).toContain('liveProjects?.projects ?? fallbackProjectList()');
  });
});

describe('home preview composition', () => {
  test('the preview renders after the archive index, and the headline markup is untouched', () => {
    const body = markup(indexAstro);
    const archiveIndex = body.indexOf('<nav class="home-rule"');
    const featured = body.indexOf('<FeaturedProjects');
    expect(archiveIndex).toBeGreaterThan(-1);
    expect(featured).toBeGreaterThan(archiveIndex);

    expect(body.indexOf('<h1 class="display">')).toBeLessThan(archiveIndex);
    expect(body.indexOf('class="headline-meta"')).toBeLessThan(archiveIndex);
    // The archive records belong to the archive index, and the preview blocks
    // come after all of it.
    expect(body.indexOf('home-records')).toBeGreaterThan(archiveIndex);
    expect(featured).toBeGreaterThan(body.indexOf('home-records'));
  });

  test('all four preview blocks are rendered, each guarded on its own data', () => {
    expect(indexAstro).toContain('{preview.featured && <FeaturedProjects entries={preview.featured} />}');
    expect(indexAstro).toContain('{preview.notes && <LatestNotes entries={preview.notes} />}');
    expect(indexAstro).toContain('<NowStatusLine status={preview.now} />');
    expect(indexAstro).toContain('<ContactBlock contact={preview.contact} />');
  });

  test('the home fetches go through the request cache', () => {
    expect(indexAstro).toContain('loadHomePreview(Astro.locals)');
    expect(indexAstro).toContain("cached(Astro.locals, 'home', fetchHome)");
  });
});

describe('archive index', () => {
  test('only the ABOUT and WORK rows are rendered', () => {
    // Rows are filtered, not hardcoded: the page keeps the CMS payload and
    // selects from it by page_key.
    expect(indexAstro).toContain("const ARCHIVE_INDEX_KEYS = new Set(['about', 'work'])");
    expect(indexAstro).toContain('archiveIndex.map((item, index) => (');
    expect(indexAstro).toContain(
      'const archiveIndex = navigation.filter((item) => ARCHIVE_INDEX_KEYS.has(item.page_key));',
    );
    expect(indexAstro).not.toContain('{navigation.map((item, index) => (');
  });

  test('the filter keeps CMS fields rather than restating them', () => {
    for (const field of ['item.href', 'item.display_number', 'item.label', 'item.description']) {
      expect(indexAstro).toContain(field);
    }
  });

  test('the archive rows carry the shared hover treatment', () => {
    expect(indexAstro).toContain('class={`home-record row-hover home-record-${index}`}');
    expect(indexAstro).toContain('class="home-record-arrow row-arrow"');
  });
});

describe('shared row-hover treatment', () => {
  test('it is defined once in global.css', () => {
    expect(css).toContain('.row-hover { position:relative;');
    expect(css).toContain('.row-hover:hover::before,.row-hover:focus-visible::before { transform:scaleY(1); }');
    expect(css).toContain('transform:translateX(10px) skewX(-3deg)');
    expect(css).toContain('box-shadow:10px 8px 0 var(--dark-red)');
    expect(css).toContain('.row-hover:hover .row-arrow,.row-hover:focus-visible .row-arrow');
  });

  test('the archive rows no longer carry their own duplicate hover rules', () => {
    expect(css).not.toContain('.home-record:hover,');
    expect(css).not.toContain('.home-record::before {');
    expect(css).not.toContain('.home-record:hover .home-record-arrow');
  });

  test('every full-width home row is built by the one shared template', () => {
    for (const source of [featuredAstro, notesAstro, nowAstro]) {
      expect(source).toContain("import HomeRow from './HomeRow.astro'");
    }
    expect(rowAstro).toContain("class:list={['home-row', 'row-hover', { 'home-row--no-media': !showMedia }]}");
  });

  test('the components no longer duplicate the row styles or the hover rules', () => {
    for (const source of [featuredAstro, notesAstro, nowAstro]) {
      expect(source).not.toContain(':hover {');
      expect(source).not.toContain('.preview-entry');
      expect(source).not.toContain('.row-media');
      expect(source).not.toContain('.row-date');
    }
  });

  test('compact bracket links use the accent-only variant', () => {
    expect(css).toContain('.row-hover--accent {');
    expect(featuredAstro).toContain('class="preview-all bracket-btn row-hover--accent"');
    expect(notesAstro).toContain('class="preview-all bracket-btn row-hover--accent"');
    expect(css).toMatch(/\.row-hover--accent:hover,\.row-hover--accent:focus-visible \{[^}]*border-color:var\(--red\)/);
  });
});

describe('shared row template', () => {
  test('the column order is media, date, copy, arrow', () => {
    // The date column is the alignment anchor: fixed width, so every row's
    // text starts at the same x across both lists.
    expect(rowAstro).toContain(
    'grid-template-columns:112px auto minmax(0,1fr) 34px;',
    // Never a fixed px track that the date text could outgrow.
  );
    const media = rowAstro.indexOf('class:list={[\'row-media\'');
    const date = rowAstro.indexOf('class="row-date"');
    const copy = rowAstro.indexOf('class="row-copy"');
    const arrow = rowAstro.indexOf('class="row-arrow"');
    expect(media).toBeLessThan(date);
    expect(date).toBeLessThan(copy);
    expect(copy).toBeLessThan(arrow);
  });

  test('the whole row is one link, with no nested link inside it', () => {
    const body = markup(rowAstro);
    // Exactly one anchor opens the row, and it wraps everything.
    expect(body.match(/<a[\s]/g)?.length).toBe(1);
    expect(body).toContain('href={href}');
    expect(body).toContain("'home-row', 'row-hover'");
    // The title and description are plain text, never their own anchor.
    expect(body).toContain('{title}</b>');
    expect(body).toContain("'line-clamp-1': clamp");
    expect(body).not.toMatch(/<b[^>]*>\s*<a/);
  });

  test('the date track can never be narrower than the date text', () => {
    // Regression: a fixed 86px track plus `white-space: nowrap` let
    // "27 AUG 2026" spill straight over the title. The track is now `auto`, so
    // it always fits its content, and the date's min-width is what keeps the
    // short dates aligned to the same x as the long ones.
    expect(rowAstro).toContain('grid-template-columns:112px auto minmax(0,1fr) 34px;');
    expect(rowAstro).not.toContain('grid-template-columns:112px 86px');
    expect(rowAstro).toMatch(/\.row-date \{[^}]*min-width:\d+px/);
    expect(rowAstro).toMatch(/\.row-date \{[^}]*white-space:nowrap/);
  });

  test('the date column clears the longest date the site renders', () => {
    const min = Number(/\.row-date \{[^}]*min-width:(\d+)px/.exec(rowAstro)?.[1]);
    // "27 AUG 2026" is 11 glyphs at the 30px --type-numeral size; 176px
    // clears it, so it never wraps and never needs truncating.
    expect(min).toBeGreaterThanOrEqual(176);
    expect('27 AUG 2026'.length * 15).toBeLessThanOrEqual(min);
  });

  test('a row without media declares three tracks, not four', () => {
    // Regression: with the media cell omitted the row still declared four
    // tracks, so the date inherited the 112px media track, the copy got the
    // narrow one, and the arrow landed in the flexible column.
    expect(rowAstro).toContain("'home-row--no-media': !showMedia");
    expect(rowAstro).toContain('.home-row--no-media { grid-template-columns:auto minmax(0,1fr) 34px; }');
  });

  test('the mobile breakpoint stacks so the date gets its own full-width line', () => {
    expect(rowAstro).toMatch(/@media \(max-width: 480px\) \{[\s\S]*\.row-date \{ grid-column:1 \/ -1;/);
    expect(rowAstro).toMatch(/@media \(max-width: 480px\) \{[\s\S]*\.row-copy \{ grid-column:1 \/ -1;/);
  });

  test('the description clamp is opt-out, for text that must show in full', () => {
    expect(rowAstro).toContain('clamp?: boolean;');
    expect(rowAstro).toContain("'line-clamp-1': clamp");
    // The now row's label must render in full, not as "CURRENTLY B…".
    expect(nowAstro).toContain('clamp={false}');
  });

  test('the media cell is always rendered in a list row, with a placeholder fallback', () => {    expect(rowAstro).toContain("class:list={['row-media', { 'is-placeholder': !media }]}");
    expect(rowAstro).toContain('data-hide-on-error');
    expect(rowAstro).toContain('.row-media.is-placeholder');
    expect(rowAstro).toContain('repeating-linear-gradient(-30deg');
    // A failed image degrades to the placeholder; removing the cell would
    // collapse the grid and break the alignment.
    expect(rowAstro).toContain("cell.classList.add('is-placeholder')");
    expect(rowAstro).not.toContain("closest('.row-media')?.remove()");
  });

  test('the error handler is a capture-phase listener, not an inline attribute', () => {
    expect(rowAstro).toContain('document.addEventListener(');
    expect(rowAstro).not.toMatch(/onerror=/);
    expect(rowAstro).toMatch(/true,\s*\n?\s*\);/);
  });
});

describe('featured projects strip', () => {
  test('every row and the footer button link to the projects index', () => {
    // Rows are pinned to /projects: there is no /projects/{slug} page, so a
    // per-project link would be a dead route.
    expect(featuredAstro).toContain("const rowHref = '/projects';");
    expect(featuredAstro).toContain('href={rowHref}');
    expect(featuredAstro).toContain('href="/projects">[ ALL PROJECTS ]');
    // No row may emit a per-project slug.
    expect(featuredAstro).not.toContain('href={entry.href}');
  });

  test('each row feeds the shared template year, status, and description', () => {
    expect(featuredAstro).toContain('date={String(entry.year)}');
    expect(featuredAstro).toContain('title={entry.title}');
    expect(featuredAstro).toContain('badge={entry.status}');
    expect(featuredAstro).toContain('description={entry.description}');
    expect(featuredAstro).toContain('media={entry.image}');
  });

  test('the footer button comes after the rows', () => {
    expect(featuredAstro.indexOf('[ ALL PROJECTS ]')).toBeGreaterThan(
      featuredAstro.indexOf('</HomeRow>'),
    );
  });
});

describe('latest notes strip', () => {
  test('exactly one /notes link, after the rows', () => {
    expect(notesAstro).toContain('href="/notes">[ ALL NOTES ]');
    expect(notesAstro.indexOf('[ ALL NOTES ]')).toBeGreaterThan(notesAstro.indexOf('</HomeRow>'));
  });

  test('each row feeds the shared template date, tag, reading time, and image', () => {
    expect(notesAstro).toContain('date={entry.dateLabel}');
    expect(notesAstro).toContain('title={entry.title}');
    expect(notesAstro).toContain('badge={entry.tag}');
    expect(notesAstro).toContain('description={entry.readLabel}');
    // Notes now carry artwork through the same media cell as projects.
    expect(notesAstro).toContain('media={entry.image}');
  });
});

describe('now status line', () => {
  test('a single /now link with an accessible name', () => {
    expect(nowAstro).toContain('href="/now"');
    expect(nowAstro).toContain('ariaLabel={`Now: ${status.title}');
  });

  test('it uses the shared template with no media cell and no badge', () => {
    expect(nowAstro).toContain('<HomeRow');
    expect(nowAstro).toContain('showMedia={false}');
    expect(nowAstro).not.toContain('badge=');
  });

  test('the availability status is no longer shown here', () => {
    expect(nowAstro).not.toContain('availabilityLabel');
    expect(nowAstro).not.toContain('OPEN TO WORK');
  });

  test('it shows what is being built and since when', () => {
    expect(nowAstro).toContain('title={status.title}');
    expect(nowAstro).toContain('date={status.updatedLabel}');
    expect(nowAstro).toContain('description={status.label}');
  });
});

describe('home theme contrast', () => {
  // The palette splits into theme-aware tokens (--text, --text-muted,
  // --text-faint, --red, --surface, --line-*) and FIXED tokens (--paper,
  // --ink, --text-inverse, --scene-*, --index-*) that are identical in both
  // themes. A fixed token used for theme-following text is invisible in one
  // theme, which is exactly the bug this guards against.
  const FIXED_TOKENS = ['--paper', '--ink', '--text-inverse', '--scene-', '--index-'];
  const homeSources: Array<[string, string]> = [
    ['FeaturedProjects.astro', featuredAstro],
    ['LatestNotes.astro', notesAstro],
    ['NowStatusLine.astro', nowAstro],
    ['HomeRow.astro', rowAstro],
    ['ContactBlock.astro', contactAstro],
  ];

  test('no home component uses a fixed token for any colour', () => {
    for (const [name, source] of homeSources) {
      for (const declaration of source.matchAll(/color:\s*var\((--[a-z0-9-]+)\)/g)) {
        expect(FIXED_TOKENS, `${name} uses the fixed token ${declaration[1]} for colour`).not.toContain(
          declaration[1],
        );
      }
    }
  });

  test('no home component hardcodes a colour value', () => {
    for (const [name, source] of homeSources) {
      for (const declaration of source.matchAll(/color:\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]*\))/g)) {
        expect.fail(`${name} hardcodes colour ${declaration[1]}`);
      }
    }
  });

  test('the colour tokens the home page relies on are overridden per theme', () => {
    const dark = css.slice(css.indexOf(':root {'), css.indexOf('html[data-theme="light"]'));
    const lightStart = css.indexOf('html[data-theme="light"] {');
    const light = css.slice(lightStart, css.indexOf('}', lightStart) + 1);
    // Only colour tokens are theme-sensitive: the type scale and spacing are
    // deliberately identical in both themes.
    const used = new Set(
      [...homeSources.map(([, source]) => source).join('').matchAll(/color:\s*var\((--[a-z0-9-]+)\)/g)].map(
        (m) => m[1]!,
      ),
    );
    for (const token of used) {
      // Aliases resolve through --primary/--secondary, which are overridden.
      if (['--red', '--dark-red', '--gray'].includes(token)) continue;
      expect(dark, `${token} missing from :root`).toContain(`${token}:`);
      expect(light, `${token} is not overridden in the light theme`).toContain(`${token}:`);
    }
  });

  test('the shared hover treatment stays theme-aware', () => {
    // Bound the slice to the shared hover block, not the rest of the sheet.
    const block = css.slice(css.indexOf('.row-hover {'), css.indexOf('.home-records {'));
    for (const declaration of block.matchAll(/color:\s*var\((--[a-z0-9-]+)\)/g)) {
      expect(['--paper', '--ink', '--text-inverse']).not.toContain(declaration[1]);
    }
    expect(block).toContain('background:var(--surface)');
    expect(block).toContain('var(--dark-red)');
  });
});

describe('contact block', () => {
  test('identity and tagline on the left, CONNECT links on the right', () => {
    expect(contactAstro).toContain('class="contact-identity"');
    expect(contactAstro).toContain('class="contact-connect"');
    expect(contactAstro.indexOf('contact-identity')).toBeLessThan(
      contactAstro.indexOf('contact-connect'),
    );
    expect(contactAstro).toContain('<p class="connect-label">CONNECT</p>');
  });

  test('no footer furniture: no copyright line, no rule, no status dot', () => {
    // The real site footer follows and already closes the page, so this
    // section must not read as a second footer.
    expect(contactAstro).not.toContain('PERSONAL ARCHIVE //');
    expect(contactAstro).not.toContain('contact-rule');
    expect(contactAstro).not.toContain('contact-foot');
    expect(contactAstro).not.toContain('contact-copy');
    expect(contactAstro).not.toContain('contact-dot');
    expect(contactAstro).not.toContain('statusLabel');
  });

  test('the section ends on the connect links', () => {
    const body = markup(contactAstro);
    const list = body.indexOf('connect-list');
    const close = body.lastIndexOf('</div>');
    expect(list).toBeGreaterThan(-1);
    expect(list).toBeLessThan(close);
  });

  test('the wordmark hover is a true colour swap', () => {
    // Default: "r" red, the rest light. Hover: they trade places.
    expect(contactAstro).toMatch(/\.contact-mark \{[^}]*color:var\(--text\)/);
    expect(contactAstro).toMatch(/\.contact-mark strong \{[^}]*color:var\(--red\)/);
    expect(contactAstro).toMatch(/\.contact-mark:hover \{ color:var\(--red\); \}/);
    expect(contactAstro).toMatch(/\.contact-mark:hover strong \{ color:var\(--text\); \}/);
    // Only the contact wordmark changes; the header mark keeps its own rule.
    expect(contactAstro).toContain('<strong>r</strong>avedeprinz_');
  });

  test('the wordmark colours are theme-aware, not fixed tokens', () => {
    // Regression: --paper/--ink are FIXED across both themes, so they render
    // white-on-white in light mode. Only theme-aware tokens may be used for
    // text that follows the theme.
    for (const rule of ['.contact-mark {', '.contact-mark strong {', '.contact-mark:hover {']) {
      const block = contactAstro.slice(contactAstro.indexOf(rule));
      const declaration = block.slice(0, block.indexOf('}'));
      for (const fixed of ['--paper', '--ink', '--text-inverse']) {
        expect(declaration).not.toContain(fixed);
      }
    }
  });

  test('connect links stay plain text; only the CV is a bracket button', () => {
    expect(contactAstro).toContain('class="connect-link"');
    // The profile links and the CONNECT label are unchanged plain text.
    expect(contactAstro).toContain('<p class="connect-label">CONNECT</p>');
    expect(contactAstro).toMatch(/\.connect-link \{[^}]*color:var\(--text-muted\)/);
    expect(contactAstro).not.toMatch(/\.connect-link \{[^}]*border:/);
    expect(contactAstro).toContain('rel="noreferrer"');
  });

  test('the CV uses the shared bracket button, not new styles', () => {
    expect(contactAstro).toContain('class="contact-cv bracket-btn row-hover--accent"');
    // The control is defined once in global.css, not restyled per component.
    expect(css).toContain('.bracket-btn {');
    expect(css).toMatch(/\.bracket-btn \{[^}]*border:2px solid var\(--line-25\)/);
    expect(css).toMatch(/\.bracket-btn \{[^}]*letter-spacing:2px/);
    // The same two classes the [ ALL ... ] buttons use.
    expect(featuredAstro).toContain('class="preview-all bracket-btn row-hover--accent"');
    expect(notesAstro).toContain('class="preview-all bracket-btn row-hover--accent"');
    // No component redefines the button's own appearance.
    for (const source of [contactAstro, featuredAstro, notesAstro]) {
      expect(source).not.toMatch(/\.bracket-btn \{/);
    }
    expect(contactAstro).toContain('aria-label="Download CV (PDF)"');
    expect(contactAstro).toMatch(/class="contact-cv bracket-btn row-hover--accent"[\s\S]*?download/);
  });

  test('the email reads after the wordmark and tagline, not before them', () => {
    const body = markup(contactAstro);
    const mark = body.indexOf('class="contact-mark"');
    const tagline = body.indexOf('class="contact-tagline"');
    const email = body.indexOf('class="contact-direct"');
    expect(mark).toBeLessThan(tagline);
    expect(tagline).toBeLessThan(email);
    // The email now lives inside the identity column, under the tagline.
    expect(email).toBeGreaterThan(body.indexOf('class="contact-identity"'));
  });

  test('the email stays reachable and is the direct method', () => {
    expect(contactAstro).toContain('mailto:${contact.email}');
    expect(contactAstro).toContain('>{contact.email}</a>');
  });

  test('a tagline is present and is not a repeat of the hero line', () => {
    expect(contactAstro).toContain('{contactTagline}');
    const tagline = 'Backend systems, built in the open.';
    expect(tagline).not.toMatch(/guess/i);
    expect(tagline).not.toMatch(/debug/i);
  });
});

describe('contact block data', () => {
  test('a blank email and a blank CV value produce no links at all', () => {
    const view = buildHomePreview({ projects: null, notes: null, now: null, site: null }).contact;
    expect(view.email).toBe('hello@ravedeprinz.me');
    // The shipped fallback has no CV, so the CV branch is not rendered.
    expect(view.cvUrl).toBeNull();
  });

  test('the fallback strip is exactly three entries and links to real destinations', () => {
    const preview = buildHomePreview({ projects: null, notes: null, now: null, site: null });
    expect(preview.featured).toHaveLength(3);
    for (const entry of preview.featured!) {
      expect(entry.href.startsWith('/projects/')).toBe(true);
    }
    expect(preview.notes).toHaveLength(3);
    for (const entry of preview.notes!) {
      expect(entry.href.startsWith('/notes/')).toBe(true);
      // Every note entry exposes artwork for the shared media cell.
      expect(entry.image === null || typeof entry.image === 'string').toBe(true);
    }
  });

  test('the now line uses the fallback now content when the CMS is unreachable', () => {
    const preview = buildHomePreview({ projects: null, notes: null, now: null, site: null });
    expect(preview.now.title).toBe(nowContent.current.title);
    expect(preview.now.updatedLabel).toBe(nowContent.current.updated_label);
    expect(preview.now.ariaLabel).toContain(nowContent.current.title);
  });
});
