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
const projectsLib = read('../../src/lib/projects.ts');
const availabilityLib = read('../../src/lib/availability.ts');
const siteData = read('../../src/data/site.ts');
const cvRoute = read('../../src/pages/cv.ts');
const css = read('../../src/styles/global.css');

const markup = (source: string) => source.slice(source.lastIndexOf('---') + 3);

describe('projects list', () => {
  test('project entries are not clickable while the case-study pages are unpublished', () => {
    // Single switch, read by both the list and the home strip.
    expect(projectsLib).toContain('export const PROJECT_PAGES_PUBLISHED = false;');
    expect(projectsAstro).toContain('projectEntryHref(project)');
    // The card is never an anchor, so nothing wraps the entry.
    expect(projectsAstro).toContain("class:list={['record', 'project-record', href && 'lift']}");
    expect(projectsAstro).not.toMatch(/<article[^>]*>\s*<a /);
    expect(projectsAstro).not.toContain('project-record lift"');
    // The title renders as plain text when there is no href.
    expect(projectsAstro).toContain('{href ? <a href={href}>{project.title}</a> : project.title}');
  });

  test('the clickability hover treatment is gone from the entry', () => {
    // `lift` supplies the offset red border/shadow hover, so it is only
    // applied when the entry is actually a link.
    expect(projectsAstro).toContain("href && 'lift'");
    expect(css).toMatch(/\.lift:hover[^{]*\{[^}]*border-color:var\(--red\)/);
    // The title's own hover colour change and focus ring are removed.
    expect(projectsAstro).not.toContain('.project-content h2 a:hover');
    expect(projectsAstro).not.toContain('.project-content h2 a {');
  });

  test('Live and Source links still work and are not nested inside a link', () => {
    expect(projectsAstro).toContain(
      '{project.live_url && <a href={project.live_url} target="_blank" rel="noreferrer">Live ↗</a>}',
    );
    expect(projectsAstro).toContain(
      '{project.source_url && <a href={project.source_url} target="_blank" rel="noreferrer">Source ↗</a>}',
    );
    // The entry element is an <article>, so the external links sit outside any
    // enclosing anchor — never invalid nested links.
    const entryOpen = projectsAstro.slice(projectsAstro.indexOf('<article'));
    expect(entryOpen.slice(0, entryOpen.indexOf('</article>')).indexOf('<a ') > 0).toBe(true);
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

  test('the per-project href is still what the shared helper produces', () => {
    // Only the click targets are suppressed. The case-study URL builder is
    // untouched, so publishing the pages needs no other change.
    expect(projectsLib).toContain('return `/projects/${resolveProjectSlug(p)}`');
    expect(projectsLib).toContain('export function projectEntryHref(p: Project): string | null {');
  });

  test('the home fetches go through the request cache', () => {
    expect(indexAstro).toContain('loadHomePreview(Astro.locals)');
    expect(indexAstro).toContain("cached(Astro.locals, 'home', fetchHome)");
  });
});

describe('hero CV button', () => {
  test('a secondary CV button sits beside the primary CTA', () => {
    expect(indexAstro).toContain('class="home-cta-row"');
    const row = indexAstro.slice(indexAstro.indexOf('<div class="home-cta-row">'));
    const primary = row.indexOf('class="home-cta"');
    const secondary = row.indexOf('class="home-cv bracket-btn row-hover--accent"');
    expect(primary).toBeGreaterThan(-1);
    expect(secondary).toBeGreaterThan(primary);
  });

  test('the primary CTA is unchanged and still the solid red button', () => {
    expect(indexAstro).toContain('{content.cta_label} <b>↗</b>');
    expect(css).toMatch(/\.home-cta \{[^}]*background:var\(--red\)/);
  });

  test('it reuses the shared bracket control, not new styles', () => {
    // Same two classes as [ ALL PROJECTS ] / [ ALL NOTES ] / the Contact CV.
    expect(indexAstro).toContain('class="home-cv bracket-btn row-hover--accent"');
    expect(indexAstro).not.toMatch(/\.home-cv \{/);
  });

  test('it points at the stable /cv route, not the hashed upload URL', () => {
    expect(indexAstro).toContain('href="/cv"');
    // The stored name is hashed and must never be the link or the save name.
    expect(indexAstro).not.toContain('href={preview.contact.cvUrl}');
    expect(indexAstro).not.toMatch(/href=\{.*uploads.*\.pdf/);
  });

  test('it reads the view model, so the Contact section is not a dependency', () => {
    // The button renders only when a CV exists, and it never reaches into the
    // Contact component.
    expect(indexAstro).toContain('{preview.contact.cvUrl && (');
    expect(availabilityLib).toContain('cvUrl: blankToNull(trimmed(source.cv_url))');
  });

  test('the download filename comes from one shared constant', () => {
    // Not hardcoded here: the route and the button both read the same place.
    expect(indexAstro).toContain("import { cvDownloadFilename } from '../data/site';");
    expect(indexAstro).toContain('download={cvDownloadFilename}');
    expect(siteData).toContain("export const cvDownloadFilename = 'Rakhis-de-Yudha-CV.pdf';");
    expect(cvRoute).toContain("import { cvDownloadFilename } from '../data/site';");
    // Exactly one place defines it.
    expect(siteData.match(/cvDownloadFilename =/g)?.length).toBe(1);
    expect(indexAstro).not.toMatch(/Rakhis-de-Yudha-CV/);
    expect(cvRoute).not.toMatch(/Rakhis-de-Yudha-CV/);
  });

  test('it only renders when a CV exists, and wraps on narrow viewports', () => {
    expect(indexAstro).toContain('{preview.contact.cvUrl && (');
    expect(css).toMatch(/\.home-cta-row \{[^}]*flex-wrap:wrap/);
    expect(css).toMatch(/\.home-cta-row \{[^}]*gap:14px/);
  });

  test('its colours are theme-aware', () => {
    // .bracket-btn is defined in global.css on theme-aware tokens.
    expect(css).toMatch(/\.bracket-btn \{[^}]*border:2px solid var\(--line-25\)/);
    expect(css).toMatch(/\.bracket-btn \{[^}]*color:var\(--text\)/);
    expect(indexAstro).not.toMatch(/#[0-9a-fA-F]{3,8}/);
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

  test('the optional subtitle sits between the title line and the description', () => {
    const body = markup(rowAstro);
    // Guarded, so a note with no subtitle renders no empty line.
    expect(body).toContain('{subtitle && (');
    const head = body.indexOf('class="row-head"');
    const bodyBlock = body.indexOf('class="row-body"');
    const subtitle = body.indexOf("'row-subtitle'");
    const desc = body.indexOf("'row-desc'");
    expect(head).toBeLessThan(bodyBlock);
    // Both secondary lines travel inside the one block, in reading order.
    expect(bodyBlock).toBeLessThan(subtitle);
    expect(subtitle).toBeLessThan(desc);
    // Same rule as the description, so the two lines cannot drift apart in
    // size, weight, colour, or truncation.
    expect(rowAstro).toMatch(/\.row-subtitle,\n\s*\.row-desc \{[^}]*color:var\(--text-muted\)[^}]*font:var\(--type-small\)/);
  });

  test('every secondary line is styled by the one shared template', () => {
    // Featured Work rows and Latest Notes rows are the same component, so
    // title, date, tag, subtitle and description cannot drift between the two
    // lists: there is exactly one declaration of each, here.
    for (const selector of [
      '.row-title { font:700 var(--type-body) var(--font-ui);',
      '.row-badge { color:var(--red); font:700 var(--type-label) var(--font-ui);',
      '.row-date { min-width:176px;',
      '.row-subtitle,\n  .row-desc { color:var(--text-muted); font:var(--type-small) var(--font-ui);',
    ]) {
      expect(rowAstro).toContain(selector);
    }
    // And no list re-declares any of them locally.
    for (const source of [featuredAstro, notesAstro, nowAstro]) {
      expect(source).not.toContain('font-size:');
      expect(source).not.toContain('font-weight:');
    }
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

  test('the mobile breakpoint uses one stack for both lists', () => {
    // Featured Work and Latest Notes must differ only in which props they pass,
    // never in where anything sits. Every row is:
    //   1 thumbnail | 2 title + date | 3 status/tag | 4 subtitle/description
    //   | 5 read time (Notes only).
    expect(rowAstro).toMatch(/\.row-media \{ grid-row:1; grid-column:1 \/ -1;[^}]*aspect-ratio:16\/9;/);
    // Title leads; date shares its line, right-aligned, at label size — so the
    // date no longer outweighs the title it belongs to.
    expect(rowAstro).toMatch(/\.row-title \{ grid-row:2; grid-column:1;[^}]*clamp\(/);
    expect(rowAstro).toMatch(/\.row-date \{ grid-row:2; grid-column:2;[^}]*text-align:right;[^}]*font:700 var\(--type-label\)/);
    // Status and tag both land directly under the title, left-aligned. This is
    // the standardisation: they used to sit in the right column, in different
    // rows, so FINISHED and MEMOIR read as two unrelated placements.
    expect(rowAstro).toMatch(/\.row-badge \{ grid-row:3; grid-column:1; text-align:left; \}/);
    expect(rowAstro).not.toMatch(/\.row-badge \{ grid-row:3; grid-column:2/);
    // Secondary lines full width, below the tag.
    expect(rowAstro).toMatch(/\.row-body \{ grid-row:4; grid-column:1 \/ -1;/);
  });

  test('one grid row for the secondary lines, so no list is left with a gap', () => {
    // Subtitle and description are placed as a single `.row-body` block. As two
    // separate rows the list holding only one of them — Featured Work has no
    // subtitle, the Now line has neither — would keep an empty row and a gap
    // that reads as a mistake, which is the inconsistency being removed.
    expect(rowAstro).toContain('.row-body { display:flex; flex-direction:column; gap:6px; min-width:0; }');
    // Above the breakpoint the wrapper is transparent: same 6px gap as the
    // copy column it sits in, so desktop renders unchanged.
    expect(rowAstro).toContain('.row-copy { display:flex; flex-direction:column; gap:6px; min-width:0; }');
    expect(rowAstro).toMatch(/\.row-copy,\n\s*\.row-head \{ display:contents; \}/);
    // The Now row carries neither media nor a badge, so its stack starts at
    // the top instead of holding two empty rows above the label.
    expect(rowAstro).toMatch(/\.home-row--no-media \.row-title,\n\s*\.home-row--no-media \.row-date \{ grid-row:1; \}/);
    expect(rowAstro).toMatch(/\.home-row--no-media \.row-body \{ grid-row:2; \}/);
  });

  test('the mobile arrow is anchored to the row, not stranded in the copy', () => {
    // It used to take a row of its own at the bottom, which read as floating
    // in empty space below the description. Pinned to the corner instead — and
    // that only works because the row is the positioned ancestor.
    expect(rowAstro).toMatch(/\.row-arrow \{ position:absolute; right:0; bottom:0;/);
    // Regression guard: an absolute child with no positioned parent drifts to
    // the nearest positioned ancestor, or the page.
    expect(rowAstro).toMatch(/\.home-row \{ position:relative;/);
    // The last line reserves the arrow's gutter so text never runs under it.
    expect(rowAstro).toMatch(/\.row-body \{ grid-row:4; grid-column:1 \/ -1; padding-right:32px; \}/);
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
  test('every row links only to real pages, never to a per-project slug', () => {
    // Driven by the one flag, so flipping it restores per-project links in
    // both places; while it is false no row can emit /projects/{slug}.
    expect(featuredAstro).toContain("import { PROJECT_PAGES_PUBLISHED } from '../../lib/projects';");
    expect(featuredAstro).toContain('const rowHref = (entry: FeaturedEntry) =>');
    expect(featuredAstro).toContain("PROJECT_PAGES_PUBLISHED ? entry.href : '/projects'");
    expect(featuredAstro).toContain('href={rowHref(entry)}');
    // The row must not fall back to the raw per-project href.
    expect(featuredAstro).not.toContain('href={entry.href}');
  });

  test('the footer button links to the projects index, after the rows', () => {
    expect(featuredAstro).toContain('href="/projects">[ ALL PROJECTS ]');
    expect(featuredAstro.indexOf('[ ALL PROJECTS ]')).toBeGreaterThan(
      featuredAstro.indexOf('</HomeRow>'),
    );
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

  test('each row also feeds the CMS subtitle through to the template', () => {
    // The subtitle exists on the note and is already shown on the note detail
    // page; the homepage strip dropped it. It renders between the title line
    // and the reading time.
    expect(notesAstro).toContain('subtitle={entry.subtitle}');
    const subtitle = notesAstro.indexOf('subtitle={entry.subtitle}');
    expect(subtitle).toBeGreaterThan(notesAstro.indexOf('badge={entry.tag}'));
    expect(subtitle).toBeLessThan(notesAstro.indexOf('description={entry.readLabel}'));
    // Featured Work passes no subtitle: its description already fills that
    // slot, so the two strips must not both grow a standfirst.
    expect(featuredAstro).not.toContain('subtitle=');
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

  test('the CV download is not in this section; it lives in the hero', () => {
    // Asserted against the rendered markup, so prose in the leading comment
    // cannot satisfy or break it.
    const body = markup(contactAstro);
    expect(body).not.toContain('contact-cv');
    expect(body).not.toContain('bracket-btn');
    expect(body).not.toContain('contact.cvUrl');
    expect(body).not.toContain('aria-label="Download CV (PDF)"');
    // Nothing that existed only to place it survives, in markup or styles.
    expect(contactAstro).not.toMatch(/\.contact-cv \{/);
    // The remaining column is just the CONNECT label and the profile links.
    expect(body).toContain('<p class="connect-label">CONNECT</p>');
    expect(body).toContain('class="connect-link"');
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
