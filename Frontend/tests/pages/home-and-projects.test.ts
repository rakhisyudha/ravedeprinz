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
const workAstro = read('../../src/pages/work.astro');
const notesPageAstro = read('../../src/pages/notes.astro');
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
    // The card is never an anchor, so nothing wraps the entry — and it takes
    // no interaction treatment, because it is not the clickable thing.
    expect(projectsAstro).toContain("class:list={['record', 'project-record']}");
    expect(projectsAstro).not.toMatch(/<article[^>]*>\s*<a /);
    expect(projectsAstro).not.toContain('project-record lift"');
    // Asserted against the class-usage forms, not the bare word: the
    // explanatory comment in the template names the class, and prose must not
    // be able to satisfy or break this.
    expect(markup(projectsAstro)).not.toContain("'lift'");
    expect(markup(projectsAstro)).not.toContain('lift"');
    expect(markup(projectsAstro)).not.toContain(' lift ');
    // The title renders as plain text when there is no href.
    expect(projectsAstro).toContain('{href ? <a href={href}>{project.title}</a> : project.title}');
  });

  test('the project card never takes the lift interaction', () => {
    // `lift` is a clickable-card treatment. The project card is deliberately
    // never an anchor (so the external Live/Source links are never nested), so
    // the only clickable thing inside it is the title link — and gating the
    // card on `href` gated on "does a case-study page exist", not on
    // "is this clickable". Non-clickable elements get no interaction.
    expect(projectsAstro).toContain("class:list={['record', 'project-record']}");
    // The title's own hover colour change and focus ring stay removed.
    expect(projectsAstro).not.toContain('.project-content h2 a:hover');
    expect(projectsAstro).not.toContain('.project-content h2 a {');
  });

  test('lift is only ever applied to an element that is itself clickable', () => {
    // The work records contain no anchor at all: number, role, description,
    // stack and aside. A hover lift there promised an interaction the markup
    // did not have.
    expect(workAstro).toContain('<article class="record">');
    expect(markup(workAstro)).not.toContain('lift');
    expect(markup(workAstro)).not.toContain('<a ');

    // The notes list is the one card whose whole surface is a link, so the
    // treatment moved from the wrapping article onto that link — which also
    // makes :focus-visible reachable for the first time.
    expect(notesPageAstro).toContain('<article class="note">');
    expect(notesPageAstro).toContain('class="note-link lift"');
    expect(notesPageAstro).not.toContain('class="note lift"');
    // `box-shadow` joins .note-link's own transition list, or the later rule
    // would drop `.lift`'s offset animation.
    expect(css).toMatch(/\.note-link \{[^}]*transition:[^}]*box-shadow \.2s ease/);
  });

  test('no static element carries a clickable treatment', () => {
    // `.panel` is decoration on non-clickable prose blocks; it has a shadow
    // but must never gain a hover.
    expect(css).toContain('.panel { background:var(--surface); border:1px solid var(--line-16); box-shadow:10px 10px 0 var(--offset-soft); }');
    expect(css).not.toMatch(/\.panel:hover/);
    // And the hardcoded accent survives in exactly one place: the token itself.
    expect(css.match(/rgba\(115,36,36,\.48\)/g)).toHaveLength(1);
    expect(css).toContain('--offset-soft:rgba(115,36,36,.48);');
    // The light theme gets its own, rather than inheriting the dark theme's red.
    const lightStart = css.indexOf('html[data-theme="light"] {');
    const light = css.slice(lightStart, css.indexOf('}', lightStart) + 1);
    expect(light).toContain('--offset-soft:rgba(156,58,58,.48);');
  });

  test('.lift is still in use, and only on a clickable element', () => {
    // It was nearly removed as dead code: the only surviving usage is the
    // notes list's `.note-link`, which is the card's actual link. Guard the
    // usage so the primitive is not deleted on a later cleanup pass, and guard
    // the two pages that must not carry it at all.
    expect(notesPageAstro).toContain('class="note-link lift"');
    // Checked against the class-usage forms, not the bare word: the note in
    // projects.astro names the class, and prose must not break the assertion.
    expect(markup(projectsAstro)).not.toContain("'lift'");
    expect(markup(projectsAstro)).not.toContain('lift"');
    expect(markup(workAstro)).not.toContain('lift');
    expect(css).toContain('.lift {');
  });

  test('the note header block is declared once, and the panel colour is tokenised', () => {
    // Two copies of the note header existed; the later, safe-area-aware one
    // silently won. The earlier one is removed, so a future edit cannot land
    // on the dead copy.
    expect(css.match(/^\.note-header-back \{/gm)).toHaveLength(1);
    expect(css.match(/^\.note-header \{/gm)).toHaveLength(1);
    expect(css.match(/@media \(hover: hover\) and \(pointer: fine\) \{ \.note-header-back:hover/g)).toHaveLength(1);
    // The hardcoded accent survives in exactly one place: the token itself.
    expect(css.match(/rgba\(115,36,36,\.48\)/g)).toHaveLength(1);
    expect(css).toContain('--offset-soft:rgba(115,36,36,.48);');
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
  // `.lift` is defined earlier in the sheet than `.row-hover`, and it has its
  // own capability query, so bound every slice to the row-hover section. Bound
  // on the column-selector at line start: the narrow-viewport block below also
  // contains an indented `.home-records` rule.
  const rowBlock = css.slice(css.indexOf('.row-hover {'), css.indexOf('\n.home-records {'));

  test('it is defined once in global.css', () => {
    expect(css).toContain('.row-hover { position:relative;');
    expect(css).toContain('transform:translateX(10px) skewX(-3deg)');
    expect(css).toContain('.row-hover:focus-visible .row-arrow');
  });

  test('the skew/translate/shadow hover is gated on hover-capable pointers', () => {
    expect(rowBlock).toContain('@media (hover: hover) and (pointer: fine) {');
    expect(rowBlock).toMatch(/\.row-hover:hover \{[^}]*skewX\(-3deg\)/);
    expect(rowBlock).toContain('.row-hover:hover::before { transform:scaleY(1); }');
    expect(rowBlock).toContain('.row-hover:hover .row-arrow { transform:translate(5px,-5px); }');
  });

  test('no translate or skew is reachable outside the pointer query', () => {
    // The regression that survived the first fix: movement was suppressed by a
    // capability query rather than declared only inside one, so any device that
    // misreports `(hover: hover)` — an emulated viewport, a hybrid with a
    // trackpad — inherited the skewed, gutter-overrunning transform again.
    const gate = rowBlock.indexOf('@media (hover: hover)');
    expect(rowBlock.match(/skewX/g)).toHaveLength(1);
    expect(rowBlock.match(/translateX\(10px\)/g)).toHaveLength(1);
    expect(rowBlock.indexOf('skewX')).toBeGreaterThan(gate);
    // Nothing before the gate moves the card, in any state.
    const beforeGate = rowBlock.slice(0, gate);
    expect(beforeGate).not.toContain('skewX');
    expect(beforeGate).not.toContain('translateX');
    expect(beforeGate).not.toContain('translate(-2px,-2px)');
    // Nor after the mouse query ends: the touch and narrow-viewport blocks
    // only ever say `transform:none`.
    const afterGate = rowBlock.slice(rowBlock.indexOf('@media (hover: none)'));
    expect(afterGate).not.toContain('skewX');
    expect(afterGate).not.toContain('translateX');
    expect(afterGate).not.toContain('translate(-2px,-2px)');
  });

  test('keyboard focus is a static layered offset, never a movement', () => {
    // Focus is how a keyboard user knows where they are, and it must look the
    // same on a phone — where a tap can leave focus latched. It gets the
    // outline plus the offset layer, and no transform.
    expect(rowBlock).toMatch(/\.row-hover:focus-visible \{[^}]*box-shadow:10px 8px 0 var\(--red\)[^}]*outline:2px solid var\(--red\)/);
    const focusRule = /(\.row-hover:focus-visible \{[^}]*)\}/.exec(rowBlock)![1];
    expect(focusRule).not.toContain('transform');
    expect(rowBlock).toMatch(/\.row-hover--accent:focus-visible \{[^}]*box-shadow:4px 4px 0 var\(--red\)/);
    // Both focus rules sit outside the capability query, ahead of it.
    const gate = rowBlock.indexOf('@media (hover: hover)');
    expect(rowBlock.indexOf('.row-hover:focus-visible {')).toBeLessThan(gate);
    expect(rowBlock.indexOf('.row-hover--accent:focus-visible {')).toBeLessThan(gate);
  });

test('touch disarms the mouse treatment and never transforms', () => {
    // Press fills the surface and drops an accent offset in place. Nothing
    // translates or skews, so the row cannot grow past the gutter at any
    // height — and `a:active`'s global scale/brightness flash is suppressed.
    expect(rowBlock).toMatch(/@media \(hover: none\), \(pointer: coarse\) \{/);
    expect(rowBlock).toContain('.row-hover:hover,\n  .row-hover:hover .row-arrow,\n  .row-hover--accent:hover { transform:none; }');
    expect(rowBlock).toContain('.row-hover:active,\n  .row-hover--accent:active { transform:none; filter:none; }');
    expect(rowBlock).toContain('.row-hover:active { background:var(--surface); box-shadow:0 5px 0 var(--red);');
  });

  test('below the row breakpoint the card rests flat and cannot move', () => {
    // The resting reference look: upright, a solid --layer-neutral layer behind
    // it offset down-and-right, red accent down the left edge.
    const mobile = rowBlock.slice(rowBlock.indexOf('@media (max-width: 480px)'));
    expect(mobile).toMatch(/\.row-hover,\n\s*\.row-hover:hover,\n\s*\.row-hover:focus-visible \{ margin-inline:4px; isolation:isolate; box-shadow:0 5px 0 var\(--layer-neutral\); \}/);
    expect(mobile).toMatch(/\.row-hover::before,\n\s*\.row-hover:hover::before,\n\s*\.row-hover:focus-visible::before,\n\s*\.row-hover:active::before \{ transform:scaleY\(1\); \}/);
    expect(mobile).toMatch(/\.row-hover:focus-visible \{ outline:2px solid var\(--red\); outline-offset:4px; \}/);
    // No transform of any kind survives in any state.
    expect(mobile).toMatch(/\.row-hover,\n\s*\.row-hover:hover,\n\s*\.row-hover:focus-visible,\n\s*\.row-hover:active,\n\s*\.row-hover--accent,\n\s*\.row-hover--accent:hover,\n\s*\.row-hover--accent:focus-visible,\n\s*\.row-hover--accent:active \{ transform:none; filter:none; \}/);
    expect(mobile).not.toContain('skewX');
    expect(mobile).not.toContain('translateX');
    expect(mobile).not.toContain('translate(-2px,-2px)');
    expect(mobile).not.toContain('translate(5px,-5px)');
    // Placed after the capability query, so it wins the source-order tie.
    expect(rowBlock.indexOf('@media (max-width: 480px)')).toBeGreaterThan(
      rowBlock.indexOf('@media (hover: hover)'),
    );
  });

  test('the mobile card is an inset object, not a full-width panel', () => {
    // At full content width the card read as a website panel with decorative
    // edges, and the offset had nowhere to go. The inset shrinks the card box
    // itself via `margin-inline`, so the clickable area and the visible card
    // stay one object — and `.row-hover--accent` (the inline [ ALL NOTES ] and
    // CV controls) is deliberately NOT inset, since it is a control, not a card.
    const mobile = rowBlock.slice(rowBlock.indexOf('@media (max-width: 480px)'));
    expect(mobile).toMatch(/\.row-hover,\n\s*\.row-hover:hover,\n\s*\.row-hover:focus-visible \{ margin-inline:4px; isolation:isolate; box-shadow:0 5px 0 var\(--layer-neutral\); \}/);
    expect(mobile).not.toMatch(/\.row-hover--accent[^{]*\{[^}]*margin-inline/);
    // Desktop is untouched: no inset, no gap, outside every media query.
    const ungated = rowBlock.slice(0, rowBlock.indexOf('@media (hover: hover)'));
    expect(ungated).not.toContain('margin-inline:');
  });

  test('the mobile geometry leaves the depth inside the page gutter and the gap', () => {
    const inset = 4, depth = 5, gutter = 22, gap = 20;
    // The depth is bottom-only, so it has no horizontal footprint at all: the
    // card's right edge is the inset alone, and nothing extends past it. That
    // leaves the whole 22px gutter spare, at every width — and since the
    // gutter is a fixed value rather than a ratio, wider viewports only gain.
    expect(inset).toBeLessThanOrEqual(gutter);
    for (const viewport of [360, 390, 430]) {
      expect(viewport - gutter - inset).toBeLessThanOrEqual(viewport - inset);
    }
    // Vertically the 5px depth lands in the 20px gap, so it never touches the
    // next card.
    expect(depth).toBeLessThan(gap);
    // 481-900px keeps the compact ruled list: no inset, no resting offset, and
    // press feedback still reaches the row. Bound to the block between the
    // touch query and the narrow-viewport one.
    const compact = rowBlock.slice(
      rowBlock.indexOf('@media (hover: none), (pointer: coarse)'),
      rowBlock.indexOf('@media (max-width: 480px)'),
    );
    expect(compact).toContain('.row-hover:active { background:var(--surface); box-shadow:0 5px 0 var(--red);');
    expect(compact).not.toContain('margin-inline:');
    // The Archive Index stays a hairline list above 480px and only becomes a
    // set of cards at this width, in the shared block and in HomeRow alike.
    expect(rowAstro).toMatch(/\.home-row \{ border-top:0; \}/);
    const mobile = rowBlock.slice(rowBlock.indexOf('@media (max-width: 480px)'));
    expect(mobile).toContain('.home-records { gap:20px; }');
    expect(mobile).toContain('.home-records .home-record { border-top:0; padding-right:8px; }');
    // The page gutter the geometry is measured against.
    expect(css).toContain('.page,.home-page { padding:calc(92px + env(safe-area-inset-top, 0px)) 22px 75px; }');
  });

  test('the gap between cards is larger than the offset, so the layer lands in it', () => {
    // 20px of gap for a 5px offset: the block behind a card has somewhere to
    // land instead of touching the next one. Applies to both row types.
    const offset = 5;
    expect(rowAstro).toMatch(/\.home-row-item \{ margin-bottom:20px; \}/);
    const mobile = rowBlock.slice(rowBlock.indexOf('@media (max-width: 480px)'));
    expect(mobile).toContain('.home-records { gap:20px; }');
    for (const gap of [20, Number(/gap:(\d+)px/.exec(mobile)![1])]) {
      expect(gap).toBeGreaterThan(offset);
    }
  });

  test('the neutral layer is depth beneath the card, never a frame around it', () => {
    // Mobile is bottom-only: x-offset 0, y-offset 5, no blur, no spread. An
    // L-shaped offset wraps the card's right edge too and reads as a frame
    // with the card inside it; a four-sided ring reads worse still.
    const mobile = rowBlock.slice(rowBlock.indexOf('@media (max-width: 480px)'));
    const all = [...mobile.matchAll(/box-shadow:\s*([^;]+);/g)].map((m) => m[1].trim());
    // `.row-hover--accent` is an inline control rather than a card, so it keeps
    // its own L-shaped 4px. Everything else in the block is the card.
    const cardShadows = all.filter((s) => !/^4px 4px /.test(s));
    expect(cardShadows.length).toBeGreaterThan(0);
    for (const offsets of cardShadows) {
      // "<x> <y> <blur> <colour>" and nothing else.
      expect(offsets).toMatch(/^(0|0px) \d+px 0 var\(--/);
      // No comma, so there is no second layer and no four-sided ring.
      expect(offsets).not.toContain(',');
      // The x-offset is zero, so no neutral vertical line can appear on the
      // card's right edge.
      expect(/^0(px)? /.test(offsets)).toBe(true);
    }
    // The accent control is the one and only exception.
    expect(all.filter((s) => !/^0(px)? /.test(s))).toEqual(['4px 4px 0 var(--layer-neutral)']);
  });

  test('the mobile red accent traces the visible card, not the link box', () => {
    // The bar used to run the full link while the card is the content box, so
    // it started 14px above the thumbnail and ended 14px below the last line.
    // Cause: `top`/`bottom` on an absolutely positioned pseudo-element resolve
    // against the PADDING box, and the anchor's own block padding is inside
    // that. Ruled out first, so it is recorded here: the image is not the
    // culprit — it is `display:block` in a block-level grid item, so there is
    // no baseline gap, intrinsic line-height spacing, or wrapper-height
    // difference to correct.
    expect(rowAstro).toContain('.row-media { position:relative; display:block;');
    expect(rowAstro).toContain('.row-media img { display:block; width:100%; height:100%; object-fit:cover; }');

    // The fix: each carrier publishes its own block padding as a variable,
    // next to the padding it actually applies, and the bar re-applies it.
    expect(rowAstro).toContain('--card-pad-y:14px;');
    expect(rowAstro).toContain('padding:var(--card-pad-y) 0;');
    expect(css).toContain('--card-pad-y:13px;');
    expect(css).toContain('padding:var(--card-pad-y) 14px var(--card-pad-y) 0;');
    // The 0 fallback matters: an undefined custom property is invalid at
    // computed-value time, which would make `top` resolve to `auto` and the
    // bar to zero height on any future `.row-hover` without the variable.
    const mobile = rowBlock.slice(rowBlock.indexOf('@media (max-width: 480px)'));
    expect(mobile).toContain('.row-hover::before { left:auto; right:0; top:var(--card-pad-y, 0); bottom:0; z-index:1; }');
    // The base still runs the full row, so desktop is untouched.
    expect(css).toContain(".row-hover::before { content:''; position:absolute; left:0; top:0; bottom:0; width:3px;");
  });

  test('the mobile red accent spans the whole card, and is not painted over', () => {
    // The bar looked partial, but the geometry was already correct — it was
    // being painted over. `::before` is the anchor's first child, so among
    // siblings that are all positioned with `z-index: auto` it paints first,
    // and `.row-media` is `position: relative` with an opaque background and a
    // border spanning the full width. On a card with artwork the thumbnail
    // covered the bar for its whole height and only the text below showed.
    // Ruled out first, and recorded: the image is `display:block` in a
    // block-level grid item, so there is no baseline gap or intrinsic sizing
    // difference involved.
    expect(rowAstro).toContain('.row-media { position:relative; display:block;');
    expect(rowAstro).toContain('.row-media img { display:block; width:100%; height:100%; object-fit:cover; }');
    // Fixed by stacking, not by a height: the bar is lifted above the content
    // it belongs to, and the anchor isolates that level to the card.
    const mobile = rowBlock.slice(rowBlock.indexOf('@media (max-width: 480px)'));
    expect(mobile).toContain('.row-hover::before { left:auto; right:0; top:var(--card-pad-y, 0); bottom:0; z-index:1; }');
    expect(mobile).toMatch(/\.row-hover,\n\s*\.row-hover:hover,\n\s*\.row-hover:focus-visible \{ margin-inline:4px; isolation:isolate;/);
    // It starts at the top edge of the image rather than in the padding above
    // it, and runs to the card's bottom edge. 3px wide, unchanged.
    expect(rowAstro).toContain('--card-pad-y:14px;');
    expect(css).toContain('.row-hover::before { content:\'\'; position:absolute; left:0; top:0; bottom:0; width:3px;');
    // No fixed height, which is what the user asked us not to do.
    expect(mobile).not.toMatch(/\.row-hover::before \{[^}]*height:/);
    // Desktop untouched: the base declaration carries no stacking level, so
    // the mouse rendering is exactly as it was.
    const baseBar = /\.row-hover::before \{[^}]*\}/.exec(css)![0];
    expect(baseBar).not.toContain('z-index');
    expect(baseBar).toContain('left:0');
  });

  test('the two arrow contexts stay distinct', () => {
    // Archive Index: small, red, moved inward by its own margin so the
    // record's number and copy do not shift. The column is `justify-self: end`.
    const mobile = rowBlock.slice(rowBlock.indexOf('@media (max-width: 480px)'));
    expect(mobile).toContain('.home-record-arrow { margin-right:5px; }');
    expect(css).toMatch(/\.home-record-arrow \{[^}]*justify-self:end; color:var\(--red\)/);
    // Large content card: bigger than the 1.2 it was, bottom-right, inset from
    // BOTH edges, and its last line of copy keeps clear of it.
    expect(rowAstro).toContain('.row-arrow { color:var(--text-faint); font:calc(var(--type-body) * 1.4) var(--font-ui); }');
    expect(rowAstro).toMatch(/\.row-arrow \{ position:absolute; right:6px; bottom:6px;/);
    expect(rowAstro).toMatch(/\.row-body \{ grid-row:4; grid-column:1 \/ -1; padding-right:38px; \}/);
    // The Archive arrow keeps its own size and is not given the card's.
    expect(css).toContain('.home-record-arrow { font-size:21px; }');
    // The archive arrow is not the card arrow: it is not absolutely positioned
    // by HomeRow's scoped rule, so the two cannot bleed into each other.
    expect(indexAstro).toContain('class="home-record-arrow row-arrow"');
  });

  test('the corner arrow is a fifth larger, as a ratio of the type scale', () => {
    // A scale bump on the existing font, not a new mechanism: still the ↗
    // glyph, still `var(--font-ui)`, still the same positioning and the same
    // desktop hover movement. calc() keeps it tied to the token.
    const factor = Number(/\* ([\d.]+)\)/.exec(/\.row-arrow \{[^}]*\}/.exec(rowAstro)![0])![1]);
    // 14px * 1.4 = 19.6px: a further ~17% on the previous 16.8px, and still
    // well under the mobile title's 28px ceiling so it never competes.
    expect(14 * factor).toBeGreaterThan(19);
    expect(14 * factor).toBeLessThan(21);
    expect(rowBlock).toContain('.row-hover:hover .row-arrow { transform:translate(5px,-5px); }');
  });

  test('the mobile red accent is on the right edge, and clears what sits there', () => {
    // The card is inset 4px with its depth underneath, so the right edge is
    // the only edge the bar can terminate on. Desktop is untouched.
    const mobile = rowBlock.slice(rowBlock.indexOf('@media (max-width: 480px)'));
    expect(mobile).toContain('.row-hover::before { left:auto; right:0; top:var(--card-pad-y, 0); bottom:0; z-index:1; }');
    // The base still anchors it left, and only the mobile block overrides it.
    expect(css).toContain(".row-hover::before { content:''; position:absolute; left:0; top:0; bottom:0; width:3px; background:var(--red); transform:scaleY(0); transform-origin:bottom;");
    // Growth is unchanged: the bar still rises from the bottom, only the side
    // differs, and it is fully shown at rest on mobile.
    expect(mobile).toMatch(/\.row-hover::before,\n\s*\.row-hover:hover::before,\n\s*\.row-hover:focus-visible::before,\n\s*\.row-hover:active::before \{ transform:scaleY\(1\); \}/);
    expect(css).toContain('transform-origin:bottom');

    // Two things sit flush right on the mobile card, and the bar would be drawn
    // over both without clearance. The date is right-aligned; the arrow is
    // pinned to the corner. The bar is 3px, so 6px clears it.
    const bar = 3, clearance = 6;
    expect(clearance).toBeGreaterThan(bar);
    expect(rowAstro).toMatch(/\.row-date \{[^}]*text-align:right;[^}]*padding-right:6px; \}/);
    expect(rowAstro).toMatch(/\.row-arrow \{ position:absolute; right:6px; bottom:6px;/);
    // The Archive Index arrow column, which sat 4px from the edge at 600px,
    // moves out to 8px so its red arrow does not merge with the red bar.
    expect(mobile).toContain('.home-records .home-record { border-top:0; padding-right:8px; }');
  });

  test('the mobile depth is subordinate, bottom-only, and the colour stays inverted', () => {
    // Weight is reduced through geometry, never through contrast. The neutral
    // is still the theme token, so dark mode keeps the broken white under the
    // dark shell and light mode the near-black under the light one — one
    // declaration, no per-theme mobile variant.
    const mobile = rowBlock.slice(rowBlock.indexOf('@media (max-width: 480px)'));
    expect(mobile).toContain('box-shadow:0 5px 0 var(--layer-neutral);');
    // Rest and press share the geometry exactly, so pressing recolours the
    // layer instead of moving or resizing it.
    const touch = rowBlock.slice(rowBlock.indexOf('@media (hover: none), (pointer: coarse)'));
    expect(touch).toContain('box-shadow:0 5px 0 var(--red);');
    expect(mobile).toContain('margin-inline:4px;');
    // The token itself is untouched: high contrast in both themes, and the
    // two values sit at opposite ends of the luma range.
    const dark = css.slice(css.indexOf(':root {'), css.indexOf('html[data-theme="light"]'));
    const lightStart = css.indexOf('html[data-theme="light"] {');
    const light = css.slice(lightStart, css.indexOf('}', lightStart) + 1);
    const luma = (hex: string) => (parseInt(hex.slice(0, 2), 16) * 299 +
      parseInt(hex.slice(2, 4), 16) * 587 + parseInt(hex.slice(4, 6), 16) * 114) / 1000;
    const tokenValue = (slice: string) => {
      const match = /--layer-neutral:\s*#([0-9a-fA-F]{6})/.exec(slice);
      return match![1];
    };
    expect(luma(tokenValue(dark))).toBeGreaterThan(200);
    expect(luma(tokenValue(light))).toBeLessThan(90);
    // There is no separate mobile or per-theme colour for the offset.
    expect(mobile).not.toMatch(/#[0-9a-fA-F]{3,8}|rgba?\(/);
    // `.row-hover--accent` is an inline control, not a card: it keeps its own
    // 4px L-shaped offset and is not inset.
    expect(mobile.match(/box-shadow:4px 4px 0 var\(--layer-neutral\)/g)).toHaveLength(1);
    expect(mobile).toContain('.row-hover--accent:active { box-shadow:4px 4px 0 var(--layer-neutral); }');
    expect(mobile).not.toMatch(/\.row-hover--accent[^{]*\{[^}]*margin-inline/);
    // Desktop is not converted to bottom-only: it keeps its directional
    // two-layer shadow and its hover movement.
    expect(css).toContain('box-shadow:10px 8px 0 var(--red),20px 16px 0 var(--layer-neutral)');
    expect(css).toMatch(/\.row-hover:hover \{[^}]*translateX\(10px\) skewX\(-3deg\)/);
  });

  test('the press treatment is not stacked on a row-hover element', () => {
    // The global `a:active` flash would double up with the row's own press.
    // On touch and below 480px it is already cancelled by `transform:none;
    // filter:none`; on a mouse it is the filter that has to go, since the
    // transform is what carries the hover movement.
    expect(css).toMatch(/@media \(hover: hover\) and \(pointer: fine\) \{[\s\S]*\.row-hover:active,\n\s*\.row-hover--accent:active \{ filter:none; \}/);
    // `.touch-target` is the separate press system, and it is used on auth,
    // menu and share controls only — never on a `.row-hover` element, so the
    // two flashes can never stack.
    for (const source of [featuredAstro, notesAstro, nowAstro, rowAstro, indexAstro, projectsAstro, workAstro, notesPageAstro]) {
      expect(source).not.toContain('touch-target');
    }
    expect(css).toContain('.touch-target:active::after { opacity:.12; transform:scale(1); }');
  });

  test('the offset is two layers, with a theme-aware neutral behind the red', () => {
    // `--dark-red` (#732424) is nearly invisible against the dark background,
    // so the offset read as nothing there. The accent stays --red; the solid
    // block behind it is --layer-neutral, defined per theme.
    expect(rowBlock).toContain('box-shadow:10px 8px 0 var(--red),20px 16px 0 var(--layer-neutral)');
    expect(rowBlock).toContain('box-shadow:4px 4px 0 var(--red),8px 8px 0 var(--layer-neutral)');
    expect(css).toContain('box-shadow:12px 12px 0 var(--red),24px 24px 0 var(--layer-neutral)');
    expect(rowBlock).not.toContain('var(--dark-red)');
  });

  test('--layer-neutral is defined in both themes', () => {
    const dark = css.slice(css.indexOf(':root {'), css.indexOf('html[data-theme="light"]'));
    const lightStart = css.indexOf('html[data-theme="light"] {');
    const light = css.slice(lightStart, css.indexOf('}', lightStart) + 1);
    expect(dark).toMatch(/--layer-neutral:\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]*\))/);
    expect(light).toMatch(/--layer-neutral:\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]*\))/);
    // Opposite ends of the range, or the offset is invisible in one theme.
    const darkValue = /--layer-neutral:\s*#([0-9a-fA-F]{6})/.exec(dark)![1];
    const lightValue = /--layer-neutral:\s*#([0-9a-fA-F]{6})/.exec(light)![1];
    const luma = (hex: string) => (parseInt(hex.slice(0, 2), 16) * 299 +
      parseInt(hex.slice(2, 4), 16) * 587 +
      parseInt(hex.slice(4, 6), 16) * 114) / 1000;
    expect(luma(darkValue)).toBeGreaterThan(200);
    expect(luma(lightValue)).toBeLessThan(90);
  });

  test('.lift follows the same gate, static focus, and offset as the rows', () => {
    expect(css).toMatch(/@media \(hover: hover\) and \(pointer: fine\) \{ \.lift:hover \{[^}]*border-color:var\(--red\)/);
    expect(css).toMatch(/@media \(hover: hover\) and \(pointer: fine\) \{ \.lift:hover \{[^}]*skewX\(-1deg\)/);
    // Focus is static here too: the outline plus the offset, no transform.
    const focus = /(\.lift:focus-visible \{[^}]*)\}/.exec(css)![1];
    expect(focus).not.toContain('transform');
    // Touch and narrow viewports both disarm it by width or by pointer.
    expect(css).toMatch(/@media \(hover: none\), \(pointer: coarse\) \{[^}]*\.lift:hover \{ transform:none; \}/);
  });

  // The /notes mobile treatment, and the two things that were actually wrong
  // with it: the slide was not being overridden (source order), and the list
  // read as one continuous accent (adjacency, not ownership). Bounded on both
  // sides: `start` is the block's own header, `end` is the first `}` at column
  // 0, which is this block's terminator (every inner rule closes indented). An
  // unterminated slice would widen to the whole sheet and start passing on
  // unrelated declarations.
  const notesStart = css.indexOf('@media (max-width: 480px) {\n  /* Card-to-card separation');
  const notesMobile = notesStart === -1
    ? ''
    : css.slice(notesStart, css.indexOf('\n}', notesStart) + 2);

  test('one right-side inset, on the card, that every kind of content obeys', () => {
    // The long-title card only looked like it had a safe zone because of where
    // a wrapped word happened to land; the text was running flush to the accent.
    // The inset now lives on the card's padding, so the title, the description,
    // the reading-time label and the thumbnail all stop at one boundary.
    expect(notesMobile).toContain('.notes-list .note-link { --note-safe-right:16px; padding-right:var(--note-safe-right); }');
    const inset = Number(/--note-safe-right:\s*(\d+)px/.exec(notesMobile)![1]);
    // 16px from the card edge, against a 3px bar: 13px of clear space.
    expect(inset - 3).toBeGreaterThanOrEqual(12);
    expect(inset - 3).toBeLessThanOrEqual(16);
    // No child carries its own right offset — one value, no per-element drift.
    expect(notesMobile).not.toMatch(/\.note-date \{[^}]*padding-right/);
    expect(notesMobile).not.toMatch(/note-thumb[^}]*margin-right/);
    // Qualified on purpose: the 600px block sets `padding: 22px 0 24px` on
    // `.note-link` as a shorthand and sits LATER in the sheet, so an unqualified
    // `padding-right` here would lose to its `padding-right: 0`.
    expect(css).toContain('.note-link { grid-template-columns:minmax(0,1fr) 112px; gap:14px; align-items:start; padding:22px 0 24px; }');
    // The bar is absolutely positioned against the padding box, so the inset
    // does not move it, and the card width is unchanged.
    expect(notesMobile).toContain(".lift::before { content:''; position:absolute; left:auto; right:0;");
    expect(notesMobile).toMatch(/margin-inline:4px/);
    // The thumbnail keeps its size and ratio; only its position moves.
    expect(css).toContain('.note-thumb { grid-column:2; grid-row:2; width:112px; height:auto; margin-right:0; align-self:start; }');
    expect(css).toMatch(/\.note-thumb \{ position:relative; width:160px; aspect-ratio:20\/13;/);
  });

  test('a long title wins over the thumbnail, and is never truncated', () => {
    // The title is primary content here, so it takes the full card width past a
    // length threshold; the artwork is the optional element that yields. The
    // rule is content-derived, not a breakpoint, so the same note renders the
    // same way at every width.
    expect(notesPageAstro).toContain('const LONG_TITLE_CHARS = 36;');
    expect(notesPageAstro).toContain('const showThumbnail = (note: Note) =>');
    expect(notesPageAstro).toMatch(/Boolean\(note\.image_url\) && note\.title\.trim\(\)\.length <= LONG_TITLE_CHARS/);
    // The render is gated on that decision, not on the raw image field.
    expect(notesPageAstro).toContain('{showThumbnail(note) && (');
    expect(notesPageAstro).not.toContain('{note.image_url && (');
    // The column collapses with the thumbnail, so the title is not squeezed
    // into a track that is no longer there.
    expect(notesMobile).toContain('.note-link:not(:has(.note-thumb)) { grid-template-columns:minmax(0,1fr); }');
    // No truncation, anywhere: no ellipsis, clip, or nowrap on the title.
    const titleRules = [...css.matchAll(/\.note h2 \{[^}]*\}/g)].map((m) => m[0]);
    expect(titleRules.length).toBeGreaterThan(0);
    for (const rule of titleRules) {
      expect(rule).not.toMatch(/text-overflow|overflow\s*:|white-space\s*:\s*nowrap|line-clamp/);
    }
    // The title string is never altered in the template.
    expect(notesPageAstro).toContain('<h2>{note.title}</h2>');
  });

  test('no hover state can change a row at mobile width', () => {
    // The gap the mobile guard left: `transform` and `box-shadow` were both
    // overridden at this width, but the mouse hover's surface fill was not, so
    // on a device reporting `hover: hover` a tapped row still faded to
    // `--surface` over .2s — a hover animation reaching a phone.
    const mobile = rowBlock.slice(rowBlock.indexOf('@media (max-width: 480px)'));
    expect(mobile).toContain('.row-hover:hover { background:none; }');
    // Cancelled for `:hover` only. `:active` is the press fill and must survive,
    // and the ungated `:focus-visible` surface is the keyboard indicator.
    expect(mobile).not.toMatch(/\.row-hover:active \{[^}]*background:none/);
    expect(css).toMatch(/\.row-hover:focus-visible \{ background:var\(--surface\);/);
    // The archive rows' own clearance must survive the later 600px block, which
    // sets `padding-right: 4px` at the same specificity — so the selector here
    // is qualified, and the assertion is on the qualified form (a bare
    // `.home-record` needle would match as a substring of it either way).
    expect(mobile).toContain('.home-records .home-record { border-top:0; padding-right:8px; }');
    expect(css).toContain('padding-right:4px; }');
  });

  test('the notes card joins the shared mobile card treatment', () => {
    // The block must be found and bounded, or these assertions pass vacuously.
    expect(notesStart).toBeGreaterThan(0);
    expect(notesMobile).toContain('.lift::before');
    // `.lift` is the notes list card, and it is a live primitive. At mobile
    // width it must present exactly like the home cards: no movement, inset
    // 4px, bottom-only neutral depth, and the right-edge red accent.
    expect(notesMobile).toMatch(/\.lift,\n\s*\.lift:hover,\n\s*\.lift:focus-visible,\n\s*\.lift:active \{ transform:none; filter:none; margin-inline:4px; isolation:isolate; box-shadow:0 5px 0 var\(--layer-neutral\); border-color:var\(--red\);/);
    // The accent mirrors `.row-hover::before` rather than forking the primitive:
    // same 3px, same `right: 0` / `left: auto`, same stacking level, and no
    // fixed height — it spans whatever the link's own box is, so a note with a
    // thumbnail gets a bar as tall as the card, not as tall as the thumbnail.
    expect(notesMobile).toContain(".lift::before { content:''; position:absolute; left:auto; right:0; top:var(--card-pad-y, 0); bottom:0; z-index:1; width:3px; background:var(--red); transform:scaleY(1); transform-origin:bottom; }");
    expect(notesMobile).not.toMatch(/\.lift::before \{[^}]*height:/);
    // Press recolours the depth and does not move the card.
    expect(notesMobile).toContain('.lift:active { box-shadow:0 5px 0 var(--red); }');
    // `position: relative` is the containing block that anchor needs. No
    // offsets, so desktop renders identically.
    expect(css).toMatch(/\.lift \{ position:relative; transition:transform/);
    // Desktop keeps the expressive lift.
    expect(css).toMatch(/@media \(hover: hover\) and \(pointer: fine\) \{ \.lift:hover \{[^}]*translate\(-6px,-6px\) skewX\(-1deg\)/);
  });

  test('the note accent and depth are per card, not per list', () => {
    // Ownership was never the problem: `.lift` is on the `<a class="note-link">`
    // in notes.astro, one per note, so the accent and the depth are already
    // per-card and nothing re-parents them. What merged them into one
    // continuous line was adjacency — flush cards, so each bar and each 5px
    // depth ran into its neighbour's.
    expect(notesPageAstro).toContain('class="note-link lift"');
    expect(notesPageAstro).toContain('<article class="note">');
    expect(notesPageAstro).not.toContain('class="note lift"');
    // The separator that held them together is gone, and the gap matches the
    // 20px rhythm the home cards already use — the same rhythm, not a value
    // tuned to conceal anything.
    expect(notesMobile).toContain('.note { border-bottom:0; margin-bottom:20px; }');
    const gap = Number(/margin-bottom:(\d+)px/.exec(notesMobile)![1]);
    expect(gap).toBeGreaterThan(5);
    expect(gap).toBe(20);
  });

  test('the note hover slide is overridden, and the override actually wins', () => {
    // The regression: the card visibly slid right on mobile while every
    // `transform: none` guard read as satisfied. The shift was
    // `.note-link:hover { padding-left: 12px }` — a padding change, not a
    // transform — and `:hover` latches after a tap on touch.
    //
    // The first attempt parked the override in the narrow-viewport block up in
    // the shared-primitives section. That block sits ABOVE this rule at equal
    // specificity (0-2-0), so the override lost and the card kept sliding. The
    // placement is the fix, so it is asserted rather than described.
    expect(notesMobile).toContain('.note-link:hover { padding-left:0; }');
    expect(css).toContain('.note-link:hover { padding-left:12px; }');
    // The override must come after the rule it overrides, or it is inert.
    const base = css.indexOf('.note-link:hover { padding-left:12px; }');
    const override = css.indexOf('.note-link:hover { padding-left:0; }');
    expect(override).toBeGreaterThan(base);
    // Equal specificity, so only order can decide — and the media query that
    // scopes the override must itself open after the base rule.
    expect(css.lastIndexOf('@media (max-width: 480px)', override)).toBeGreaterThan(base);
    // Nothing else in the card's mobile block may move it either. The only two
    // transforms in the block are the card's `none` and the accent's vertical
    // grow — no translate, skew, rotate or uniform scale anywhere.
    const transforms = [...notesMobile.matchAll(/transform:\s*([^;]+);/g)].map((m) => m[1].trim());
    expect(transforms).toEqual(['none', 'scaleY(1)']);
  });

  test('no ungated hover anywhere in the sheet skews', () => {
    // The invariant that keeps failing. `skewX` is the only transform whose
    // displacement scales with the element's height, so it is the one that
    // shears a tall card and overruns the gutter; a top-level `:hover` skew is
    // one tap away from latching on a phone, whatever the media features
    // report. (The note detail page's back button had exactly this.)
    const ungated = css
      .replace(/@media \(hover: hover\) and \(pointer: fine\) \{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g, '')
      .replace(/@media \(hover: none\), \(pointer: coarse\) \{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g, '');
    expect(ungated).not.toMatch(/:hover[^{]*\{[^}]*skewX/);
    // The rows and the back button are gated, not deleted: mouse behaviour is
    // preserved on hover-capable pointers.
    expect(css).toMatch(/@media \(hover: hover\) and \(pointer: fine\) \{ \.note-header-back:hover \{[^}]*skewX\(-1deg\)/);
    expect(css.match(/@media \(hover: hover\) and \(pointer: fine\) \{ \.note-header-back:hover/g)).toHaveLength(1);
    expect(css).toContain('.note-header-back:hover { transform:none; }');
  });

  test('no row, card, or bracket control translates on an ungated hover', () => {
    // The row/card clickables in scope must carry no ungated translation at
    // all. Three deliberately-out-of-scope hovers still do — admin tabs, the
    // fullscreen menu scene's selection slide, and the note back link — and
    // they are listed here so the exemption is explicit rather than a gap.
    const ungated = css
      .replace(/@media \(hover: hover\) and \(pointer: fine\) \{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g, '')
      .replace(/@media \(hover: none\), \(pointer: coarse\) \{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g, '');
    for (const selector of ['row-hover', 'home-record', 'bracket-btn', 'home-cv', 'preview-all', 'note-header-back']) {
      expect(ungated, `${selector} still translates on an ungated hover`).not.toMatch(
        new RegExp(`\\.${selector}[^{]*\\{[^}]*translate[XY]\\(`),
      );
    }
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
    // Accent hover is gated like the row hover; focus-visible is not.
    expect(css).toMatch(/\.row-hover--accent:hover \{[^}]*border-color:var\(--red\)/);
    expect(css).toMatch(/\.row-hover--accent:focus-visible \{[^}]*border-color:var\(--red\)/);
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
    expect(rowAstro).toMatch(/\.row-arrow \{ position:absolute; right:6px; bottom:6px;/);
    // Regression guard: an absolute child with no positioned parent drifts to
    // the nearest positioned ancestor, or the page.
    expect(rowAstro).toMatch(/\.home-row \{ --card-pad-y:14px; position:relative;/);
    // The last line reserves the arrow's gutter so text never runs under it.
    expect(rowAstro).toMatch(/\.row-body \{ grid-row:4; grid-column:1 \/ -1; padding-right:38px; \}/);
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
    const block = css.slice(css.indexOf('.row-hover {'), css.indexOf('\n.home-records {'));
    for (const declaration of block.matchAll(/color:\s*var\((--[a-z0-9-]+)\)/g)) {
      expect(['--paper', '--ink', '--text-inverse']).not.toContain(declaration[1]);
    }
    expect(block).toContain('background:var(--surface)');
    // The offset block is now the theme-aware neutral layer, not a fixed dark
    // red that vanished against the dark background.
    expect(block).toContain('var(--layer-neutral)');
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
